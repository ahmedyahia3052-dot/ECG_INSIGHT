import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { createApp } from "../server/src/app";

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env["DATABASE_URL"] ?? "postgresql://postgres:postgres@localhost:5432/ecg_insight",
  }),
});

const workspaceRoot = process.cwd();

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
  const patients = await prisma.patient.findMany({
    select: { id: true },
    where: { OR: [{ firstName: { contains: prefix } }, { lastName: { contains: prefix } }, { medicalRecordNumber: { contains: prefix } }] },
  });
  const patientIds = patients.map((patient) => patient.id);

  await prisma.clinicalReport.deleteMany({ where: { OR: [{ reportNumber: { contains: prefix } }, { patientId: { in: patientIds } }] } });
  await prisma.eCGCase.deleteMany({ where: { OR: [{ caseId: { contains: prefix } }, { caseNumber: { contains: prefix } }, { patientId: { in: patientIds } }] } });
  await prisma.patient.deleteMany({ where: { id: { in: patientIds } } });
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

  const registerSource = await readFile(path.join(workspaceRoot, "artifacts/ecg-insight/app/register.tsx"), "utf8");
  for (const option of [
    "Doctor",
    "Cardiologist",
    "Electrophysiologist",
    "Resident Physician",
    "Medical Student",
    "General Practitioner",
    "Nurse",
    "Technician",
    "Occupational Physician",
    "Consultant",
    "Researcher",
    "Administrator",
    "Individual Account",
    "Hospital Account",
    "Clinic Account",
    "Organization Account",
    "Corporate Account",
    "University Account",
    "Research Center Account",
  ]) {
    assert(registerSource.includes(`"${option}"`), `Registration dropdown must render option: ${option}`);
  }
  assert(
    registerSource.includes("const filtered = normalizedQuery ? safeArray(options).filter") && registerSource.includes(": safeArray(options)"),
    "Dropdowns must render all options before search filtering.",
  );

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
      const start = await request<{ code?: string; message?: string }>(`/auth/oauth/${provider.provider.toLowerCase()}`);
      assert(start.status === 503, `${provider.provider} must return a clear unavailable status when credentials are missing.`);
      assert(start.body.message === "OAuth provider not configured by administrator", `${provider.provider} must not expose a broken route.`);
    }

    const registeredEmail = `${stamp}@ecg.test`;
    const invalidOrganization = await request<{ code?: string; message?: string }>("/auth/register", {
      body: {
        accountType: "HOSPITAL",
        email: `${stamp}-invalid-org@ecg.test`,
        name: `${stamp} Invalid Organization`,
        password: "Production123!",
        registrationRole: "Electrophysiologist",
        role: "doctor",
      },
      method: "POST",
    });
    assert(invalidOrganization.status === 400, "Organization registration must validate required organization fields.");

    const registered = await request<{ accessToken: string; user: { accountType?: string; organizationId?: string; registrationRole?: string } }>("/auth/register", {
      body: {
        accountType: "RESEARCH_CENTER",
        department: "Cardiology",
        email: registeredEmail,
        employeeId: `${stamp}-EMP`,
        name: `${stamp} Doctor`,
        organizationCountry: "United States",
        organizationEmail: `${stamp}-org@ecg.test`,
        organizationName: `${stamp} Heart Institute`,
        organizationType: "Healthcare Organization",
        password: "Production123!",
        positionTitle: "Consultant Cardiologist",
        registrationRole: "Electrophysiologist",
        role: "doctor",
      },
      method: "POST",
    });
    assert(registered.status === 201, "Organization registration must succeed.");
    assert(registered.body.user.accountType === "RESEARCH_CENTER", "Account type must persist on the user profile.");
    assert(registered.body.user.registrationRole === "Electrophysiologist", "Registration role must persist on the user profile.");
    assert(Boolean(registered.body.user.organizationId), "Organization account must link the user to an organization.");

    const persistedUser = await prisma.user.findUnique({
      include: { organization: true },
      where: { email: registeredEmail },
    });
    assert(persistedUser, "Registered user must persist.");
    assert(persistedUser?.organization?.name === `${stamp} Heart Institute`, "Organization registration must create a database organization.");
    assert(persistedUser.organization.country === "United States", "Organization country must persist.");
    assert(persistedUser.organization.email === `${stamp}-org@ecg.test`, "Organization email must persist.");
    assert(persistedUser.department === "Cardiology", "Department must persist on the user profile.");
    assert(persistedUser.employeeId === `${stamp}-EMP`, "Employee ID must persist on the user profile.");
    assert(persistedUser.positionTitle === "Consultant Cardiologist", "Position/job title must persist on the user profile.");

    const searchPatient = await prisma.patient.create({
      data: {
        dateOfBirth: new Date("1980-01-01T00:00:00.000Z"),
        firstName: stamp,
        lastName: "Searchpatient",
        medicalRecordNumber: `${stamp}-MRN`,
        organizationId: persistedUser.organizationId,
      },
    });
    const searchCase = await prisma.eCGCase.create({
      data: {
        caseId: `${stamp}-CASE`,
        caseNumber: `${stamp}-CASE-NO`,
        ecgType: "12_LEAD",
        finalDiagnosis: `${stamp} sinus rhythm`,
        patientId: searchPatient.id,
        uploadedById: persistedUser.id,
      },
    });
    await prisma.clinicalReport.create({
      data: {
        acquisitionDate: new Date(),
        authorId: persistedUser.id,
        caseId: searchCase.id,
        differentialDiagnosis: ["Normal sinus rhythm"],
        finalPhysicianImpression: `${stamp} searchable clinical report`,
        patientId: searchPatient.id,
        physicianName: persistedUser.name,
        recommendations: ["Routine follow-up"],
        reportNumber: `${stamp}-REPORT`,
        urgentActions: [],
      },
    });

    const search = await request<{ results: Array<{ type: string; url: string }>; total: number }>(`/search?q=${encodeURIComponent(stamp)}`, {
      method: "GET",
    });
    assert(search.status === 401, "Global dashboard search must require authentication.");
    const authenticatedSearch = await fetch(`${baseUrl}/search?q=${encodeURIComponent(stamp)}`, {
      headers: { authorization: `Bearer ${registered.body.accessToken}` },
    });
    const authenticatedSearchPayload = await authenticatedSearch.json() as { results: Array<{ type: string; url: string }>; total: number };
    assert(authenticatedSearch.status === 200, "Authenticated dashboard search must succeed.");
    for (const type of ["patient", "case", "report", "organization", "doctor"]) {
      assert(authenticatedSearchPayload.results.some((result) => result.type === type), `Dashboard search must include ${type} results.`);
    }
    assert(authenticatedSearchPayload.results.every((result) => result.url.startsWith("/")), "Dashboard search results must include navigable app URLs.");

    const duplicate = await request<{ code?: string }>("/auth/register", {
      body: { email: registeredEmail, name: `${stamp} Duplicate`, password: "Production123!", role: "doctor" },
      method: "POST",
    });
    assert(duplicate.status === 409 && duplicate.body.code === "EMAIL_EXISTS", "Duplicate email registration must be blocked.");

    const linkedOauth = await request<{ accessToken: string }>("/auth/oauth/login", {
      body: {
        email: registeredEmail,
        name: `${stamp} Linked Google`,
        provider: "GOOGLE",
        providerUserId: `${stamp}-google-link-id`,
        rememberMe: true,
      },
      method: "POST",
    });
    assert(linkedOauth.status === 200 && Boolean(linkedOauth.body.accessToken), "Social login must link to an existing email account.");
    const linkedIdentity = await prisma.oAuthIdentity.findUnique({
      where: { provider_providerUserId: { provider: "GOOGLE", providerUserId: `${stamp}-google-link-id` } },
    });
    assert(linkedIdentity?.userId === persistedUser.id, "Existing account email must be reused for OAuth linking.");

    const profileUpdate = await request<{ user: { department?: string; employeeId?: string; institution?: string } }>("/auth/me", {
      body: { department: "Electrophysiology", employeeId: `${stamp}-EMP-2`, institution: `${stamp} Updated Institute`, organizationEmail: `${stamp}-updated-org@ecg.test`, positionTitle: "Director of ECG" },
      method: "PATCH",
    });
    assert(profileUpdate.status === 401, "Profile update must remain protected without authentication.");

    const authenticatedProfileUpdate = await fetch(`${baseUrl}/auth/me`, {
      body: JSON.stringify({ department: "Electrophysiology", employeeId: `${stamp}-EMP-2`, institution: `${stamp} Updated Institute`, organizationEmail: `${stamp}-updated-org@ecg.test`, positionTitle: "Director of ECG" }),
      headers: { authorization: `Bearer ${registered.body.accessToken}`, "content-type": "application/json" },
      method: "PATCH",
    });
    const authenticatedProfilePayload = await authenticatedProfileUpdate.json() as { user: { department?: string; employeeId?: string; institution?: string; organizationEmail?: string; positionTitle?: string } };
    assert(authenticatedProfileUpdate.status === 200, "Authenticated profile update must save organization metadata.");
    assert(authenticatedProfilePayload.user.department === "Electrophysiology", "Edited department must persist.");
    assert(authenticatedProfilePayload.user.employeeId === `${stamp}-EMP-2`, "Edited employee ID must persist.");
    assert(authenticatedProfilePayload.user.organizationEmail === `${stamp}-updated-org@ecg.test`, "Edited organization email must persist.");
    assert(authenticatedProfilePayload.user.positionTitle === "Director of ECG", "Edited position title must persist.");

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
