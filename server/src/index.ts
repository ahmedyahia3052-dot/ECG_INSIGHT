import { createServer } from "node:http";
import { createApp } from "./app";
import { env } from "./config/env";
import { prisma } from "./config/prisma";
import { initializeRealtime } from "./realtime/realtime.service";

const app = createApp();
const httpServer = createServer(app);
initializeRealtime(httpServer);

const server = httpServer.listen(env.PORT, () => {
  console.log(`ECG Insight API listening on http://localhost:${env.PORT}`);
});

async function shutdown(signal: string) {
  console.log(`Received ${signal}. Shutting down gracefully.`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
