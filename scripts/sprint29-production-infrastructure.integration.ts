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

async function main() {
  const stamp = Date.now();
  const admin = await prisma.user.create({
    data: {
      avatarInitials: "P29",
      email: `sprint29-admin-${stamp}@ecginsight.test`,
      emailVerified: true,
      isActive: true,
      name: "Sprint 29 Admin",
      passwordHash: await bcrypt.hash("password", 12),
      role: "ADMIN",
      subscription: { create: { status: "ACTIVE", tier: "ENTERPRISE" } },
    },
  });

  const server = createServer(createApp());
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  assert(address && typeof address === "object", "Server did not expose a port.");
  const baseUrl = `http://127.0.0.1:${address.port}/api`;

  async function request(route: string, options: { body?: unknown; method?: string; token?: string } = {}) {
    const headers = new Headers({ "x-request-id": `sprint29-${Date.now()}` });
    if (options.token) headers.set("authorization", `Bearer ${options.token}`);
    let body: BodyInit | undefined;
    if (options.body !== undefined) {
      headers.set("content-type", "application/json");
      body = JSON.stringify(options.body);
    }
    const response = await fetch(`${baseUrl}${route}`, { body, headers, method: options.method ?? "GET" });
    const text = await response.text();
    return {
      body: text ? JSON.parse(text) as Record<string, unknown> : {},
      requestId: response.headers.get("x-request-id"),
      status: response.status,
    };
  }

  for (const route of ["/health", "/health/db", "/health/ai", "/health/storage", "/health/queue"]) {
    const response = await request(route);
    assert(response.status === 200, `${route} should be healthy.`);
    assert(response.requestId, `${route} should return x-request-id.`);
    assert(response.body["ok"] === true, `${route} should return ok=true.`);
  }

  let response = await request("/health/readiness-dashboard");
  assert(response.status === 401, "Readiness dashboard should require authentication.");

  response = await request("/auth/login", {
    body: { email: `  ${admin.email}  `, password: "password", rememberMe: true, "__proto__": { polluted: true } },
    method: "POST",
  });
  assert(response.status === 200, "Admin login should succeed with sanitized input.");
  const token = response.body["accessToken"];
  assert(typeof token === "string", "Login should return access token.");

  response = await request("/health/readiness-dashboard", { token });
  assert(response.status === 200, "Admin readiness dashboard should load.");
  const readiness = response.body["readiness"] as Record<string, unknown>;
  assert(readiness["activeUsers"] !== undefined, "Readiness dashboard should include active users.");
  assert(typeof readiness["components"] === "object", "Readiness dashboard should include component checks.");

  server.close();
  await prisma.auditLog.deleteMany({ where: { actorId: admin.id } });
  await prisma.session.deleteMany({ where: { userId: admin.id } });
  await prisma.subscription.deleteMany({ where: { userId: admin.id } });
  await prisma.user.delete({ where: { id: admin.id } });
  console.log("Sprint 29 production infrastructure integration test passed.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
