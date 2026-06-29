import { createServer } from "node:http";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { createApp } from "../server/src/app";
import { hashPassword } from "../server/src/utils/crypto";

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env["DATABASE_URL"] ?? "postgresql://postgres:postgres@localhost:5432/ecg_insight",
  }),
});

type CookieJar = Map<string, string>;

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function setCookieHeaders(response: Response) {
  const headers = response.headers as Headers & { getSetCookie?: () => string[] };
  const explicit = headers.getSetCookie?.();
  if (explicit?.length) return explicit;
  const combined = response.headers.get("set-cookie");
  return combined ? combined.split(/,(?=\s*ecg_)/) : [];
}

function storeCookies(response: Response, jar: CookieJar) {
  for (const header of setCookieHeaders(response)) {
    const [pair] = header.split(";");
    const [name, value = ""] = pair.split("=");
    if (!name) continue;
    if (!value || /Max-Age=0/i.test(header)) {
      jar.delete(name.trim());
    } else {
      jar.set(name.trim(), value.trim());
    }
  }
}

function cookieHeader(jar: CookieJar) {
  return Array.from(jar.entries()).map(([name, value]) => `${name}=${value}`).join("; ");
}

async function cleanup(prefix: string) {
  const users = await prisma.user.findMany({
    select: { id: true },
    where: { email: { contains: prefix } },
  });
  const userIds = users.map((user) => user.id);
  await prisma.securityEvent.deleteMany({ where: { userId: { in: userIds } } });
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
  const prefix = `auth-hardening-${Date.now()}`;
  const password = "StrongPass123!";
  await cleanup("auth-hardening-");

  const [activeUser, inactiveUser, deletedUser] = await Promise.all([
    prisma.user.create({
      data: {
        avatarInitials: "AU",
        email: `${prefix}-active@ecg.test`,
        emailVerified: true,
        isActive: true,
        name: "Auth Hardening Active",
        passwordHash: await hashPassword(password),
        role: "DOCTOR",
        subscription: { create: { status: "ACTIVE", tier: "PROFESSIONAL" } },
      },
    }),
    prisma.user.create({
      data: {
        avatarInitials: "IU",
        email: `${prefix}-inactive@ecg.test`,
        emailVerified: true,
        isActive: false,
        name: "Auth Hardening Inactive",
        passwordHash: await hashPassword(password),
        role: "DOCTOR",
        subscription: { create: { status: "ACTIVE", tier: "FREE" } },
      },
    }),
    prisma.user.create({
      data: {
        avatarInitials: "DU",
        email: `${prefix}-deleted@ecg.test`,
        emailVerified: true,
        isActive: true,
        name: "Auth Hardening Deleted",
        passwordHash: await hashPassword(password),
        role: "USER",
        subscription: { create: { status: "ACTIVE", tier: "FREE" } },
      },
    }),
  ]);
  await prisma.user.delete({ where: { id: deletedUser.id } });

  const server = createServer(createApp());
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  assert(address && typeof address === "object", "Server did not start.");
  const baseUrl = `http://127.0.0.1:${address.port}/api`;

  async function request<T>(
    path: string,
    options: { body?: unknown; jar?: CookieJar; method?: string; token?: string } = {},
  ) {
    const headers = new Headers();
    if (options.body !== undefined) headers.set("content-type", "application/json");
    if (options.token) headers.set("authorization", `Bearer ${options.token}`);
    if (options.jar?.size) {
      headers.set("cookie", cookieHeader(options.jar));
      const csrf = options.jar.get("ecg_csrf_token");
      if (csrf) headers.set("x-csrf-token", csrf);
    }
    const response = await fetch(`${baseUrl}${path}`, {
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      headers,
      method: options.method ?? "GET",
    });
    if (options.jar) storeCookies(response, options.jar);
    const text = await response.text();
    const body = text ? JSON.parse(text) : null;
    return { body: body as T, response, status: response.status };
  }

  try {
    const invalidEmail = await request<{ code: string; message: string }>("/auth/login", {
      body: { email: `${prefix}-missing@ecg.test`, password, rememberMe: false },
      method: "POST",
    });
    assert(invalidEmail.status === 401 && invalidEmail.body.message === "Invalid email or password.", "Invalid email must return a friendly credential error.");

    const invalidPassword = await request<{ code: string; message: string }>("/auth/login", {
      body: { email: activeUser.email, password: "wrong-password", rememberMe: false },
      method: "POST",
    });
    assert(invalidPassword.status === 401 && invalidPassword.body.message === "Invalid email or password.", "Invalid password must return a friendly credential error.");

    const inactive = await request<{ code: string; message: string }>("/auth/login", {
      body: { email: inactiveUser.email, password, rememberMe: false },
      method: "POST",
    });
    assert(inactive.status === 403 && inactive.body.message === "Your account is inactive.", "Inactive accounts must get the inactive account message.");

    const deleted = await request<{ code: string; message: string }>("/auth/login", {
      body: { email: deletedUser.email, password, rememberMe: false },
      method: "POST",
    });
    assert(deleted.status === 401 && deleted.body.message === "Invalid email or password.", "Deleted accounts must not authenticate.");

    const staleJar: CookieJar = new Map([["ecg_refresh_token", "stale-refresh-token"]]);
    const validLogin = await request<{ accessToken: string; user: { email: string } }>("/auth/login", {
      body: { email: activeUser.email, password, rememberMe: true },
      jar: staleJar,
      method: "POST",
    });
    assert(validLogin.status === 200 && Boolean(validLogin.body.accessToken), "Login must not be blocked by stale refresh cookies.");
    assert(Boolean(staleJar.get("ecg_refresh_token")) && Boolean(staleJar.get("ecg_csrf_token")), "Login must issue refresh and CSRF cookies.");

    const restored = await request<{ accessToken: string; user: { email: string } }>("/auth/refresh", {
      jar: staleJar,
      method: "POST",
    });
    assert(restored.status === 200 && restored.body.user.email === activeUser.email, "Refresh token success must restore the session.");

    const invalidAccess = await request<{ code: string }>("/auth/me", { token: "corrupted-access-token" });
    assert(invalidAccess.status === 401, "Corrupted access tokens must be rejected once.");
    const recovered = await request<{ accessToken: string }>("/auth/refresh", { jar: staleJar, method: "POST" });
    const me = await request<{ user: { email: string } }>("/auth/me", { token: recovered.body.accessToken });
    assert(me.status === 200 && me.body.user.email === activeUser.email, "Expired/corrupted access token recovery must refresh and retry cleanly.");

    const corruptJar: CookieJar = new Map([
      ["ecg_refresh_token", "corrupted-refresh-token"],
      ["ecg_csrf_token", "corrupted-csrf-token"],
    ]);
    const badRefresh = await request<{ code: string }>("/auth/refresh", { jar: corruptJar, method: "POST" });
    assert(badRefresh.status === 401 && !corruptJar.has("ecg_refresh_token"), "Invalid refresh tokens must clear auth cookies.");

    await request<void>("/auth/logout", { jar: staleJar, method: "POST", token: recovered.body.accessToken });
    const afterLogout = await request<{ code: string }>("/auth/refresh", { jar: staleJar, method: "POST" });
    assert(afterLogout.status === 401, "Logout must revoke refresh sessions.");
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await prisma.user.deleteMany({ where: { id: { in: [activeUser.id, inactiveUser.id] } } }).catch(() => {});
    await cleanup("auth-hardening-");
    await prisma.$disconnect();
  }
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
