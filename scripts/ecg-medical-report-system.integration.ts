import fs from "node:fs/promises";
import { createServer } from "node:http";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { createApp } from "../server/src/app";

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env["DATABASE_URL"] ?? "postgresql://postgres:postgres@localhost:5432/ecg_insight",
  }),
});

type Session = { token: string; user: { id: string } };
type ApiResponse = { body: unknown; headers: Headers; status: number; text: string };

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function expectStatus(response: Pick<ApiResponse, "body" | "status">, expected: number | number[], label: string) {
  const allowed = Array.isArray(expected) ? expected : [expected];
  assert(allowed.includes(response.status), `${label}: expected ${allowed.join("/")} but got ${response.status}: ${JSON.stringify(response.body).slice(0, 500)}`);
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
      failedLoginAttempts: 0,
      forcePasswordReset: false,
      isActive: true,
      lockedUntil: null,
      passwordChangedAt: new Date(),
      passwordHash,
      role: "DOCTOR",
    },
    where: { email },
  });
}

async function main() {
  await Promise.all([
    ensureDoctor("report-system-doctor@ecginsight.test", "Report System Doctor"),
    ensureDoctor("report-system-other@ecginsight.test", "Report System Other"),
  ]);

  const server = createServer(createApp());
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  assert(address && typeof address === "object", "Server did not expose a port.");
  const baseUrl = `http://127.0.0.1:${address.port}/api`;

  async function request(path: string, options: { body?: unknown; method?: string; token?: string } = {}): Promise<ApiResponse> {
    const headers = new Headers();
    if (options.token) headers.set("authorization", `Bearer ${options.token}`);
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
    const text = await response.text();
    let parsed: unknown = null;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      parsed = text;
    }
    return { body: parsed, headers: response.headers, status: response.status, text };
  }

  async function login(email: string): Promise<Session> {
    const response = await request("/auth/login", {
      body: { email, password: "password", rememberMe: true },
      method: "POST",
    });
    expectStatus(response, 200, `login ${email}`);
    const body = response.body as { accessToken?: string; user?: { id: string } };
    assert(body.accessToken && body.user?.id, "Login must return access token and user.");
    return { token: body.accessToken, user: body.user };
  }

  async function createPatientAndCase(token: string, stamp: number) {
    let response = await request("/patients", {
      body: {
        cardiovascularHistory: "Known ischemic heart disease under surveillance.",
        company: "ECG Insight Medical",
        dateOfBirth: "1975-01-15",
        departmentName: "Operations",
        employeeId: `REPORT-EMP-${stamp}`,
        firstName: "Report",
        gender: "male",
        jobTitle: "Field Operator",
        lastName: "Patient",
        medicalHistory: "Hypertension and intermittent palpitations.",
        medicalRecordNumber: `REPORT-MRN-${stamp}`,
        medications: "Bisoprolol; Aspirin",
        smokingStatus: "former",
      },
      method: "POST",
      token,
    });
    expectStatus(response, 201, "report patient create");
    const patient = (response.body as { patient: { id: string } }).patient;

    response = await request("/cases", {
      body: {
        clinicalNotes: "Annual occupational ECG with palpitations.",
        ecgType: "12-lead enterprise report ECG",
        patientId: patient.id,
        priority: "high",
        status: "pending",
      },
      method: "POST",
      token,
    });
    expectStatus(response, 201, "report case create");
    const ecgCase = (response.body as { case: { id: string } }).case;
    return { ecgCase, patient };
  }

  const createdCaseIds: string[] = [];
  const createdPatientIds: string[] = [];
  try {
    const doctor = await login("report-system-doctor@ecginsight.test");
    const other = await login("report-system-other@ecginsight.test");
    const { ecgCase, patient } = await createPatientAndCase(doctor.token, Date.now());
    createdCaseIds.push(ecgCase.id);
    createdPatientIds.push(patient.id);

    let response = await request(`/ai/analyze/${ecgCase.id}`, { method: "POST", token: doctor.token });
    expectStatus(response, 202, "analysis starts and auto-generates report");

    let report = null as Awaited<ReturnType<typeof prisma.clinicalReport.findFirst>>;
    for (let attempt = 0; attempt < 30; attempt += 1) {
      report = await prisma.clinicalReport.findFirst({ orderBy: { createdAt: "desc" }, where: { caseId: ecgCase.id } });
      if (report?.pdfStoragePath && report.htmlStoragePath && report.verificationToken && report.qrCodeData) break;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    assert(report?.id, "Every ECG analysis must automatically generate a clinical report.");
    assert(report.pdfStoragePath && report.htmlStoragePath, "Report artifacts must be securely stored.");
    assert(report.verificationToken && report.verificationUrl && report.qrCodeData, "Report must include QR verification metadata.");
    await fs.access(report.pdfStoragePath);
    await fs.access(report.htmlStoragePath);

    response = await request(`/reports/${report.id}`, { token: doctor.token });
    expectStatus(response, 200, "report detail access");
    const detail = (response.body as { report: { pdfStoragePath?: string; htmlStoragePath?: string; qrCodeData?: string; verificationUrl?: string } }).report;
    assert(detail.pdfStoragePath && detail.htmlStoragePath && detail.qrCodeData && detail.verificationUrl, "Report detail must expose storage and verification metadata.");
    expectStatus(await request(`/reports/${report.id}`, { token: other.token }), 403, "report RBAC isolation");

    response = await request(`/reports/${report.id}/pdf`, { token: doctor.token });
    expectStatus(response, 200, "download PDF");
    assert(response.headers.get("content-type")?.includes("application/pdf"), "PDF endpoint must return application/pdf.");
    assert(response.text.startsWith("%PDF-1.4"), "PDF response must be a PDF document.");

    response = await request(`/reports/${report.id}/html`, { token: doctor.token });
    expectStatus(response, 200, "printable HTML preview");
    assert(response.text.includes("Professional ECG Medical Report"), "HTML report must contain professional report title.");
    assert(response.text.includes("Clinical Disclaimer"), "HTML report must contain clinical disclaimer.");
    assert(response.text.includes("Cardiovascular History"), "HTML report must contain cardiovascular history.");
    assert(response.text.includes("QR verification code"), "HTML report must include QR verification image.");

    response = await request(`/reports/${report.id}/print`, { token: doctor.token });
    expectStatus(response, 200, "print report");
    assert(response.text.includes("window.print"), "Print endpoint must include print activation script.");

    response = await request(`/reports/${report.id}/email`, {
      body: { message: "Secure report delivery.", recipient: "recipient@example.com" },
      method: "POST",
      token: doctor.token,
    });
    expectStatus(response, 202, "email report");
    assert((response.body as { emailLog?: { id?: string; status?: string } }).emailLog?.status === "queued", "Email report endpoint must queue an email log.");

    response = await request(`/reports/verify/${encodeURIComponent(report.reportNumber)}?token=${encodeURIComponent(report.verificationToken)}`);
    expectStatus(response, 200, "verify report by QR token");
    assert((response.body as { verification?: { reportNumber?: string; verified?: boolean } }).verification?.verified === true, "Verification endpoint must verify valid QR/report token.");

    response = await request(`/reports/verify/${encodeURIComponent(report.reportNumber)}?token=invalid-token`);
    expectStatus(response, 200, "reject invalid QR token");
    assert((response.body as { verification?: { verified?: boolean } }).verification?.verified === false, "Verification endpoint must reject invalid tokens.");
  } finally {
    server.close();
    const reports = await prisma.clinicalReport.findMany({ where: { caseId: { in: createdCaseIds } } });
    const artifactPaths = reports.flatMap((report) => [report.pdfStoragePath, report.htmlStoragePath].filter(Boolean) as string[]);
    await prisma.emailLog.deleteMany({ where: { reportId: { in: reports.map((report) => report.id) } } });
    await prisma.reportVersion.deleteMany({ where: { reportId: { in: reports.map((report) => report.id) } } });
    await prisma.clinicalReport.deleteMany({ where: { id: { in: reports.map((report) => report.id) } } });
    await prisma.notification.deleteMany({ where: { caseId: { in: createdCaseIds } } });
    await prisma.aIAnalysis.deleteMany({ where: { caseId: { in: createdCaseIds } } });
    await prisma.eCGMeasurement.deleteMany({ where: { caseId: { in: createdCaseIds } } });
    await prisma.eCGFile.deleteMany({ where: { caseId: { in: createdCaseIds } } });
    await prisma.timelineEvent.deleteMany({ where: { OR: [{ caseId: { in: createdCaseIds } }, { patientId: { in: createdPatientIds } }] } });
    await prisma.auditLog.deleteMany({ where: { OR: [{ caseId: { in: createdCaseIds } }, { patientId: { in: createdPatientIds } }] } });
    await prisma.eCGCase.deleteMany({ where: { id: { in: createdCaseIds } } });
    await prisma.patient.deleteMany({ where: { id: { in: createdPatientIds } } });
    await Promise.all(artifactPaths.map((artifactPath) => fs.rm(artifactPath, { force: true }).catch(() => undefined)));
  }

  console.log("ECG medical report system integration test passed.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
