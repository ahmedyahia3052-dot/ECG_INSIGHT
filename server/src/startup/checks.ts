import { env } from "../config/env";
import { prisma } from "../config/prisma";
import { log } from "../utils/logger";

export async function runStartupChecks() {
  log("info", "Running ECG Insight startup checks.", {
    environment: env.NODE_ENV,
    port: env.PORT,
  });

  await prisma.$queryRaw`SELECT 1`;

  log("info", "Startup checks completed.", {
    checks: ["environment", "database"],
  });
}
