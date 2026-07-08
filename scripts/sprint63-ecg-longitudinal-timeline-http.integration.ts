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
  const stamp = integrationStamp("sprint63-longitudinal");
  const doctor = await ensureDoctor(`sprint63-doctor-${stamp}@ecginsight.test`, "Sprint 63 Doctor");

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
      dateOfBirth: "1975-03-12",
      firstName: "Longitudinal",
      gender: "male",
      lastName: `Patient-${stamp}`,
      medicalRecordNumber: `MRN-S63-${stamp}`,
    },
    method: "POST",
    token,
  });
  assert(patientResponse.status === 201, `Patient create failed: ${JSON.stringify(patientResponse.body)}`);
  const patientId = (patientResponse.body as { patient?: { id: string } }).patient?.id;
  assert(patientId, "Missing patient id.");

  async function createCase(heartRate: number, qtcInterval: number, diagnosis: string, acquisitionDate: string) {
    const created = await request("/cases", {
      body: {
        acquisitionDate,
        ecgType: "12-lead",
        heartRate,
        patientId,
        qtcInterval,
        doctorDiagnosis: diagnosis,
        rhythm: heartRate > 85 ? "Atrial fibrillation" : "Sinus rhythm",
      },
      method: "POST",
      token,
    });
    assert(created.status === 201, `Case create failed: ${JSON.stringify(created.body)}`);
    return (created.body as { case?: { id: string } }).case?.id;
  }

  const caseA = await createCase(72, 410, "Normal ECG", "2024-01-10T10:00:00.000Z");
  const caseB = await createCase(96, 465, "Atrial fibrillation with prolonged QTc", "2025-06-15T10:00:00.000Z");
  assert(caseA && caseB, "Missing case ids.");

  const timeline = await request(`/patients/${patientId}/timeline?sync=true`, { token });
  assert(timeline.status === 200, `Timeline failed: ${JSON.stringify(timeline.body)}`);
  const timelineRows = (timeline.body as { timeline?: unknown[] }).timeline ?? [];
  assert(timelineRows.length >= 2, "Expected at least two timeline entries.");

  const history = await request(`/cases/${caseB}/history`, { token });
  assert(history.status === 200, `History failed: ${JSON.stringify(history.body)}`);
  const historyRows = (history.body as { history?: unknown[] }).history ?? [];
  assert(historyRows.length >= 2, "Expected chronological history.");

  const previous = await request(`/cases/${caseB}/previous`, { token });
  assert(previous.status === 200, `Previous failed: ${JSON.stringify(previous.body)}`);
  assert((previous.body as { previous?: { caseId?: string } }).previous?.caseId === caseA, "Expected previous case A.");

  const next = await request(`/cases/${caseA}/next`, { token });
  assert(next.status === 200, `Next failed: ${JSON.stringify(next.body)}`);
  assert((next.body as { next?: { caseId?: string } }).next?.caseId === caseB, "Expected next case B.");

  const compare = await request(`/cases/${caseB}/compare/${caseA}`, { token });
  assert(compare.status === 200, `Compare failed: ${JSON.stringify(compare.body)}`);
  const comparison = (compare.body as { comparison?: { trendSummary?: unknown[]; followUpSummary?: string } }).comparison;
  assert(comparison?.trendSummary && comparison.trendSummary.length > 0, "Expected trend summary.");
  assert(comparison.followUpSummary?.includes("Compared with previous ECG"), "Expected follow-up summary prefix.");

  await prisma.eCGTrendSnapshot.deleteMany({ where: { patientId } }).catch(() => undefined);
  await prisma.eCGComparisonHistory.deleteMany({ where: { patientId } }).catch(() => undefined);
  await prisma.eCGFollowUp.deleteMany({ where: { patientId } }).catch(() => undefined);
  await prisma.eCGTimeline.deleteMany({ where: { patientId } }).catch(() => undefined);
  await prisma.eCGCase.deleteMany({ where: { patientId } }).catch(() => undefined);
  await prisma.patient.deleteMany({ where: { id: patientId } }).catch(() => undefined);

  server.close();
  console.log("Sprint 63 ECG longitudinal timeline HTTP integration: PASS");
}

runIntegrationMain(main);
