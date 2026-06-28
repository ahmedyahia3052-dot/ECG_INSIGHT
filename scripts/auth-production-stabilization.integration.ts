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
    select: { id: true, organizationId: true },
    where: { OR: [{ email: { contains: prefix } }, { name: { contains: prefix } }] },
  });
  const userIds = users.map((user) => user.id);
  const organizationIds = users.map((user) => user.organizationId).filter((id): id is string => Boolean(id));

  await prisma.oAuthIdentity.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.userSession.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.session.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.passwordHistory.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.userSubscription.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.subscription.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.auditLog.deleteMany({ where: { OR: [{ actorId: { in: userIds } }, { entityId: { in: userIds } }] } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  await prisma.organization.deleteMany({ where: { id: { in: organizationIds } } });
  await prisma.supportTicket.deleteMany({ where: { email: { contains: prefix } } });
}

async function main() {
  const stamp = `auth-prod-${Date.now()}`;
  await cleanup("auth-prod-");

  const server = createServer(createApp());
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  assert(address && typeof address === "object", "Server did not start.");
  const rootUrl = `http://127.0.0.1:${address.port}`;
  const baseUrl = `${rootUrl}/api`;

  async function request<T>(path: string, options: { body?: unknown; method?: string; root?: boolean } = {}) {
    const headers = new Headers();
    let body: BodyInit | undefined;
    if (options.body !== undefined) {
      headers.set("content-type", "application/json");
      body = JSON.stringify(options.body);
    }

    const response = await fetch(`${options.root ? rootUrl : baseUrl}${path}`, {
      body,
      headers,
      method: options.method ?? "GET",
      redirect: "manual",
    });
    const text = await response.text();
    const parsed = text ? JSON.parse(text) : null;
    return { body: parsed as T, status: response.status };
  }

  try {
    const providers = await request<{ providers: Array<{ configured: boolean; provider: string }> }>("/auth/oauth/providers");
    assert(providers.status === 200, "OAuth provider status route must be available.");
    for (const provider of ["GOOGLE", "APPLE", "MICROSOFT"]) {
      assert(providers.body.providers.some((item) => item.provider === provider), `${provider} status must be returned.`);
    }

    for (const provider of providers.body.providers.filter((item) => !item.configured)) {
      const start = await request<{ code?: string; message?: string }>(`/auth/${provider.provider.toLowerCase()}`);
      assert(start.status === 503, `${provider.provider} must return a clear unavailable status when credentials are missing.`);
      assert(start.body.message === "OAuth provider not configured by administrator", `${provider.provider} must not expose a broken route.`);
    }

    const registeredEmail = `${stamp}@ecg.test`;
    const registered = await request<{ accessToken: string; user: { accountType?: string; organizationId?: string; registrationRole?: string } }>("/auth/register", {
      body: {
        accountType: "ORGANIZATION",
        email: registeredEmail,
        name: `${stamp} Doctor`,
        organizationCity: "Boston",
        organizationCountry: "United States",
        organizationName: `${stamp} Heart Institute`,
        organizationType: "Healthcare Network",
        password: "Production123!",
        registrationRole: "Cardiologist",
        role: "doctor",
      },
      method: "POST",
    });
    assert(registered.status === 201, "Organization registration must succeed.");
    assert(registered.body.user.accountType === "ORGANIZATION", "Account type must persist on the user profile.");
    assert(registered.body.user.registrationRole === "Cardiologist", "Registration role must persist on the user profile.");
    assert(Boolean(registered.body.user.organizationId), "Organization account must link the user to an organization.");

    const persistedUser = await prisma.user.findUnique({
      include: { organization: true },
      where: { email: registeredEmail },
    });
    assert(persistedUser?.organization?.name === `${stamp} Heart Institute`, "Organization registration must create a database organization.");
    assert(persistedUser.organization.city === "Boston", "Organization city must persist.");
    assert(persistedUser.organization.country === "United States", "Organization country must persist.");

    const duplicate = await request<{ code?: string }>("/auth/register", {
      body: { email: registeredEmail, name: `${stamp} Duplicate`, password: "Production123!", role: "doctor" },
      method: "POST",
    });
    assert(duplicate.status === 409 && duplicate.body.code === "EMAIL_EXISTS", "Duplicate email registration must be blocked.");

    const oauth = await request<{ accessToken: string }>("/auth/oauth/login", {
      body: {
        email: `${stamp}-microsoft@ecg.test`,
        name: `${stamp} Microsoft`,
        provider: "MICROSOFT",
        providerUserId: `${stamp}-microsoft-id`,
        rememberMe: true,
      },
      method: "POST",
    });
    assert(oauth.status === 200 && Boolean(oauth.body.accessToken), "Social registration/login must issue an access token.");
    const identity = await prisma.oAuthIdentity.findUnique({
      where: { provider_providerUserId: { provider: "MICROSOFT", providerUserId: `${stamp}-microsoft-id` } },
    });
    assert(Boolean(identity), "Social registration must persist provider identity for future login reuse.");

    const support = await request<{ ticket: { id: string } }>("/support/tickets", {
      body: {
        email: `${stamp}-support@ecg.test`,
        message: "Production stabilization support ticket persistence check.",
        name: `${stamp} Support`,
        subject: "Authentication production QA",
      },
      method: "POST",
    });
    assert(support.status === 201, "Support ticket submission must persist.");
    const ticket = await prisma.supportTicket.findUnique({ where: { id: support.body.ticket.id } });
    assert(ticket?.subject === "Authentication production QA", "Support ticket must be stored in the database.");

    for (const endpoint of ["/health", "/health/frontend", "/health/auth", "/health/database", "/health/ai"]) {
      const health = await request<{ status?: string }>(endpoint, { root: endpoint === "/health" });
      assert(health.status < 500, `${endpoint} must return runtime health without server failure.`);
      assert(Boolean(health.body.status), `${endpoint} must include a status field.`);
    }
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await cleanup("auth-prod-");
    await prisma.$disconnect();
  }
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
