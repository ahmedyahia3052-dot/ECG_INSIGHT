import { createServer } from "node:http";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { createApp } from "../server/src/app";

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env["DATABASE_URL"] ?? "postgresql://postgres:postgres@localhost:5432/ecg_insight",
  }),
});

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function ensureAdmin() {
  const passwordHash = await bcrypt.hash("password", 12);
  return prisma.user.upsert({
    create: {
      avatarInitials: "AU",
      email: "sprint10-admin@ecginsight.com",
      emailVerified: true,
      isActive: true,
      name: "Sprint10 Admin",
      passwordHash,
      role: "ADMIN",
      subscription: { create: { status: "ACTIVE", tier: "ENTERPRISE" } },
    },
    update: { isActive: true, passwordHash, role: "ADMIN" },
    where: { email: "sprint10-admin@ecginsight.com" },
  });
}

async function main() {
  await ensureAdmin();
  const server = createServer(createApp());
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  assert(address && typeof address === "object", "Server did not expose a port.");
  const baseUrl = `http://127.0.0.1:${address.port}/api`;

  const login = await fetch(`${baseUrl}/auth/login`, {
    body: JSON.stringify({ email: "sprint10-admin@ecginsight.com", password: "password" }),
    headers: { "content-type": "application/json" },
    method: "POST",
  });
  const loginBody = await login.json() as { accessToken?: string };
  assert(login.status === 200 && loginBody.accessToken, "admin login required");
  const token = loginBody.accessToken!;

  const dashboard = await fetch(`${baseUrl}/enterprise/clinical-dashboard`, {
    headers: { authorization: `Bearer ${token}` },
  });
  const dashboardBody = await dashboard.json() as { dashboard?: { pendingReviews?: number; todaysEcgs?: number; modelOnline?: boolean } };
  assert(dashboard.status === 200, "clinical dashboard endpoint must respond");
  assert(typeof dashboardBody.dashboard?.pendingReviews === "number", "dashboard must include pending reviews");
  assert(typeof dashboardBody.dashboard?.todaysEcgs === "number", "dashboard must include today's ecgs");
  assert(typeof dashboardBody.dashboard?.modelOnline === "boolean", "dashboard must include model status");

  const audit = await fetch(`${baseUrl}/audit`, {
    headers: { authorization: `Bearer ${token}` },
  });
  assert(audit.status === 200, "admin audit endpoint must respond");
  const auditBody = await audit.json() as { logs?: unknown[] };
  assert(Array.isArray(auditBody.logs), "audit logs must be returned");

  server.close();
  console.log("sprint10-enterprise-clinical.integration.ts: all tests passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
