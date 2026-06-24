import { createServer } from "node:http";
import { readFileSync } from "node:fs";
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

async function cleanupUsers(userIds: string[]) {
  if (!userIds.length) return;
  await prisma.userMFA.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.session.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.userSession.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.passwordHistory.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.auditLog.deleteMany({ where: { OR: [{ actorId: { in: userIds } }, { entityId: { in: userIds } }] } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
}

async function main() {
  const staleUsers = await prisma.user.findMany({ select: { id: true }, where: { email: { startsWith: "s20-owner-" } } });
  await cleanupUsers(staleUsers.map((user) => user.id));

  const stamp = Date.now();
  const ownerEmail = `s20-owner-${stamp}@ecg.test`;
  const superEmail = `s20-owner-super-${stamp}@ecg.test`;
  const doctorEmail = `s20-owner-doctor-${stamp}@ecg.test`;
  const temporaryPassword = "Temporary123!";

  const [owner, superAdmin, doctor] = await Promise.all([
    prisma.user.create({
      data: {
        avatarInitials: "AY",
        email: ownerEmail,
        emailVerified: true,
        forcePasswordReset: true,
        isActive: true,
        name: "Dr. Ahmed Yehia",
        ownerPasswordSetupRequired: true,
        passwordHash: await bcrypt.hash(temporaryPassword, 12),
        protectedOwner: true,
        role: "OWNER",
        username: `AhmedYahiaFahmy${stamp}`,
        subscription: { create: { status: "ACTIVE", tier: "ENTERPRISE" } },
      },
    }),
    prisma.user.create({
      data: {
        avatarInitials: "SA",
        email: superEmail,
        emailVerified: true,
        isActive: true,
        name: "Sprint 20.3 Super Admin",
        passwordHash: await bcrypt.hash("password", 12),
        role: "SUPER_ADMIN",
        subscription: { create: { status: "ACTIVE", tier: "ENTERPRISE" } },
      },
    }),
    prisma.user.create({
      data: {
        avatarInitials: "DR",
        email: doctorEmail,
        emailVerified: true,
        isActive: true,
        name: "Sprint 20.3 Doctor",
        passwordHash: await bcrypt.hash("password", 12),
        role: "DOCTOR",
        subscription: { create: { status: "ACTIVE", tier: "FREE" } },
      },
    }),
  ]);

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

  async function login(email: string, password = "password") {
    const response = await request("/auth/login", { body: { email, password, rememberMe: true }, method: "POST" });
    assert(response.status === 200, `Login failed for ${email}.`);
    return (response.body as { accessToken: string; user: { id: string; isOwner?: boolean; protectedOwner?: boolean } });
  }

  let response = await request("/auth/login", { body: { email: ownerEmail, password: temporaryPassword, rememberMe: true }, method: "POST" });
  assert(response.status === 403, "Owner first login should require manual password setup.");

  response = await request("/auth/owner/setup-password", {
    body: { email: ownerEmail, newPassword: "OwnerStrong123!", username: `AhmedYahiaFahmy${stamp}` },
    method: "POST",
  });
  assert(response.status === 204, "Owner password setup should succeed.");
  const ownerAfterSetup = await prisma.user.findUniqueOrThrow({ where: { id: owner.id } });
  assert(ownerAfterSetup.passwordHash.startsWith("$argon2"), "Owner password must be stored with Argon2 when available.");
  assert(!ownerAfterSetup.ownerPasswordSetupRequired && !ownerAfterSetup.forcePasswordReset, "Owner first-login flags should clear after setup.");

  const ownerSession = await login(ownerEmail, "OwnerStrong123!");
  assert(ownerSession.user.isOwner && ownerSession.user.protectedOwner, "Owner identity metadata missing from auth payload.");
  const superSession = await login(superEmail);
  const doctorSession = await login(doctorEmail);

  response = await request("/super-admin/dashboard", { token: doctorSession.accessToken });
  assert(response.status === 403, "Clinical users must receive 403 on owner/admin APIs.");

  response = await request(`/super-admin/users/${owner.id}/actions/disable`, { method: "POST", token: superSession.accessToken });
  assert(response.status === 403, "Super Admin must not disable protected owner.");
  response = await request(`/super-admin/users/${owner.id}/actions/force-logout`, { method: "POST", token: superSession.accessToken });
  assert(response.status === 403, "Super Admin must not force logout protected owner.");
  response = await request(`/super-admin/users/${owner.id}`, { method: "DELETE", token: superSession.accessToken });
  assert(response.status === 403, "Super Admin must not delete protected owner.");
  response = await request(`/super-admin/users/${owner.id}`, { body: { role: "admin" }, method: "PATCH", token: superSession.accessToken });
  assert(response.status === 403, "Super Admin must not change protected owner role.");

  response = await request("/security/mfa", { body: { type: "EMAIL_OTP" }, method: "POST", token: ownerSession.accessToken });
  assert(response.status === 201, "Owner email OTP MFA setup should start.");
  const mfaSetup = response.body as { method: { id: string }; otp: string };
  response = await request(`/security/mfa/${mfaSetup.method.id}/verify`, { body: { code: mfaSetup.otp }, method: "POST", token: ownerSession.accessToken });
  assert(response.status === 200 && (response.body as { valid: boolean }).valid, "Owner email OTP MFA should verify.");
  response = await request(`/security/mfa/${mfaSetup.method.id}`, { method: "DELETE", token: ownerSession.accessToken });
  assert(response.status === 200, "Owner should be able to disable MFA.");

  const adminLayout = readFileSync("artifacts/ecg-insight/app/admin/_layout.tsx", "utf8");
  const profileScreen = readFileSync("artifacts/ecg-insight/app/(tabs)/profile.tsx", "utf8");
  assert(adminLayout.includes("/unauthorized"), "Unauthorized route redirect is missing.");
  assert(profileScreen.includes('user.role === "super_admin"'), "Owner/admin navigation should be hidden from non-super-admin users.");

  await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  await cleanupUsers([owner.id, superAdmin.id, doctor.id]);
  console.log("Owner security integration test passed.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
