import { createServer } from "node:http";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { createApp } from "../server/src/app";
import { ensureDefaultPlans, quotaSnapshot, recordAnalysisUsage } from "../server/src/subscriptions/monetization.service";

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env["DATABASE_URL"] ?? "postgresql://postgres:postgres@localhost:5432/ecg_insight",
  }),
});

type Session = { token: string; user: { id: string } };

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function ensureUser(email: string, role: "DOCTOR" | "SUPER_ADMIN") {
  const passwordHash = await bcrypt.hash("password", 12);
  return prisma.user.upsert({
    create: {
      avatarInitials: role === "SUPER_ADMIN" ? "SA" : "DR",
      email,
      emailVerified: true,
      isActive: true,
      name: role === "SUPER_ADMIN" ? "Sprint 20 Super Admin" : "Sprint 20 Doctor",
      passwordHash,
      role,
      subscription: { create: { status: "ACTIVE", tier: role === "SUPER_ADMIN" ? "ENTERPRISE" : "FREE" } },
    },
    update: { isActive: true, passwordHash, role },
    where: { email },
  });
}

async function cleanupUsers(userIds: string[]) {
  if (!userIds.length) return;
  await prisma.giftLicense.deleteMany({ where: { OR: [{ userId: { in: userIds } }, { giftedById: { in: userIds } }] } });
  await prisma.paymentTransaction.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.billingEvent.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.usageRecord.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.license.deleteMany({ where: { OR: [{ userId: { in: userIds } }, { grantedById: { in: userIds } }, { revokedById: { in: userIds } }] } });
  await prisma.userSubscription.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.session.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.auditLog.deleteMany({ where: { OR: [{ actorId: { in: userIds } }, { entityId: { in: userIds } }] } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
}

async function main() {
  await ensureDefaultPlans();
  const staleUsers = await prisma.user.findMany({ select: { id: true }, where: { email: { startsWith: "s20-" } } });
  await cleanupUsers(staleUsers.map((user) => user.id));
  const stamp = Date.now();
  const superUser = await ensureUser(`s20-super-${stamp}@ecg.test`, "SUPER_ADMIN");
  const doctorUser = await ensureUser(`s20-doctor-${stamp}@ecg.test`, "DOCTOR");

  const server = createServer(createApp());
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  assert(address && typeof address === "object", "Server did not start.");
  const baseUrl = `http://127.0.0.1:${address.port}/api`;

  async function request(path: string, options: { body?: unknown; method?: string; token?: string } = {}) {
    const headers = new Headers();
    if (options.token) headers.set("authorization", `Bearer ${options.token}`);
    let body: BodyInit | undefined;
    if (options.body !== undefined) {
      headers.set("content-type", "application/json");
      body = JSON.stringify(options.body);
    }
    const response = await fetch(`${baseUrl}${path}`, { body, headers, method: options.method ?? "GET" });
    const text = await response.text();
    const parsed = text ? JSON.parse(text) : null;
    return { body: parsed, status: response.status };
  }

  async function login(email: string, password = "password"): Promise<Session> {
    const response = await request("/auth/login", { body: { email, password, rememberMe: true }, method: "POST" });
    assert(response.status === 200, `Login failed for ${email}.`);
    const body = response.body as { accessToken: string; user: { id: string } };
    return { token: body.accessToken, user: body.user };
  }

  const admin = await login(superUser.email);
  const doctor = await login(doctorUser.email);

  let response = await request("/super-admin/dashboard", { token: doctor.token });
  assert(response.status === 403, "Non-super-admin should not access dashboard.");

  response = await request("/super-admin/dashboard", { token: admin.token });
  assert(response.status === 200, "Super admin dashboard should be accessible.");
  assert((response.body as { dashboard: { totalUsers: number } }).dashboard.totalUsers >= 2, "Dashboard total users missing.");

  response = await request("/subscriptions/plans", { token: doctor.token });
  assert(response.status === 200, "Public plan list should load.");
  assert(!(response.body as { plans: Array<{ code: string }> }).plans.some((plan) => plan.code === "lifetime"), "Lifetime must be hidden from public plans.");

  response = await request("/subscriptions/plans", { token: admin.token });
  assert(response.status === 200, "Super admin plan list should load.");
  assert((response.body as { plans: Array<{ code: string }> }).plans.some((plan) => plan.code === "lifetime"), "Super admin should be able to inspect internal lifetime plan.");

  response = await request("/subscriptions/payments/initiate", { body: { plan: "lifetime", provider: "CARD" }, method: "POST", token: doctor.token });
  assert(response.status === 403, "Normal users must not initiate lifetime purchase attempts.");

  response = await request("/subscriptions/licenses/lifetime", { body: { userId: doctorUser.id }, method: "POST", token: doctor.token });
  assert(response.status === 403, "Normal users must not grant lifetime.");

  const registeredEmail = `s20-register-${stamp}@ecg.test`;
  response = await request("/auth/register", {
    body: { email: registeredEmail, name: "Sprint 20 Registered Doctor", password: "Register123!", role: "doctor" },
    method: "POST",
  });
  assert(response.status === 201, "Registration should succeed.");
  const registeredUser = await prisma.user.findUniqueOrThrow({ include: { subscription: true }, where: { email: registeredEmail } });
  assert(registeredUser.subscription?.tier === "FREE", "Newly registered users must default to FREE.");

  response = await request("/super-admin/plans", {
    body: { currency: "USD", features: ["Quota", "Billing"], isActive: true, monthlyQuota: 500, name: "Pro", plan: "PRO", price: 4900 },
    method: "POST",
    token: admin.token,
  });
  assert(response.status === 201, "Plan upsert failed.");

  response = await request(`/super-admin/users/${doctorUser.id}/plan`, { body: { plan: "PRO" }, method: "POST", token: admin.token });
  assert(response.status === 200, "Plan change failed.");
  const proQuota = await quotaSnapshot(doctorUser.id);
  assert(proQuota.quota === 500, "PRO plan should map to professional monthly quota.");

  response = await request(`/super-admin/users/${doctorUser.id}/subscription/extend`, { body: { months: 1 }, method: "POST", token: admin.token });
  assert(response.status === 200, "Subscription renewal/extension flow failed.");

  for (let index = 0; index < 7; index += 1) await recordAnalysisUsage(doctorUser.id, { sprint20: true });
  response = await request(`/super-admin/users/${doctorUser.id}/lifetime`, { method: "POST", token: admin.token });
  assert(response.status === 201, "Lifetime grant failed.");
  const lifetimeQuota = await quotaSnapshot(doctorUser.id);
  assert(lifetimeQuota.isUnlimited, "Lifetime user should ignore quota engine.");

  response = await request("/subscriptions/me", { token: doctor.token });
  assert(response.status === 200, "Subscription status should load.");
  const subscriptionStatus = response.body as { lifetimeAccess: { granted: boolean; message: string | null; noExpiration: boolean; unlimitedAnalyses: boolean } };
  assert(subscriptionStatus.lifetimeAccess.granted, "Lifetime grant should appear in account status.");
  assert(subscriptionStatus.lifetimeAccess.unlimitedAnalyses && subscriptionStatus.lifetimeAccess.noExpiration, "Lifetime UX metadata missing.");

  response = await request(`/super-admin/users/${doctorUser.id}/lifetime`, { method: "DELETE", token: admin.token });
  assert(response.status === 200, "Lifetime revoke failed.");
  const revokedQuota = await quotaSnapshot(doctorUser.id);
  assert(!revokedQuota.isUnlimited, "Revoked lifetime user should no longer be unlimited.");

  const registeredSession = await login(registeredEmail, "Register123!");
  response = await request("/auth/change-password", {
    body: { currentPassword: "Register123!", newPassword: "Changed123!!" },
    method: "POST",
    token: registeredSession.token,
  });
  assert(response.status === 204, "Password change should succeed.");
  await login(registeredEmail, "Changed123!!");

  response = await request("/super-admin/payments", {
    body: { amount: 12000, currency: "USD", paymentMethod: "Visa", referenceNumber: `REF-${stamp}`, status: "SUCCESS", userId: doctorUser.id },
    method: "POST",
    token: admin.token,
  });
  assert(response.status === 201, "Payment transaction creation failed.");

  response = await request("/super-admin/revenue", { token: admin.token });
  assert(response.status === 200, "Revenue dashboard should remain accessible.");
  const revenue = response.body as { revenue: { byDay: Array<{ amount: number }> } };
  assert(revenue.revenue.byDay.some((item) => item.amount >= 12000), "Revenue dashboard should include successful payment transactions.");

  response = await request("/super-admin/gift-licenses", { body: { duration: "3_MONTHS", userId: doctorUser.id }, method: "POST", token: admin.token });
  assert(response.status === 201, "Gift license creation failed.");

  response = await request("/super-admin/audit", { token: admin.token });
  assert(response.status === 200, "Audit log viewer failed.");
  const auditBody = response.body as { logs: Array<{ message: string }> };
  assert(auditBody.logs.some((log) => log.message.includes("Super Admin action")), "Admin audit action not recorded.");

  await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  await cleanupUsers([superUser.id, doctorUser.id, registeredUser.id]);
  console.log("Super admin integration test passed.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
