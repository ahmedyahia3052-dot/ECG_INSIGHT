import { createServer } from "node:http";
import { createApp } from "./app";
import { env } from "./config/env";
import { prisma } from "./config/prisma";
import { initializeRealtime } from "./realtime/realtime.service";
import { runStartupChecks } from "./startup/checks";
import { captureException, log } from "./utils/logger";

const app = createApp();
const httpServer = createServer(app);
initializeRealtime(httpServer);

let server: ReturnType<typeof httpServer.listen> | undefined;

async function start() {
  await runStartupChecks();
  server = httpServer.listen(env.PORT, () => {
    log("info", "ECG Insight API listening.", {
      environment: env.NODE_ENV,
      port: env.PORT,
    });
  });
}

async function shutdown(signal: string) {
  log("info", "Shutdown signal received.", { signal });
  if (!server) {
    await prisma.$disconnect();
    process.exit(0);
  }
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("uncaughtException", (error) => {
  captureException(error, { source: "uncaughtException" });
  void shutdown("uncaughtException");
});
process.on("unhandledRejection", (reason) => {
  captureException(reason, { source: "unhandledRejection" });
});

void start().catch((error) => {
  captureException(error, { source: "startup" });
  process.exit(1);
});
