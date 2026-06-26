import { createServer } from "node:http";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { createApp } from "../server/src/app";
import { ensureDefaultPlans, recordAnalysisUsage } from "../server/src/subscriptions/monetization.service";

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env["DATABASE_URL"] ?? "postgresql://postgres:postgres@localhost:5432/ecg_insight",
  }),
});

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function expectStatus(response: { body: unknown; status: number }, expected: number, label: string) {
  assert(response.status === expected, `${label}: expected ${expected} but got ${response.status}: ${JSON.stringify(response.body).slice(0, 500)}`);
}

async function createUser(input: { email: string; name: string; owner?: boolean }) {
  return prisma.user.create({
    data: {
      avatarInitials: input.owner ? "OW" : "BL",
      email: input.email,
      emailVerified: true,
      isActive: true,
      name: input.name,
      passwordHash: await bcrypt.hash("password", 12),
      protectedOwner: Boolean(input.owner),
      role: input.owner ? "OWNER" : "DOCTOR",
      subscription: { create: { status: "ACTIVE", tier: "FREE" } },
    },
  });
}

async function main() {
  await ensureDefaultPlans();
  const stamp = Date.now();
  const owner = await createUser({ email: `owner28-${stamp}@ecginsight.test`, name: "Sprint 28 Owner", owner: true });
  const user = await createUser({ email: `billing28-${stamp}@ecginsight.test`, name: "Sprint 28 Billing User" });

  const server = createServer(createApp());
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  assert(address && typeof address === "object", "Server did not expose a port.");
  const baseUrl = `http://127.0.0.1:${address.port}/api/v1`;

  async function request(route: string, options: { body?: unknown; method?: string; token?: string } = {}) {
    const headers = new Headers();
    if (options.token) headers.set("authorization", `Bearer ${options.token}`);
    let body: BodyInit | undefined;
    if (options.body !== undefined) {
      headers.set("content-type", "application/json");
      body = JSON.stringify(options.body);
    }
    const response = await fetch(`${baseUrl}${route}`, { body, headers, method: options.method ?? "GET" });
    const text = await response.text();
    let parsed: unknown = null;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      parsed = text;
    }
    return { body: parsed, status: response.status };
  }

  const ownerLogin = await request("/auth/login", { body: { email: owner.email, password: "password", rememberMe: true }, method: "POST" });
  expectStatus(ownerLogin, 200, "owner login");
  const ownerToken = (ownerLogin.body as { accessToken?: string }).accessToken;
  assert(ownerToken, "Owner login must return access token.");

  let response = await request("/subscriptions/plans", { token: ownerToken });
  expectStatus(response, 200, "list plans");
  const plans = (response.body as { plans: Array<{ code: string; maxUsers: number | null; storageQuotaMb: number | null }> }).plans;
  for (const code of ["free", "clinic", "hospital", "enterprise"]) {
    assert(plans.some((plan) => plan.code === code), `${code} must be a public Sprint 28 plan.`);
  }
  assert(plans.some((plan) => plan.code === "clinic" && plan.maxUsers === 10), "Clinic plan limits must be exposed.");

  response = await request(`/subscriptions/admin/users/${user.id}/activate`, {
    body: { plan: "hospital" },
    method: "POST",
    token: ownerToken,
  });
  expectStatus(response, 201, "manual activate hospital");
  const subscription = (response.body as { subscription: { id: string } }).subscription;

  await recordAnalysisUsage(user.id, { source: "sprint28-test" });

  response = await request(`/subscriptions/admin/users/${user.id}/invoices`, { method: "POST", token: ownerToken });
  expectStatus(response, 201, "manual invoice creation");
  const invoice = (response.body as { invoice: { amountCents: number; invoiceNumber: string; status: string } }).invoice;
  assert(invoice.amountCents > 0 && invoice.invoiceNumber.startsWith("INV-"), "Invoice contract must include amount and number.");

  const userLogin = await request("/auth/login", { body: { email: user.email, password: "password", rememberMe: true }, method: "POST" });
  expectStatus(userLogin, 200, "user login");
  const userToken = (userLogin.body as { accessToken?: string }).accessToken;
  assert(userToken, "User login must return access token.");

  response = await request("/subscriptions/me", { token: userToken });
  expectStatus(response, 200, "subscription dashboard");
  const dashboard = response.body as { invoices?: unknown[]; quota?: { limits?: { maxOrganizations?: number | null; maxUsers?: number | null }; used?: number }; usageTracking?: unknown[] };
  assert(dashboard.quota?.limits?.maxUsers === 75, "Hospital user limit must be visible on dashboard.");
  assert((dashboard.invoices ?? []).length > 0, "Dashboard must include invoices.");
  assert((dashboard.usageTracking ?? []).length > 0, "Dashboard must include usage tracking.");

  response = await request("/subscriptions/billing-history", { token: userToken });
  expectStatus(response, 200, "billing history");
  assert(((response.body as { invoices?: unknown[] }).invoices ?? []).length > 0, "Billing history must include invoices.");

  response = await request(`/subscriptions/admin/users/${user.id}/suspend`, {
    body: { reason: "Sprint 28 suspension test" },
    method: "POST",
    token: ownerToken,
  });
  expectStatus(response, 200, "manual suspend");
  assert((await prisma.subscription.findUnique({ where: { userId: user.id } }))?.status === "SUSPENDED", "Legacy subscription must be suspended.");

  response = await request(`/subscriptions/admin/users/${user.id}/extend`, {
    body: { months: 2 },
    method: "POST",
    token: ownerToken,
  });
  expectStatus(response, 200, "manual extension");
  assert((response.body as { subscription: { status: string } }).subscription.status === "ACTIVE", "Extension should reactivate subscription.");

  response = await request(`/subscriptions/admin/users/${user.id}/impersonate`, { method: "POST", token: ownerToken });
  expectStatus(response, 201, "impersonation");
  assert(Boolean((response.body as { accessToken?: string }).accessToken), "Impersonation must return access token.");
  assert((await prisma.auditLog.count({ where: { action: "IMPERSONATION_STARTED", actorId: owner.id, entityId: user.id } })) > 0, "Impersonation must be audited.");

  server.close();

  await prisma.billingEvent.deleteMany({ where: { userId: { in: [owner.id, user.id] } } });
  await prisma.payment.deleteMany({ where: { userId: { in: [owner.id, user.id] } } });
  await prisma.invoice.deleteMany({ where: { userId: { in: [owner.id, user.id] } } });
  await prisma.usageTracking.deleteMany({ where: { userId: { in: [owner.id, user.id] } } });
  await prisma.usageRecord.deleteMany({ where: { userId: { in: [owner.id, user.id] } } });
  await prisma.license.deleteMany({ where: { userId: { in: [owner.id, user.id] } } });
  await prisma.userSubscription.deleteMany({ where: { OR: [{ id: subscription.id }, { userId: { in: [owner.id, user.id] } }] } });
  await prisma.notification.deleteMany({ where: { userId: { in: [owner.id, user.id] } } });
  await prisma.auditLog.deleteMany({ where: { OR: [{ actorId: { in: [owner.id, user.id] } }, { entityId: { in: [owner.id, user.id] } }] } });
  await prisma.session.deleteMany({ where: { userId: { in: [owner.id, user.id] } } });
  await prisma.subscription.deleteMany({ where: { userId: { in: [owner.id, user.id] } } });
  await prisma.user.deleteMany({ where: { id: { in: [owner.id, user.id] } } });

  console.log("Sprint 28 subscription platform integration test passed.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
