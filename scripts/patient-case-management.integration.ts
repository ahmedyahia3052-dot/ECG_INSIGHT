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
type ApiResponse = { body: unknown; status: number };

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function expectStatus(response: ApiResponse, expected: number | number[], label: string) {
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
    ensureDoctor("patient-case-doctor@ecginsight.test", "Patient Case Doctor"),
    ensureDoctor("patient-case-other@ecginsight.test", "Patient Case Other"),
  ]);

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
    return { body: parsed, status: response.status };
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

  const createdCaseIds: string[] = [];
  const createdPatientIds: string[] = [];
  try {
    const doctor = await login("patient-case-doctor@ecginsight.test");
    const other = await login("patient-case-other@ecginsight.test");
    const stamp = Date.now();

    let response = await request("/patients", {
      body: {
        allergies: "Penicillin",
        cardiovascularHistory: "Prior exertional chest pain, family history of CAD.",
        company: "Enterprise Oil",
        contractorName: "North Field Contractor",
        dateOfBirth: "1980-05-20",
        departmentName: "Safety Operations",
        email: `patient-case-${stamp}@ecg.test`,
        employeeId: `EMP-${stamp}`,
        firstName: "Enterprise",
        gender: "male",
        jobTitle: "Crane Operator",
        lastName: "Patient",
        medicalHistory: "Hypertension and dyslipidemia.",
        medicalRecordNumber: `PCM-MRN-${stamp}`,
        medications: "Amlodipine; Atorvastatin",
        nationalId: `PCM-NID-${stamp}`,
        notes: "Requires annual occupational ECG surveillance.",
        phone: "+201000000000",
        smokingStatus: "former",
      },
      method: "POST",
      token: doctor.token,
    });
    expectStatus(response, 201, "enterprise patient create");
    const patient = (response.body as { patient: { cardiovascularHistory?: string; employeeId?: string; fullName?: string; id: string; jobTitle?: string } }).patient;
    createdPatientIds.push(patient.id);
    assert(patient.employeeId === `EMP-${stamp}`, "Patient employeeId must persist.");
    assert(patient.fullName === "Enterprise Patient", "Patient fullName must be computed.");
    assert(patient.cardiovascularHistory?.includes("family history"), "Patient cardiovascularHistory must persist.");
    assert(patient.jobTitle === "Crane Operator", "Patient jobTitle must persist.");

    response = await request(`/patients?q=Enterprise&employeeId=EMP-${stamp}&status=active`, { token: doctor.token });
    expectStatus(response, 200, "patient list search/filter");
    assert((response.body as { total?: number }).total === 1, "Patient search/filter must return created patient.");

    response = await request(`/patients/${patient.id}`, { token: doctor.token });
    expectStatus(response, 200, "patient details");
    assert((response.body as { patient: { cardiovascularHistory?: string } }).patient.cardiovascularHistory?.includes("Prior exertional"), "Patient details must include cardiovascular history.");
    expectStatus(await request(`/patients/${patient.id}`, { token: other.token }), 403, "patient RBAC isolation");

    response = await request("/cases", {
      body: {
        aiModelVersion: "contract-test-model-v1",
        confidence: 88,
        diagnosis: "Atrial Fibrillation",
        ecgImage: "/uploads/test-ecg.png",
        ecgType: "12-lead occupational ECG",
        explainabilityData: { leadHighlights: [{ lead: "II", finding: "irregular rhythm" }] },
        interpretation: "Irregularly irregular rhythm requiring review.",
        patientId: patient.id,
        priority: "high",
        recommendations: "Doctor review and occupational fitness assessment.",
        status: "uploaded",
      },
      method: "POST",
      token: doctor.token,
    });
    expectStatus(response, 201, "enterprise ECG case create");
    const ecgCase = (response.body as { case: { aiModelVersion?: string; confidence?: number; diagnosis?: string; ecgImage?: string; explainabilityData?: unknown; id: string; interpretation?: string; patientId: string; uploadedByDoctorId?: string } }).case;
    createdCaseIds.push(ecgCase.id);
    assert(ecgCase.patientId === patient.id, "ECG case must link to patient.");
    assert(ecgCase.uploadedByDoctorId === doctor.user.id, "ECG case must expose uploadedByDoctorId.");
    assert(ecgCase.diagnosis === "Atrial Fibrillation", "ECG case diagnosis alias must serialize.");
    assert(ecgCase.confidence === 88, "ECG case confidence alias must serialize.");
    assert(ecgCase.aiModelVersion === "contract-test-model-v1", "ECG case model version must serialize.");
    assert(ecgCase.ecgImage === "/uploads/test-ecg.png", "ECG case image alias must serialize.");
    assert(ecgCase.explainabilityData, "ECG case explainability data must serialize.");

    response = await request(`/patients/${patient.id}/ecg-history`, { token: doctor.token });
    expectStatus(response, 200, "patient ECG history route");
    assert((response.body as { cases: Array<{ id: string }> }).cases.some((item) => item.id === ecgCase.id), "Patient ECG history must include created case.");

    response = await request(`/cases/${ecgCase.id}`, { token: doctor.token });
    expectStatus(response, 200, "ECG case details route");
    const caseDetails = (response.body as { case: { diagnosis?: string; interpretation?: string; patient: { id: string } } }).case;
    assert(caseDetails.patient.id === patient.id, "ECG case details must include patient record.");
    assert(caseDetails.interpretation?.includes("Irregularly irregular"), "ECG case details must include interpretation.");
    expectStatus(await request(`/cases/${ecgCase.id}`, { token: other.token }), 403, "case RBAC isolation");

    response = await request(`/patients/${patient.id}`, {
      body: { cardiovascularHistory: "Updated CAD surveillance plan.", phone: "+201111111111" },
      method: "PATCH",
      token: doctor.token,
    });
    expectStatus(response, 200, "patient update");
    assert((response.body as { patient: { cardiovascularHistory?: string; phone?: string } }).patient.cardiovascularHistory === "Updated CAD surveillance plan.", "Patient cardiovascular history update must persist.");
  } finally {
    server.close();
    await prisma.notification.deleteMany({ where: { caseId: { in: createdCaseIds } } });
    await prisma.reportVersion.deleteMany({ where: { report: { caseId: { in: createdCaseIds } } } });
    await prisma.clinicalReport.deleteMany({ where: { caseId: { in: createdCaseIds } } });
    await prisma.aIAnalysis.deleteMany({ where: { caseId: { in: createdCaseIds } } });
    await prisma.eCGMeasurement.deleteMany({ where: { caseId: { in: createdCaseIds } } });
    await prisma.eCGFile.deleteMany({ where: { caseId: { in: createdCaseIds } } });
    await prisma.timelineEvent.deleteMany({ where: { OR: [{ caseId: { in: createdCaseIds } }, { patientId: { in: createdPatientIds } }] } });
    await prisma.auditLog.deleteMany({ where: { OR: [{ caseId: { in: createdCaseIds } }, { patientId: { in: createdPatientIds } }] } });
    await prisma.eCGCase.deleteMany({ where: { id: { in: createdCaseIds } } });
    await prisma.patient.deleteMany({ where: { id: { in: createdPatientIds } } });
  }

  console.log("Patient and ECG case management integration test passed.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
