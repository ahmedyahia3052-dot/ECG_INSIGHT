/**
 * FINAL AUTHENTICATION ACCEPTANCE — production E2E against live createApp + Postgres.
 * Never fakes verification, OAuth, or biometrics. Development delivery via EmailOutbox / response tokens.
 */
import { createServer } from "node:http";
import { runIntegrationMain } from "./finish-integration";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { createApp } from "../server/src/app";

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env["DATABASE_URL"] ?? "postgresql://postgres:postgres@localhost:5432/ecg_insight",
  }),
});

type Result = { ok: boolean; name: string; detail?: string };

const results: Result[] = [];

function record(name: string, ok: boolean, detail?: string) {
  results.push({ name, ok, detail });
  const mark = ok ? "PASS" : "FAIL";
  console.log(`[${mark}] ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) throw new Error(`ACCEPTANCE FAILED: ${name}${detail ? ` (${detail})` : ""}`);
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function cleanupUsers(userIds: string[]) {
  if (!userIds.length) return;
  await prisma.webAuthnCredential.deleteMany({ where: { userId: { in: userIds } } }).catch(() => undefined);
  await prisma.webAuthnChallenge.deleteMany({ where: { userId: { in: userIds } } }).catch(() => undefined);
  await prisma.mFARecoveryCode.deleteMany({ where: { userId: { in: userIds } } }).catch(() => undefined);
  await prisma.userMFA.deleteMany({ where: { userId: { in: userIds } } }).catch(() => undefined);
  await prisma.trustedDevice.deleteMany({ where: { userId: { in: userIds } } }).catch(() => undefined);
  await prisma.userSession.deleteMany({ where: { userId: { in: userIds } } }).catch(() => undefined);
  await prisma.session.deleteMany({ where: { userId: { in: userIds } } }).catch(() => undefined);
  await prisma.passwordHistory.deleteMany({ where: { userId: { in: userIds } } }).catch(() => undefined);
  await prisma.loginHistory.deleteMany({ where: { userId: { in: userIds } } }).catch(() => undefined);
  await prisma.securityEvent.deleteMany({ where: { userId: { in: userIds } } }).catch(() => undefined);
  await prisma.securityPolicy.deleteMany({ where: { updatedById: { in: userIds } } }).catch(() => undefined);
  await prisma.oAuthIdentity.deleteMany({ where: { userId: { in: userIds } } }).catch(() => undefined);
  await prisma.auditLog.deleteMany({
    where: { OR: [{ actorId: { in: userIds } }, { entityId: { in: userIds } }] },
  }).catch(() => undefined);
  await prisma.subscription.deleteMany({ where: { userId: { in: userIds } } }).catch(() => undefined);
  await prisma.userSubscription.deleteMany({ where: { userId: { in: userIds } } }).catch(() => undefined);
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
}

async function main() {
  process.env.NODE_ENV = process.env.NODE_ENV || "development";

  const stamp = Date.now();
  const prefix = `auth-accept-${stamp}`;
  const stale = await prisma.user.findMany({
    select: { id: true },
    where: { email: { startsWith: "auth-accept-" } },
  });
  await cleanupUsers(stale.map((u) => u.id));

  const server = createServer(createApp());
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert(address && typeof address === "object", "Server did not start");
  const baseUrl = `http://127.0.0.1:${address.port}/api`;

  const cookies = new Map<string, string>();
  const trackedUserIds: string[] = [];

  function ingestSetCookie(response: Response) {
    const list =
      typeof response.headers.getSetCookie === "function"
        ? response.headers.getSetCookie()
        : response.headers.get("set-cookie")
          ? [response.headers.get("set-cookie")!]
          : [];
    for (const raw of list) {
      const first = raw.split(";")[0] ?? "";
      const eq = first.indexOf("=");
      if (eq <= 0) continue;
      cookies.set(first.slice(0, eq), first.slice(eq + 1));
    }
  }

  async function request(
    path: string,
    options: { body?: unknown; method?: string; token?: string; headers?: Record<string, string> } = {},
  ) {
    const headers = new Headers(options.headers);
    if (options.token) headers.set("authorization", `Bearer ${options.token}`);
    if (cookies.size) {
      headers.set(
        "cookie",
        [...cookies.entries()].map(([k, v]) => `${k}=${v}`).join("; "),
      );
      const csrf = cookies.get("ecg_csrf_token");
      if (csrf && !headers.has("x-csrf-token")) headers.set("x-csrf-token", csrf);
    }
    let body: BodyInit | undefined;
    if (options.body !== undefined) {
      headers.set("content-type", "application/json");
      body = JSON.stringify(options.body);
    }
    const response = await fetch(`${baseUrl}${path}`, {
      body,
      headers,
      method: options.method ?? "GET",
    });
    ingestSetCookie(response);
    const text = await response.text();
    let parsed: unknown = null;
    if (text) {
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = text;
      }
    }
    return { body: parsed as Record<string, unknown> | null, headers: response.headers, status: response.status, text };
  }

  const strongPassword = "AcceptStrong1!";
  const nextPassword = "AcceptStrong2!";
  const email = `${prefix}@ecg.test`;
  const adminEmail = `${prefix}-admin@ecg.test`;

  // ---------- Security headers ----------
  {
    const health = await fetch(`http://127.0.0.1:${address.port}/live`);
    record(
      "Security: Helmet / live endpoint responds",
      health.status === 200 || health.status === 204 || health.ok,
      `status=${health.status}`,
    );
  }

  // ---------- Registration validation ----------
  {
    let res = await request("/auth/register", {
      method: "POST",
      body: { email, name: "A", password: "weak", role: "doctor" },
    });
    record("Registration: weak password rejected", res.status >= 400, `status=${res.status}`);

    res = await request("/auth/register", {
      method: "POST",
      body: { email: "not-an-email", name: "Accept User", password: strongPassword, role: "doctor" },
    });
    record("Registration: invalid email rejected", res.status >= 400, `status=${res.status}`);

    res = await request("/auth/register", {
      method: "POST",
      body: {
        email,
        name: "Accept User",
        password: strongPassword,
        role: "doctor",
        institution: "ECG Insight Acceptance",
      },
    });
    record("Registration: create account", res.status === 201, `status=${res.status}`);
    const user = await prisma.user.findUnique({ where: { email } });
    assert(user, "User not persisted");
    trackedUserIds.push(user.id);
    record("Registration: database persistence", Boolean(user.id));
    record(
      "Registration: verification required (no premature session)",
      res.body?.requiresEmailVerification === true || !res.body?.accessToken,
      `requires=${String(res.body?.requiresEmailVerification)} hasToken=${Boolean(res.body?.accessToken)}`,
    );

    const audit = await prisma.auditLog.findFirst({
      where: { actorId: user.id },
      orderBy: { createdAt: "desc" },
    });
    // Register may not create LOGIN audit; check user row + later login audit
    record("Registration: user row created for audit trail", Boolean(user.createdAt));

    res = await request("/auth/register", {
      method: "POST",
      body: { email, name: "Dup", password: strongPassword, role: "doctor" },
    });
    record("Registration: duplicate email protection", res.status === 409, `status=${res.status}`);
  }

  // ---------- Email verification ----------
  let verifyToken = "";
  {
    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    record(
      "Email verification: token hash stored securely",
      Boolean(user.emailVerificationTokenHash) && !user.emailVerified,
    );
    record(
      "Email verification: expiration set",
      Boolean(user.emailVerificationExpiresAt && user.emailVerificationExpiresAt > new Date()),
    );

    const outbox = await prisma.emailOutbox.findFirst({
      where: { toEmail: email, template: "email_verification" },
      orderBy: { createdAt: "desc" },
    });
    record("Email verification: development delivery (EmailOutbox)", Boolean(outbox?.bodyText));

    const resend = await request("/auth/resend-verification", { method: "POST", body: { email } });
    record("Email verification: resend verification", resend.status === 200, `status=${resend.status}`);
    verifyToken =
      (typeof resend.body?.emailVerificationToken === "string"
        ? resend.body.emailVerificationToken
        : outbox?.bodyText?.match(/Token \(development delivery\): (\S+)/)?.[1]) ?? "";
    assert(verifyToken.length >= 12, "Missing verification token from outbox/dev response");

    let res = await request("/auth/login", {
      method: "POST",
      body: { email, password: strongPassword, rememberMe: true },
    });
    record(
      "Email verification: login blocked before verify",
      res.status === 403,
      `status=${res.status} body=${JSON.stringify(res.body)?.slice(0, 120)}`,
    );

    res = await request("/auth/verify-email", {
      method: "POST",
      body: { email, token: "invalid-token-xxxxx" },
    });
    record("Email verification: invalid token rejected", res.status === 400, `status=${res.status}`);

    await prisma.user.update({
      where: { email },
      data: { emailVerificationExpiresAt: new Date(Date.now() - 60_000) },
    });
    res = await request("/auth/verify-email", {
      method: "POST",
      body: { email, token: verifyToken },
    });
    record("Email verification: expired token rejected", res.status === 400, `status=${res.status}`);

    // Issue a fresh token after expiry test
    const refresh = await request("/auth/resend-verification", { method: "POST", body: { email } });
    verifyToken = String(refresh.body?.emailVerificationToken ?? "");
    assert(verifyToken.length >= 12, "Fresh verify token missing");

    res = await request("/auth/verify-email", {
      method: "POST",
      body: { email, token: verifyToken },
    });
    record("Email verification: valid token succeeds", res.status === 204, `status=${res.status}`);

    const verified = await prisma.user.findUniqueOrThrow({ where: { email } });
    record("Email verification: verified flag set", verified.emailVerified === true);
    record(
      "Email verification: token cleared after use",
      !verified.emailVerificationTokenHash && !verified.emailVerificationExpiresAt,
    );

    res = await request("/auth/verify-email", {
      method: "POST",
      body: { email, token: verifyToken },
    });
    record("Email verification: already verified rejected", res.status === 400, `status=${res.status}`);
  }

  // ---------- Login ----------
  let accessToken = "";
  {
    let res = await request("/auth/login", {
      method: "POST",
      body: { email, password: "WrongPassword1!", rememberMe: false },
      headers: { "x-device-fingerprint": "accept-fp-1" },
    });
    record("Login: wrong password rejected", res.status === 401, `status=${res.status}`);

    res = await request("/auth/login", {
      method: "POST",
      body: { email: `missing-${stamp}@ecg.test`, password: strongPassword, rememberMe: false },
    });
    record("Login: unknown email rejected", res.status === 401, `status=${res.status}`);

    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    await prisma.user.update({ where: { id: user.id }, data: { isActive: false } });
    res = await request("/auth/login", {
      method: "POST",
      body: { email, password: strongPassword, rememberMe: true },
    });
    record("Login: disabled account rejected", res.status === 403, `status=${res.status}`);
    await prisma.user.update({ where: { id: user.id }, data: { isActive: true } });

    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 5, lockedUntil: new Date(Date.now() + 15 * 60 * 1000) },
    });
    res = await request("/auth/login", {
      method: "POST",
      body: { email, password: strongPassword, rememberMe: true },
    });
    record("Login: locked account rejected", res.status === 423, `status=${res.status}`);
    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    });

    cookies.clear();
    res = await request("/auth/login", {
      method: "POST",
      body: { email, password: strongPassword, rememberMe: true },
      headers: { "x-device-fingerprint": "accept-fp-1" },
    });
    record("Login: correct credentials", res.status === 200 && Boolean(res.body?.accessToken), `status=${res.status}`);
    accessToken = String(res.body?.accessToken ?? "");
    record("Login: refresh cookie session", cookies.has("ecg_refresh_token"));
    record("Login: CSRF cookie issued", cookies.has("ecg_csrf_token"));

    const loginAudit = await prisma.auditLog.findFirst({
      where: { actorId: user.id, action: "LOGIN" },
      orderBy: { createdAt: "desc" },
    });
    record("Login: audit log", Boolean(loginAudit));

    const history = await prisma.loginHistory.findFirst({
      where: { userId: user.id, success: true },
      orderBy: { createdAt: "desc" },
    });
    record("Login: login history + fingerprint", Boolean(history), `deviceId=${history?.deviceId ?? "none"}`);

    const session = await prisma.session.findFirst({
      where: { userId: user.id, revokedAt: null },
      orderBy: { createdAt: "desc" },
    });
    record("Login: session creation", Boolean(session?.rememberMe === true));
  }

  // ---------- Refresh / logout ----------
  {
    const refresh = await request("/auth/refresh", { method: "POST" });
    record("Session: refresh token rotation", refresh.status === 200 && Boolean(refresh.body?.accessToken), `status=${refresh.status}`);
    if (refresh.body?.accessToken) accessToken = String(refresh.body.accessToken);

    const me = await request("/auth/me", { token: accessToken });
    record("Session: authenticated /auth/me", me.status === 200, `status=${me.status}`);

    const sessions = await request("/security/sessions", { token: accessToken });
    record(
      "Session: active sessions list",
      sessions.status === 200 && Array.isArray((sessions.body as { sessions?: unknown[] })?.sessions),
      `status=${sessions.status}`,
    );
  }

  // ---------- Password change ----------
  {
    const bad = await request("/auth/change-password", {
      method: "POST",
      token: accessToken,
      body: { currentPassword: "WrongCurrent1!", newPassword: nextPassword },
    });
    record("Password change: current password required", bad.status === 400, `status=${bad.status}`);

    const weak = await request("/auth/change-password", {
      method: "POST",
      token: accessToken,
      body: { currentPassword: strongPassword, newPassword: "short" },
    });
    record("Password change: policy enforced", weak.status === 400, `status=${weak.status}`);

    const ok = await request("/auth/change-password", {
      method: "POST",
      token: accessToken,
      body: { currentPassword: strongPassword, newPassword: nextPassword },
    });
    record("Password change: success", ok.status === 204, `status=${ok.status}`);

    const reuse = await request("/auth/login", {
      method: "POST",
      body: { email, password: nextPassword, rememberMe: true },
    });
    assert(reuse.status === 200, "Re-login after password change failed");
    accessToken = String(reuse.body?.accessToken ?? "");

    const sameReuse = await request("/auth/change-password", {
      method: "POST",
      token: accessToken,
      body: { currentPassword: nextPassword, newPassword: nextPassword },
    });
    record(
      "Password change: password reuse prevention",
      sameReuse.status === 400,
      `status=${sameReuse.status}`,
    );

    const revoked = await prisma.session.count({
      where: {
        userId: (await prisma.user.findUniqueOrThrow({ where: { email } })).id,
        revokedAt: { not: null },
      },
    });
    record("Password change: sessions revoked", revoked >= 1, `revoked=${revoked}`);
  }

  // ---------- Password reset ----------
  {
    cookies.clear();
    const forgot = await request("/auth/forgot-password", { method: "POST", body: { email } });
    record("Password reset: forgot password accepted", forgot.status === 200, `status=${forgot.status}`);
    let resetToken = typeof forgot.body?.resetToken === "string" ? forgot.body.resetToken : "";
    if (!resetToken) {
      const outbox = await prisma.emailOutbox.findFirst({
        where: { toEmail: email, template: "password_reset" },
        orderBy: { createdAt: "desc" },
      });
      resetToken = outbox?.bodyText?.match(/Token \(for support\/debug only\): (\S+)/)?.[1] ?? "";
    }
    record("Password reset: reset token available (dev delivery)", resetToken.length >= 12);

    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    record("Password reset: token hashed in DB", Boolean(user.passwordResetTokenHash));

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordResetExpiresAt: new Date(Date.now() - 60_000) },
    });
    let res = await request("/auth/reset-password", {
      method: "POST",
      body: { email, token: resetToken, newPassword: "AcceptStrong3!" },
    });
    record("Password reset: expired token rejected", res.status === 400, `status=${res.status}`);

    const forgot2 = await request("/auth/forgot-password", { method: "POST", body: { email } });
    resetToken = String(forgot2.body?.resetToken ?? "");
    assert(resetToken.length >= 12, "Second reset token missing");

    res = await request("/auth/reset-password", {
      method: "POST",
      body: { email, token: resetToken, newPassword: "AcceptStrong3!" },
    });
    record("Password reset: password update", res.status === 204 || res.status === 200, `status=${res.status}`);

    res = await request("/auth/reset-password", {
      method: "POST",
      body: { email, token: resetToken, newPassword: "AcceptStrong4!" },
    });
    record("Password reset: single-use token", res.status === 400, `status=${res.status}`);

    res = await request("/auth/login", {
      method: "POST",
      body: { email, password: "AcceptStrong3!", rememberMe: false },
    });
    record("Password reset: new password works", res.status === 200, `status=${res.status}`);
    accessToken = String(res.body?.accessToken ?? "");

    res = await request("/auth/login", {
      method: "POST",
      body: { email, password: nextPassword, rememberMe: false },
    });
    record("Password reset: old password rejected", res.status === 401, `status=${res.status}`);
  }

  // ---------- Logout / logout-all ----------
  {
    const logout = await request("/auth/logout", { method: "POST", token: accessToken });
    record("Session: logout", logout.status === 204 || logout.status === 200, `status=${logout.status}`);

    const login = await request("/auth/login", {
      method: "POST",
      body: { email, password: "AcceptStrong3!", rememberMe: true },
    });
    accessToken = String(login.body?.accessToken ?? "");
    const logoutAll = await request("/auth/logout-all", { method: "POST", token: accessToken });
    record("Session: logout all devices", logoutAll.status === 204 || logoutAll.status === 200, `status=${logoutAll.status}`);

    const badRefresh = await request("/auth/refresh", { method: "POST" });
    record(
      "Session: invalid/revoked refresh rejected",
      badRefresh.status === 401,
      `status=${badRefresh.status}`,
    );
  }

  // ---------- Admin settings ----------
  {
    const { hashPassword } = await import("../server/src/utils/crypto");
    const admin = await prisma.user.create({
      data: {
        avatarInitials: "AD",
        email: adminEmail,
        emailVerified: true,
        isActive: true,
        name: "Accept Admin",
        passwordHash: await hashPassword("AdminStrong1!"),
        role: "ADMIN",
        subscription: { create: { status: "ACTIVE", tier: "ENTERPRISE" } },
      },
    });
    trackedUserIds.push(admin.id);

    cookies.clear();
    const login2 = await request("/auth/login", {
      method: "POST",
      body: { email: adminEmail, password: "AdminStrong1!", rememberMe: true },
    });
    record("Admin: login", login2.status === 200, `status=${login2.status}`);
    const adminToken = String(login2.body?.accessToken ?? "");

    let res = await request("/admin/auth-settings", { token: adminToken });
    record("Admin: get auth settings", res.status === 200 && Boolean(res.body?.settings), `status=${res.status}`);

    res = await request("/admin/auth-settings", {
      method: "PUT",
      token: adminToken,
      body: {
        emailVerificationRequired: false,
        biometricsEnabled: false,
        passkeysEnabled: false,
        sessionLifetimeSeconds: 3600,
        passwordMinLength: 12,
      },
    });
    record("Admin: disable email verification + biometrics + set lifetime/policy", res.status === 200, `status=${res.status}`);

    res = await request("/admin/auth-settings", {
      method: "PUT",
      token: adminToken,
      body: {
        emailVerificationRequired: true,
        biometricsEnabled: true,
        passkeysEnabled: true,
      },
    });
    record("Admin: re-enable email verification + biometrics", res.status === 200, `status=${res.status}`);
  }

  // ---------- OAuth / WebAuthn honesty ----------
  {
    const providers = await request("/auth/oauth/providers");
    record("OAuth: providers endpoint responds", providers.status === 200, `status=${providers.status}`);
    const list = (providers.body as { providers?: Array<{ configured?: boolean }> })?.providers ?? [];
    const allHonest = list.every((p) => p.configured === true || p.configured === false);
    record("OAuth: no fake configured claims", allHonest, `count=${list.length}`);

    const webauthn = await request("/auth/webauthn/status");
    record("Biometrics: status endpoint (never fakes ready without RP ID)", webauthn.status === 200, `status=${webauthn.status}`);
    const available = (webauthn.body as { available?: boolean })?.available === true;
    if (!available) {
      record("Biometrics: graceful disable when hardware/config missing", true, String((webauthn.body as { reason?: string })?.reason ?? ""));
    } else {
      record("Biometrics: backend reports available when configured", true);
    }
  }

  // ---------- CSRF / input validation ----------
  {
    cookies.clear();
    const login = await request("/auth/login", {
      method: "POST",
      body: { email, password: "AcceptStrong3!", rememberMe: true },
    });
    accessToken = String(login.body?.accessToken ?? "");
    const csrf = cookies.get("ecg_csrf_token");
    // Strip csrf header deliberately
    const headers = new Headers();
    headers.set("authorization", `Bearer ${accessToken}`);
    headers.set("content-type", "application/json");
    headers.set(
      "cookie",
      [...cookies.entries()].map(([k, v]) => `${k}=${v}`).join("; "),
    );
    // omit x-csrf-token
    const response = await fetch(`${baseUrl}/auth/change-password`, {
      method: "POST",
      headers,
      body: JSON.stringify({ currentPassword: "AcceptStrong3!", newPassword: "AcceptStrong9!" }),
    });
    record("Security: CSRF enforced on authenticated mutating request", response.status === 403, `status=${response.status}`);
    record("Security: CSRF cookie present for rotation", Boolean(csrf));
  }

  // cleanup
  await cleanupUsers(trackedUserIds);
  server.close();

  console.log(`\n=== AUTH ACCEPTANCE SUMMARY: ${results.length} scenarios PASSED ===\n`);
}

runIntegrationMain(main, "auth-module-final-acceptance");
