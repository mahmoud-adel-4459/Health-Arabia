// Points this clone at the versioned hooks in .githooks. Runs from `pnpm install` (prepare) and is a
// no-op outside a Git checkout (CI images, production installs) or when hooksPath is already set.
import { existsSync } from "node:fs";
import { execFileSync } from "node:child_process";

if (existsSync(".git")) {
  try {
    const current = execFileSync("git", ["config", "--local", "--get", "core.hooksPath"], { encoding: "utf8" }).trim();
    if (current) process.exit(0);
  } catch {
    // not set yet
  }
  execFileSync("git", ["config", "--local", "core.hooksPath", ".githooks"]);
  console.log("Git hooks enabled (.githooks).");
}
