import "dotenv/config";
import fs from "fs";
import path from "path";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable ${name}`);
  }
  return value;
}

function trustProxy(): boolean | number | string {
  const value = process.env.TRUST_PROXY?.trim();
  if (!value || value === "false") return false;
  if (value === "true") return true;
  return /^\d+$/.test(value) ? Number(value) : value;
}

const port = Number(process.env.PORT ?? 4000);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("PORT must be a valid port number");
}

// Walks up from a directory looking for a Git checkout root
function findGitRoot(start: string): string | null {
  let dir = path.resolve(start);
  for (;;) {
    if (fs.existsSync(path.join(dir, ".git"))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

const isInside = (child: string, parent: string) => {
  const rel = path.relative(parent, child);
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
};

// Development keeps the existing default (./private-storage under the API working directory).
// Production must name a persistent, absolute location outside the Git checkout and the app directory,
// so uploaded private files can never be committed, deployed over, or lost with a container.
function privateStoragePath(): string {
  const configured = process.env.PRIVATE_STORAGE_PATH?.trim();
  if (process.env.NODE_ENV !== "production") {
    return configured || path.resolve(process.cwd(), "private-storage");
  }
  if (!configured) {
    throw new Error("PRIVATE_STORAGE_PATH is required in production (a persistent absolute path outside the Git checkout)");
  }
  if (!path.isAbsolute(configured)) {
    throw new Error("PRIVATE_STORAGE_PATH must be an absolute path in production");
  }
  const resolved = path.resolve(configured);
  const gitRoot = findGitRoot(process.cwd());
  if (isInside(resolved, process.cwd()) || (gitRoot && isInside(resolved, gitRoot))) {
    throw new Error("PRIVATE_STORAGE_PATH must be outside the Git checkout and the API directory in production");
  }
  return resolved;
}

const corsOrigins = (process.env.CORS_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
// The browser origin allow-list also drives CSRF protection, so production cannot run without it
if (process.env.NODE_ENV === "production" && corsOrigins.length === 0) {
  throw new Error("CORS_ORIGINS is required in production (comma-separated website and dashboard origins)");
}

export const env = {
  privateStoragePath: privateStoragePath(),
  isProduction: process.env.NODE_ENV === "production",
  trustProxy: trustProxy(),
  port,
  databaseUrl: required("DATABASE_URL"),
  corsOrigins,
};
