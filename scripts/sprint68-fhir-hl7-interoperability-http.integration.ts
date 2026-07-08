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
  const stamp = integrationStamp("sprint68-interop");
  const doctor = await ensureDoctor(`sprint68-doctor-${stamp}@ecginsight.test`, "Sprint 68 Doctor");

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
      dateOfBirth: "1980-05-20",
      firstName: "Interop",
      gender: "male",
      lastName: `Patient-${stamp}`,
      medicalRecordNumber: `MRN-S68-${stamp}`,
    },
    method: "POST",
    token,
  });
  assert(patientResponse.status === 201, `Patient create failed: ${JSON.stringify(patientResponse.body)}`);
  const patientId = (patientResponse.body as { patient?: { id: string } }).patient?.id;
  assert(patientId, "Missing patient id.");

  const created = await request("/cases", {
    body: {
      acquisitionDate: "2025-03-01T09:00:00.000Z",
      doctorDiagnosis: "Normal sinus rhythm",
      ecgType: "12-lead",
      heartRate: 68,
      patientId,
      prInterval: 158,
      qrsDuration: 88,
      qtInterval: 372,
      qtcInterval: 405,
      rhythm: "Sinus rhythm",
    },
    method: "POST",
    token,
  });
  assert(created.status === 201, `Case create failed: ${JSON.stringify(created.body)}`);
  const caseId = (created.body as { case?: { id: string } }).case?.id;
  assert(caseId, "Missing case id.");

  const systems = await request("/interop/systems", { token });
  assert(systems.status === 200, `Systems failed: ${JSON.stringify(systems.body)}`);
  assert((systems.body as { systems?: unknown[] }).systems?.length, "Expected external systems.");

  const fhirExport = await request(`/interop/fhir/export/${caseId}`, { token });
  assert(fhirExport.status === 200, `FHIR export failed: ${JSON.stringify(fhirExport.body)}`);
  const bundle = (fhirExport.body as { bundle?: { entry?: unknown[] } }).bundle;
  assert(bundle?.entry && bundle.entry.length >= 5, "Expected multi-resource FHIR bundle.");

  const hl7Export = await request(`/interop/hl7/export/${caseId}`, { token });
  assert(hl7Export.status === 200, `HL7 export failed: ${JSON.stringify(hl7Export.body)}`);
  const hl7Message = (hl7Export.body as { export?: { hl7Message?: string } }).export?.hl7Message;
  assert(hl7Message?.includes("MSH|"), "Expected HL7 MSH segment.");

  const fhirImport = await request("/interop/fhir/import", {
    body: { payload: bundle },
    method: "POST",
    token,
  });
  assert(fhirImport.status === 201, `FHIR import failed: ${JSON.stringify(fhirImport.body)}`);

  const hl7Import = await request("/interop/hl7/import", {
    body: { rawMessage: hl7Message },
    method: "POST",
    token,
  });
  assert(hl7Import.status === 201, `HL7 import failed: ${JSON.stringify(hl7Import.body)}`);

  const logs = await request("/interop/logs", { token });
  assert(logs.status === 200, `Logs failed: ${JSON.stringify(logs.body)}`);
  assert(((logs.body as { logs?: unknown[] }).logs ?? []).length >= 1, "Expected interoperability logs.");

  await prisma.interoperabilityLog.deleteMany({ where: { patientId } }).catch(() => undefined);
  await prisma.fHIRAudit.deleteMany({ where: { patientId } }).catch(() => undefined);
  await prisma.hL7Message.deleteMany({ where: { patientId } }).catch(() => undefined);
  await prisma.fHIRExportJob.deleteMany({ where: { patientId } }).catch(() => undefined);
  await prisma.fHIRImportJob.deleteMany({ where: { patientId } }).catch(() => undefined);
  await prisma.eCGCase.deleteMany({ where: { id: caseId } }).catch(() => undefined);
  await prisma.patient.deleteMany({ where: { id: patientId } }).catch(() => undefined);

  server.close();
  console.log("Sprint 68 FHIR/HL7 interoperability HTTP integration: PASS");
}

runIntegrationMain(main);
