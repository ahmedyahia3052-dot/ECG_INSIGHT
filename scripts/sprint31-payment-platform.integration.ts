import { createHmac } from "node:crypto";
import { createServer } from "node:http";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { createApp } from "../server/src/app";
import { ensureDefaultPlans } from "../server/src/subscriptions/monetization.service";

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

function sign(payload: unknown) {
  return createHmac("sha256", process.env["PAYMENT_WEBHOOK_SECRET"] ?? "dev-payment-webhook-secret").update(JSON.stringify(payload ?? {})).digest("hex");
}

async function createUser(input: { email: string; name: string; owner?: boolean }) {
  return prisma.user.create({
    data: {
      avatarInitials: input.owner ? "F1" : "PY",
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
  const owner = await createUser({ email: `owner31-${stamp}@ecginsight.test`, name: "Sprint 31 Owner", owner: true });
  const user = await createUser({ email: `payer31-${stamp}@ecginsight.test`, name: "Sprint 31 Payer" });

  const server = createServer(createApp());
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  assert(address && typeof address === "object", "Server did not expose a port.");
  const baseUrl = `http://127.0.0.1:${address.port}/api/v1`;

  async function request(route: string, options: { body?: unknown; headers?: Record<string, string>; method?: string; token?: string } = {}) {
    const headers = new Headers(options.headers);
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

  const userLogin = await request("/auth/login", { body: { email: user.email, password: "password", rememberMe: true }, method: "POST" });
  expectStatus(userLogin, 200, "user login");
  const userToken = (userLogin.body as { accessToken?: string }).accessToken;
  assert(userToken, "User login must return access token.");

  let response = await request("/subscriptions/payment-methods", {
    body: { isDefault: true, label: "Sprint 31 Paymob", provider: "PAYMOB", type: "card" },
    method: "POST",
    token: userToken,
  });
  expectStatus(response, 201, "create payment method");

  response = await request("/subscriptions/checkout", {
    body: { idempotencyKey: `sprint31-${stamp}`, plan: "hospital", provider: "PAYMOB" },
    method: "POST",
    token: userToken,
  });
  expectStatus(response, 201, "create checkout");
  const checkout = response.body as { invoice: { id: string }; payment: { id: string; transactionId?: string }; transaction: { id: string } };
  assert(checkout.payment.id && checkout.invoice.id && checkout.transaction.id, "Checkout should create invoice, payment, and transaction.");

  response = await request("/subscriptions/checkout", {
    body: { idempotencyKey: `sprint31-${stamp}`, plan: "hospital", provider: "PAYMOB" },
    method: "POST",
    token: userToken,
  });
  expectStatus(response, 201, "idempotent checkout replay");
  assert((response.body as { payment: { id: string } }).payment.id === checkout.payment.id, "Idempotent checkout should replay the same payment.");

  const webhookPayload = { paymentId: checkout.payment.id, status: "PAID", success: true, transactionId: checkout.payment.transactionId };
  response = await request("/subscriptions/payments/webhooks/PAYMOB", {
    body: webhookPayload,
    headers: { "x-payment-signature": sign(webhookPayload) },
    method: "POST",
    token: userToken,
  });
  expectStatus(response, 200, "signed Paymob webhook");
  assert((response.body as { payment: { status: string } }).payment.status === "PAID", "Webhook should mark payment paid.");

  response = await request("/subscriptions/financial/dashboard", { token: ownerToken });
  expectStatus(response, 200, "financial dashboard");
  const dashboard = (response.body as { dashboard: { activeSubscriptions: number; monthlyRecurringRevenueCents: number; revenueCents: number } }).dashboard;
  assert(dashboard.revenueCents > 0 && dashboard.monthlyRecurringRevenueCents > 0, "Financial dashboard should include revenue and MRR.");

  response = await request("/subscriptions/financial/admin-center", { token: ownerToken });
  expectStatus(response, 200, "financial admin center");
  const center = response.body as { auditLogs: unknown[]; invoices: unknown[]; transactions: unknown[] };
  assert(center.transactions.length > 0 && center.invoices.length > 0 && center.auditLogs.length > 0, "Admin center should include finance records.");

  response = await request("/subscriptions/refunds", {
    body: { paymentId: checkout.payment.id, reason: "Sprint 31 refund workflow" },
    method: "POST",
    token: userToken,
  });
  expectStatus(response, 201, "request refund");
  const refund = (response.body as { refund: { id: string; status: string } }).refund;
  assert(refund.status === "REQUESTED", "Refund should start in requested state.");

  response = await request(`/subscriptions/refunds/${refund.id}/review`, {
    body: { decision: "approve", reason: "Sprint 31 approved refund" },
    method: "POST",
    token: ownerToken,
  });
  expectStatus(response, 200, "approve refund");
  assert((response.body as { refund: { status: string } }).refund.status === "REFUNDED", "Refund should be processed.");

  response = await request("/subscriptions/billing-history", { token: userToken });
  expectStatus(response, 200, "billing history");
  assert(((response.body as { billingEvents?: unknown[]; invoices?: unknown[]; payments?: unknown[] }).billingEvents ?? []).length > 0, "Billing history should include financial events.");

  server.close();

  await prisma.financialAuditLog.deleteMany({ where: { OR: [{ actorId: { in: [owner.id, user.id] } }, { userId: { in: [owner.id, user.id] } }] } });
  await prisma.refund.deleteMany({ where: { userId: { in: [owner.id, user.id] } } });
  await prisma.paymentTransaction.deleteMany({ where: { userId: { in: [owner.id, user.id] } } });
  await prisma.paymentMethod.deleteMany({ where: { userId: { in: [owner.id, user.id] } } });
  await prisma.paymentIdempotencyKey.deleteMany({ where: { userId: { in: [owner.id, user.id] } } });
  await prisma.billingEvent.deleteMany({ where: { userId: { in: [owner.id, user.id] } } });
  await prisma.payment.deleteMany({ where: { userId: { in: [owner.id, user.id] } } });
  await prisma.invoice.deleteMany({ where: { userId: { in: [owner.id, user.id] } } });
  await prisma.userSubscription.deleteMany({ where: { userId: { in: [owner.id, user.id] } } });
  await prisma.notification.deleteMany({ where: { userId: { in: [owner.id, user.id] } } });
  await prisma.auditLog.deleteMany({ where: { OR: [{ actorId: { in: [owner.id, user.id] } }, { entityId: { in: [owner.id, user.id] } }] } });
  await prisma.session.deleteMany({ where: { userId: { in: [owner.id, user.id] } } });
  await prisma.subscription.deleteMany({ where: { userId: { in: [owner.id, user.id] } } });
  await prisma.user.deleteMany({ where: { id: { in: [owner.id, user.id] } } });

  console.log("Sprint 31 payment platform integration test passed.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
