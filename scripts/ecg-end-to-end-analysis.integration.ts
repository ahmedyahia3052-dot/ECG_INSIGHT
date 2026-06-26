import fs from "node:fs/promises";
import path from "node:path";
import { createServer } from "node:http";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env["DATABASE_URL"] ?? "postgresql://postgres:postgres@localhost:5432/ecg_insight",
  }),
});

type Session = { token: string; user: { id: string } };
type ApiResponse = { body: unknown; status: number };

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function expectStatus(response: ApiResponse, expected: number | number[], label: string) {
  const allowed = Array.isArray(expected) ? expected : [expected];
  assert(allowed.includes(response.status), `${label}: expected ${allowed.join("/")} but got ${response.status}: ${JSON.stringify(response.body).slice(0, 500)}`);
}

async function ensureDoctor() {
  const passwordHash = await bcrypt.hash("password", 12);
  return prisma.user.upsert({
    create: {
      avatarInitials: "EV",
      email: "ecg-e2e-validator@ecginsight.test",
      emailVerified: true,
      isActive: true,
      name: "ECG E2E Validator",
      passwordHash,
      role: "DOCTOR",
      subscription: { create: { status: "ACTIVE", tier: "ENTERPRISE" } },
    },
    update: {
      emailVerified: true,
      failedLoginAttempts: 0,
      forcePasswordReset: false,
      isActive: true,
      lockedUntil: null,
      passwordChangedAt: new Date(),
      passwordHash,
      role: "DOCTOR",
    },
    where: { email: "ecg-e2e-validator@ecginsight.test" },
  });
}

