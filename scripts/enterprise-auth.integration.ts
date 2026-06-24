import { createServer } from "node:http";
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

async function cleanup(prefix: string) {
  const users = await prisma.user.findMany({
    select: { id: true },
    where: { OR: [{ email: { contains: prefix } }, { name: { startsWith: "Sprint 21" } }] },
  });
  const userIds = users.map((user) => user.id);
  await prisma.phoneOtp.deleteMany({ where: { OR: [{ phoneNumber: { contains: prefix } }, { userId: { in: userIds } }] } });
  await prisma.oAuthIdentity.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.userSession.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.session.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.passwordHistory.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.userSubscription.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.subscription.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.auditLog.deleteMany({ where: { OR: [{ actorId: { in: userIds } }, { entityId: { in: userIds } }] } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
}

async function main() {
  const stamp = `s21-${Date.now()}`;
  await cleanup("s21-");
  const server = createServer(createApp());
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  assert(address && typeof address === "object", "Server did not start.");
  const baseUrl = `http://127.0.0.1:${address.port}/api`;

  async function request<T>(path: string, options: { body?: unknown; method?: string; token?: string } = {}) {
    const headers = new Headers({ "content-type": "application/json" });
    if (options.token) headers.set("authorization", `Bearer ${options.token}`);
    const response = await fetch(`${baseUrl}${path}`, {
      body: options.body ? JSON.stringify(options.body) : undefined,
      headers,
      method: options.method ?? "GET",
    });
    const text = await response.text();
    const payload = text ? JSON.parse(text) : null;
    if (!response.ok) {
      throw new Error(`${options.method ?? "GET"} ${path} failed: ${response.status} ${text}`);
    }
    return payload as T;
  }

  try {
    const email = `${stamp}@ecg.test`;
    const registered = await request<{ accessToken: string; emailVerificationToken: string; user: { subscriptionTier: string } }>("/auth/register", {
      body: { email, name: "Sprint 21 User", password: "StrongPass123!", role: "user" },
      method: "POST",
    });
    assert(registered.user.subscriptionTier === "free", "New email users must start on FREE plan.");
    assert(Boolean(registered.emailVerificationToken), "Registration must generate email verification token.");

    const resend = await request<{ emailVerificationToken?: string }>("/auth/resend-verification", {
      body: { email },
      method: "POST",
    });
    assert(Boolean(resend.emailVerificationToken), "Verification resend must generate a token.");
    await request<void>("/auth/verify-email", { body: { email, token: resend.emailVerificationToken }, method: "POST" });

    const login = await request<{ accessToken: string }>("/auth/login", {
      body: { email, password: "StrongPass123!", rememberMe: true },
      method: "POST",
    });
    assert(Boolean(login.accessToken), "Email login must issue an access token.");

    const phoneNumber = `+2010${Date.now().toString().slice(-8)}`;
    const requestedOtp = await request<{ otp: string }>("/auth/phone/request-otp", {
      body: { name: "Sprint 21 Phone", phoneNumber, purpose: "REGISTER" },
      method: "POST",
    });
    assert(requestedOtp.otp.length === 6, "Phone OTP must be generated.");
    const phoneLogin = await request<{ accessToken: string; user: { phoneVerified: boolean; subscriptionTier: string } }>("/auth/phone/verify", {
      body: { otp: requestedOtp.otp, phoneNumber, rememberMe: true },
      method: "POST",
    });
    assert(phoneLogin.user.phoneVerified, "Phone OTP verification must mark phone as verified.");
    assert(phoneLogin.user.subscriptionTier === "free", "Phone-registered users must start on FREE plan.");

    const oauth = await request<{ accessToken: string; user: { emailVerified: boolean; subscriptionTier: string } }>("/auth/oauth/login", {
      body: {
        email: `${stamp}-google@ecg.test`,
        name: "Sprint 21 Google",
        provider: "GOOGLE",
        providerUserId: `${stamp}-google-id`,
        rememberMe: true,
      },
      method: "POST",
    });
    assert(oauth.user.emailVerified, "OAuth users with email should be email verified.");
    assert(oauth.user.subscriptionTier === "free", "OAuth users must start on FREE plan.");

    const sessions = await request<{ sessions: Array<{ id: string; ipAddress?: string; lastActivityAt: string; userAgent?: string }> }>("/security/sessions", {
      token: login.accessToken,
    });
    assert(sessions.sessions.length > 0, "Session management must list user sessions.");
    assert(Boolean(sessions.sessions[0]?.lastActivityAt), "Sessions must include last activity.");
    await request<{ session: unknown }>(`/security/sessions/${sessions.sessions[0]!.id}/revoke`, {
      method: "POST",
      token: login.accessToken,
    });
    const secondLogin = await request<{ accessToken: string }>("/auth/login", {
      body: { email, password: "StrongPass123!", rememberMe: true },
      method: "POST",
    });
    await request<void>("/auth/logout-all", { method: "POST", token: secondLogin.accessToken });

    const badEmail = `${stamp}-captcha@ecg.test`;
    await request("/auth/register", {
      body: { email: badEmail, name: "Sprint 21 Captcha", password: "StrongPass123!", role: "user" },
      method: "POST",
    });
    for (let index = 0; index < 3; index += 1) {
      await fetch(`${baseUrl}/auth/login`, {
        body: JSON.stringify({ email: badEmail, password: "wrong-password", rememberMe: false }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
    }
    const lockedUser = await prisma.user.findUnique({ where: { email: badEmail } });
    assert((lockedUser?.failedLoginAttempts ?? 0) >= 3, "Failed login attempts must be tracked for CAPTCHA escalation.");
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await cleanup("s21-");
    await prisma.$disconnect();
  }
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
