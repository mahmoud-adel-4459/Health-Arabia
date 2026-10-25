import { createApp } from "./app";
import { env } from "./config/env";
import { prisma } from "./lib/prisma";

const server = createApp().listen(env.port, () => {
  console.log(`API listening on http://localhost:${env.port}/api`);
});

function shutdown() {
  server.close(() => {
    void prisma.$disconnect().finally(() => process.exit(0));
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