async function main() {
  const stamp = Date.now();
  const invalidModelPath = path.resolve(process.cwd(), "uploads", "e2e-invalid-model.onnx");
  await fs.mkdir(path.dirname(invalidModelPath), { recursive: true });
  await fs.writeFile(invalidModelPath, Buffer.from("not-an-onnx-model"));
  process.env["AI_ONNX_MODEL_PATH"] = invalidModelPath;

  await ensureDoctor();
  const { createApp } = await import("../server/src/app");
  const server = createServer(createApp());
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  assert(address && typeof address === "object", "Server did not expose a port.");
  const apiBaseUrl = `http://127.0.0.1:${address.port}/api`;
  const apiV1BaseUrl = `http://127.0.0.1:${address.port}/api/v1`;

  async function request(baseUrl: string, requestPath: string, options: { body?: unknown; form?: FormData; method?: string; token?: string } = {}) {
    const headers = new Headers();
    if (options.token) headers.set("authorization", `Bearer ${options.token}`);
    let body: BodyInit | undefined;
    if (options.form) {
      body = options.form;
    } else if (options.body !== undefined) {
      headers.set("content-type", "application/json");
      body = JSON.stringify(options.body);
    }
    const response = await fetch(`${baseUrl}${requestPath}`, {
      body,
      headers,
      method: options.method ?? "GET",
    });
    const text = await response.text();
    let parsed: unknown = null;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      parsed = text;
    }
    return { body: parsed, status: response.status };
  }

  async function login(): Promise<Session> {
    const response = await request(apiBaseUrl, "/auth/login", {
      body: { email: "ecg-e2e-validator@ecginsight.test", password: "password", rememberMe: true },
      method: "POST",
    });
    expectStatus(response, 200, "doctor login");
    const body = response.body as { accessToken?: string; user?: { id: string } };
    assert(body.accessToken && body.user?.id, "Login response must include access token and user.");
    return { token: body.accessToken, user: body.user };
  }

  async function createPatientAndCase(token: string, suffix: string) {
    let response = await request(apiBaseUrl, "/patients", {
      body: {
        dateOfBirth: "1972-04-04",
        firstName: `E2E${suffix}`,
        gender: "male",
        lastName: "ECG",
        medicalRecordNumber: `E2E-MRN-${suffix}`,
      },
      method: "POST",
      token,
    });
    expectStatus(response, 201, "patient create");
    const patient = (response.body as { patient: { id: string } }).patient;
    response = await request(apiBaseUrl, "/cases", {
      body: { ecgType: "12-lead end-to-end ECG", patientId: patient.id, priority: "high", status: "pending" },
      method: "POST",
      token,
    });
    expectStatus(response, 201, "case create");
    const ecgCase = (response.body as { case: { id: string } }).case;
    return { ecgCase, patient };
  }

  const createdCaseIds: string[] = [];
  const createdPatientIds: string[] = [];
  try {
    const session = await login();
    const { ecgCase, patient } = await createPatientAndCase(session.token, String(stamp));
    createdCaseIds.push(ecgCase.id);
    createdPatientIds.push(patient.id);

    const missingForm = new FormData();
    missingForm.append("patientId", patient.id);
    missingForm.append("caseId", ecgCase.id);
    expectStatus(await request(apiBaseUrl, "/ecg/files/upload", { form: missingForm, method: "POST", token: session.token }), 400, "missing ECG image upload");

    const invalidForm = new FormData();
    invalidForm.append("patientId", patient.id);
    invalidForm.append("caseId", ecgCase.id);
    invalidForm.append("file", new Blob([Buffer.from("not an ECG image")], { type: "application/x-msdownload" }), "invalid-ecg.exe");
    expectStatus(await request(apiBaseUrl, "/ecg/files/upload", { form: invalidForm, method: "POST", token: session.token }), 400, "invalid ECG image upload");

    const uploadForm = new FormData();
    uploadForm.append("patientId", patient.id);
    uploadForm.append("caseId", ecgCase.id);
    uploadForm.append("source", "e2e");
    uploadForm.append("file", new Blob([Buffer.from("89504e470d0a1a0a0000000d49484452", "hex")], { type: "image/png" }), "e2e-50mm-20mm-ecg.png");
    let response = await request(apiBaseUrl, "/ecg/files/upload", { form: uploadForm, method: "POST", token: session.token });
    expectStatus(response, 201, "valid ECG image upload");
    const file = (response.body as { file: { id: string } }).file;
    const persistedFile = await prisma.eCGFile.findUnique({ where: { id: file.id } });
    assert(persistedFile, "Uploaded ECG file must persist in database.");
    await fs.access(persistedFile.storagePath);

    response = await request(apiV1BaseUrl, "/ecg/analyze-real-ai", {
      body: { caseId: ecgCase.id },
      method: "POST",
      token: session.token,
    });
    expectStatus(response, 201, "real AI analyze endpoint");
    const body = response.body as {
      analysis?: { aiVersion?: string; confidenceScore?: number; diagnosis?: string; id?: string; status?: string };
      report?: { id?: string; reportNumber?: string };
    };
    assert(body.analysis?.id && body.analysis.status === "completed", "Analysis response must be completed.");
    assert(body.analysis.diagnosis && body.analysis.diagnosis !== "Pending", "Analysis response must include diagnosis.");
    assert(typeof body.analysis.confidenceScore === "number" && body.analysis.confidenceScore > 0, "Analysis response must include confidence score.");
    assert(body.analysis.aiVersion?.includes("rule_based"), "Invalid ONNX model must gracefully fall back to rule-based engine.");
    assert(body.report?.id && body.report.reportNumber, "Real AI endpoint must generate a clinical report.");

    const persistedAnalysis = await prisma.aIAnalysis.findUnique({ where: { id: body.analysis.id } });
    assert(persistedAnalysis?.status === "COMPLETED", "AIAnalysis must persist with COMPLETED status.");
    assert(persistedAnalysis.diagnosis === body.analysis.diagnosis, "Persisted diagnosis must match API response.");
    assert(persistedAnalysis.confidenceScore === body.analysis.confidenceScore, "Persisted confidence must match API response.");
    assert(persistedAnalysis.aiVersion === body.analysis.aiVersion, "Persisted model version must match API response.");
    assert(persistedAnalysis.createdAt instanceof Date, "Persisted analysis must include inference timestamp.");

    const persistedCase = await prisma.eCGCase.findUnique({ where: { id: ecgCase.id } });
    assert(persistedCase?.aiDiagnosis === persistedAnalysis.diagnosis, "ECGCase must denormalize predicted diagnosis.");
    assert(persistedCase.confidenceScore === persistedAnalysis.confidenceScore, "ECGCase must denormalize confidence score.");
    assert(persistedCase.aiStatus === "COMPLETED", "ECGCase aiStatus must be COMPLETED.");

    const report = await prisma.clinicalReport.findUnique({ where: { id: body.report.id } });
    assert(report?.aiFindings?.includes(persistedAnalysis.diagnosis), "Clinical report must include AI diagnosis findings.");

    response = await request(apiBaseUrl, `/ai/result/${ecgCase.id}`, { token: session.token });
    expectStatus(response, 200, "AI result contract");
    assert((response.body as { analysis?: { aiVersion?: string; diagnosis?: string } }).analysis?.aiVersion === persistedAnalysis.aiVersion, "AI result route must return model version.");

    response = await request(apiBaseUrl, `/ai/explainability/${ecgCase.id}`, { token: session.token });
    expectStatus(response, 200, "AI explainability contract");
    const explainability = (response.body as { explainability?: { leadHighlights?: unknown[]; panel?: Array<{ label?: string; value?: string }> } }).explainability;
    assert(explainability?.leadHighlights?.length, "Explainability must include lead highlights.");
    assert(explainability.panel?.some((item) => item.label === "Primary Diagnosis"), "Explainability panel must include primary diagnosis.");

    const fallbackAudit = await prisma.auditLog.findFirst({
      orderBy: { createdAt: "desc" },
      where: {
        action: "AI_ANALYSIS_COMPLETED",
        caseId: ecgCase.id,
      },
    });
    assert(JSON.stringify(fallbackAudit?.metadata ?? {}).includes("Local ONNX inference failed"), "Fallback reason must be recorded in analysis audit metadata.");
  } finally {
    server.close();
    await prisma.reportVersion.deleteMany({ where: { report: { caseId: { in: createdCaseIds } } } });
    await prisma.clinicalReport.deleteMany({ where: { caseId: { in: createdCaseIds } } });
    await prisma.notification.deleteMany({ where: { caseId: { in: createdCaseIds } } });
    const files = await prisma.eCGFile.findMany({ where: { caseId: { in: createdCaseIds } } });
    await prisma.eCGAnnotation.deleteMany({ where: { ecgFileId: { in: files.map((file) => file.id) } } });
    await prisma.eCGLeadSignal.deleteMany({ where: { ecgFileId: { in: files.map((file) => file.id) } } });
    await prisma.eCGFile.deleteMany({ where: { id: { in: files.map((file) => file.id) } } });
    await prisma.aIAnalysis.deleteMany({ where: { caseId: { in: createdCaseIds } } });
    await prisma.eCGMeasurement.deleteMany({ where: { caseId: { in: createdCaseIds } } });
    await prisma.timelineEvent.deleteMany({ where: { OR: [{ caseId: { in: createdCaseIds } }, { patientId: { in: createdPatientIds } }] } });
    await prisma.auditLog.deleteMany({ where: { OR: [{ caseId: { in: createdCaseIds } }, { patientId: { in: createdPatientIds } }] } });
    await prisma.eCGCase.deleteMany({ where: { id: { in: createdCaseIds } } });
    await prisma.patient.deleteMany({ where: { id: { in: createdPatientIds } } });
    await Promise.all(files.map((file) => fs.rm(file.storagePath, { force: true }).catch(() => undefined)));
    await fs.rm(invalidModelPath, { force: true }).catch(() => undefined);
  }

  console.log("ECG end-to-end analysis integration test passed.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
