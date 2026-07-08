import { createServer } from "node:http";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { createApp } from "../server/src/app";
import { runIntegrationMain } from "./finish-integration";
import { integrationStamp } from "./integration/test-isolation";

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env["DATABASE_URL"] ?? "postgresql://postgres:postgres@localhost:5432/ecg_insight",
  }),
});

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function ensureDoctor(email: string, name: string) {
  const passwordHash = await bcrypt.hash("password", 12);
  return prisma.user.upsert({
    create: {
      avatarInitials: name.split(" ").map((part) => part[0]).join("").slice(0, 2),
      email,
      emailVerified: true,
      isActive: true,
      name,
      passwordHash,
      role: "DOCTOR",
      subscription: { create: { status: "ACTIVE", tier: "ENTERPRISE" } },
    },
    update: {
      emailVerified: true,
      isActive: true,
      passwordHash,
      role: "DOCTOR",
    },
    where: { email },
  });
}

async function main() {
  const stamp = integrationStamp("sprint60-case-management");
  const doctor = await ensureDoctor(`sprint60-doctor-${stamp}@ecginsight.test`, "Sprint 60 Doctor");

  const server = createServer(createApp());
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  assert(address && typeof address === "object", "Server did not expose a port.");
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
    let parsed: unknown = null;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      parsed = text;
    }
    return { body: parsed, status: response.status };
  }

  const login = await request("/auth/login", {
    body: { email: doctor.email, password: "password", rememberMe: true },
    method: "POST",
  });
  assert(login.status === 200, `Login failed: ${JSON.stringify(login.body)}`);
  const token = (login.body as { accessToken?: string }).accessToken;
  assert(token, "Missing access token.");

  const patientResponse = await request("/patients", {
    body: {
      dateOfBirth: "1980-01-01",
      firstName: "Sprint60",
      gender: "male",
      lastName: stamp,
      medicalRecordNumber: `MRN-${stamp}`,
    },
    method: "POST",
    token,
  });
  assert(patientResponse.status === 201, `Create patient failed: ${JSON.stringify(patientResponse.body)}`);
  const patientId = (patientResponse.body as { patient?: { id: string } }).patient?.id;
  assert(patientId, "Missing patient id.");

  const created = await request("/cases", {
    body: { ecgType: "12-lead", patientId, priority: "medium", status: "uploaded" },
    method: "POST",
    token,
  });
  assert(created.status === 201, `Create case failed: ${JSON.stringify(created.body)}`);
  const caseId = (created.body as { case?: { id: string } }).case?.id;
  assert(caseId, "Missing created case id.");

  const history = await request(`/cases/${caseId}/management-history`, { token });
  assert(history.status === 200, `History failed: ${JSON.stringify(history.body)}`);
  const historyRows = (history.body as { history?: unknown[] }).history ?? [];
  assert(historyRows.length >= 1, "Expected case history after create.");

  const comment = await request(`/cases/${caseId}/comments`, {
    body: { body: "Sprint 60 review comment", isClinical: true },
    method: "POST",
    token,
  });
  assert(comment.status === 201, `Comment failed: ${JSON.stringify(comment.body)}`);

  const archive = await request(`/cases/${caseId}/archive`, {
    body: { reason: "Sprint 60 archive validation" },
    method: "POST",
    token,
  });
  assert(archive.status === 200, `Archive failed: ${JSON.stringify(archive.body)}`);
  assert((archive.body as { case?: { managementStatus?: string } }).case?.managementStatus === "archived", "Expected archived management status.");

  const restore = await request(`/cases/${caseId}/restore`, {
    body: { managementStatus: "reviewed", reason: "Sprint 60 restore validation", status: "reviewed" },
    method: "POST",
    token,
  });
  assert(restore.status === 200, `Restore failed: ${JSON.stringify(restore.body)}`);
  assert((restore.body as { case?: { managementStatus?: string } }).case?.managementStatus === "reviewed", "Expected reviewed management status.");

  const audit = await request(`/cases/${caseId}/audit`, { token });
  assert(audit.status === 200, `Audit failed: ${JSON.stringify(audit.body)}`);

  await prisma.caseComment.deleteMany({ where: { caseId } }).catch(() => undefined);
  await prisma.caseHistory.deleteMany({ where: { caseId } }).catch(() => undefined);
  await prisma.caseAudit.deleteMany({ where: { caseId } }).catch(() => undefined);
  await prisma.caseVersion.deleteMany({ where: { caseId } }).catch(() => undefined);
  await prisma.caseAttachment.deleteMany({ where: { caseId } }).catch(() => undefined);
  await prisma.eCGCase.deleteMany({ where: { id: caseId } }).catch(() => undefined);
  await prisma.patient.deleteMany({ where: { id: patientId } }).catch(() => undefined);

  server.close();
  console.log("Sprint 60 ECG case management HTTP integration: PASS");
}

runIntegrationMain(main);
