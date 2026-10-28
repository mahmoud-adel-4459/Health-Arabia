import { createApp } from "./app";
import { env } from "./config/env";
import { prisma } from "./lib/prisma";
import { bootstrapPlatformAdmin } from "./lib/bootstrap-admin";

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
