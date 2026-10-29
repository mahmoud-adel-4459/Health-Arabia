import fs from "fs";
import { createApp } from "./app";
import { env } from "./config/env";
import { prisma } from "./lib/prisma";
import { bootstrapPlatformAdmin } from "./lib/bootstrap-admin";

if (env.isProduction) {
  fs.mkdirSync(env.privateStoragePath, { recursive: true });
  fs.accessSync(env.privateStoragePath, fs.constants.W_OK);
  if (env.trustProxy === false) console.warn("[CONFIG] TRUST_PROXY is not set: rate limiting sees every client behind a proxy as one address.");
}

const server = createApp().listen(env.port, () => {
  console.log(`API listening on http://localhost:${env.port}/api`);
  void bootstrapPlatformAdmin().catch((err) => {
    console.error("[BOOTSTRAP] Admin bootstrap failed:", err);
  });
});

function shutdown() {
  server.close(() => {
    void prisma.$disconnect().finally(() => process.exit(0));
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
