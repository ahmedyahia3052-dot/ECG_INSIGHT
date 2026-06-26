import { createServer } from "node:http";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { createApp } from "../server/src/app";
import { ensureClinicalReportForCase } from "../server/src/modules/reports/reports.service";

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env["DATABASE_URL"] ?? "postgresql://postgres:postgres@localhost:5432/ecg_insight",
  }),
});

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function expectStatus(response: { body: unknown; status: number }, expected: number, label: string) {
  assert(response.status === expected, `${label}: expected ${expected} but got ${response.status}: ${JSON.stringify(response.body).slice(0, 500)}`);
}

async function main() {
  const stamp = Date.now();
  const password = "password";
  const passwordHash = await bcrypt.hash(password, 12);
  const admin = await prisma.user.create({
    data: {
      avatarInitials: "OC",
      email: `sprint27-${stamp}@ecginsight.test`,
      emailVerified: true,
      isActive: true,
      name: "Sprint 27 Admin",
      passwordHash,
      role: "ADMIN",
      subscription: { create: { status: "ACTIVE", tier: "ENTERPRISE" } },
    },
  });

  const server = createServer(createApp());
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  assert(address && typeof address === "object", "Server did not expose a port.");
  const baseUrl = `http://127.0.0.1:${address.port}/api/v1`;

  async function request(route: string, options: { body?: unknown; method?: string; token?: string } = {}) {
    const headers = new Headers();
    if (options.token) headers.set("authorization", `Bearer ${options.token}`);
    let body: BodyInit | undefined;
    if (options.body !== undefined) {
      headers.set("content-type", "application/json");
      body = JSON.stringify(options.body);
    }
    const response = await fetch(`${baseUrl}${route}`, { body, headers, method: options.method ?? "GET" });
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
    body: { email: admin.email, password, rememberMe: true },
    method: "POST",
  });
  expectStatus(login, 200, "admin login");
  const token = (login.body as { accessToken?: string }).accessToken;
  assert(token, "Login must return access token.");

  let response = await request("/organizations", {
    body: { name: `Sprint 27 Organization ${stamp}`, status: "active", type: "company" },
    method: "POST",
    token,
  });
  expectStatus(response, 201, "create organization");
  const organization = (response.body as { organization: { id: string } }).organization;

  response = await request("/companies", {
    body: {
      email: "company@sprint27.test",
      name: `Sprint 27 Company ${stamp}`,
      organizationId: organization.id,
      registrationNumber: `REG-${stamp}`,
      status: "active",
    },
    method: "POST",
    token,
  });
  expectStatus(response, 201, "create company");
  const company = (response.body as { company: { id: string; organizationId: string } }).company;
  assert(company.organizationId === organization.id, "Company must link to organization.");

  response = await request("/departments", {
    body: { companyId: company.id, name: "Safety Critical Operations", organizationId: organization.id },
    method: "POST",
    token,
  });
  expectStatus(response, 201, "create department");
  const department = (response.body as { department: { companyId?: string; id: string } }).department;
  assert(department.companyId === company.id, "Department must link to company.");

  response = await request("/contractors", {
    body: { companyId: company.id, name: `Sprint 27 Contractor ${stamp}`, organizationId: organization.id, status: "active" },
    method: "POST",
    token,
  });
  expectStatus(response, 201, "create contractor");
  const contractor = (response.body as { contractor: { companyId?: string; id: string } }).contractor;
  assert(contractor.companyId === company.id, "Contractor must link to company.");

  response = await request("/employees", {
    body: {
      companyId: company.id,
      contractorCompanyId: contractor.id,
      criticalJob: true,
      dateOfBirth: "1985-02-03",
      departmentId: department.id,
      drivingDuty: true,
      employeeId: `EMP-${stamp}`,
      fullName: "Sprint 27 Driver",
      gender: "male",
      jobTitle: "Crane Driver",
      medicalRestrictions: ["No unsupervised safety-critical work until review"],
      nationalId: `NAT-${stamp}`,
      organizationId: organization.id,
      riskCategory: "Safety critical driver",
      workAtHeight: true,
      workCategory: "safety_critical",
      workLocation: "North Yard",
    },
    method: "POST",
    token,
  });
  expectStatus(response, 201, "create employee");
  const employee = (response.body as { employee: { companyId?: string; id: string; medicalRestrictions: string[]; workLocation?: string } }).employee;
  assert(employee.companyId === company.id, "Employee must link to company.");
  assert(employee.workLocation === "North Yard", "Employee work location must persist.");
  assert(employee.medicalRestrictions.length === 1, "Employee medical restrictions must persist.");

  response = await request(`/employees/${employee.id}/link-patient`, { method: "POST", token });
  expectStatus(response, 200, "link employee patient");
  const patientId = (response.body as { patientId: string }).patientId;
  const patient = await prisma.patient.findUnique({ where: { id: patientId } });
  assert(patient?.companyId === company.id, "Patient linkage must preserve company.");
  assert(patient?.workLocation === "North Yard", "Patient linkage must preserve work location.");
  assert(patient?.medicalRestrictions.length === 1, "Patient linkage must preserve restrictions.");

  response = await request(`/occupational-risk/${employee.id}`, {
    body: {
      diabetes: true,
      dyslipidemia: true,
      hypertension: true,
      occupationalExposure: { shift: "rotating", safetyCritical: true },
      profileType: "crane_operator",
      smoking: true,
    },
    method: "PUT",
    token,
  });
  expectStatus(response, 200, "save occupational risk");
  const profile = (response.body as { profile: { highRisk: boolean; profileType: string; riskScore: number } }).profile;
  assert(profile.profileType === "crane_operator", "Risk profile type must round-trip.");
  assert(profile.highRisk, "Crane operator with multiple risks should be high risk.");

  response = await request("/fitness-assessments", {
    body: { employeeId: employee.id, physicianJustification: "Safety-critical crane work requires cardiology restrictions pending ECG review." },
    method: "POST",
    token,
  });
  expectStatus(response, 201, "create fitness assessment");
  const assessment = (response.body as { assessment: { finalDecision: string; occupationalReportSection: { jobRiskProfile?: string; restrictions?: string[] } } }).assessment;
  assert(["fit_with_restrictions", "temporarily_unfit", "specialist_review_required", "permanently_unfit"].includes(assessment.finalDecision), "Assessment must produce an occupational decision.");
  assert(assessment.occupationalReportSection.jobRiskProfile === "CRANE_OPERATOR", "Assessment report section must include job risk profile.");
  assert((assessment.occupationalReportSection.restrictions ?? []).length > 0, "Assessment must generate work restrictions.");

  const ecgCase = await prisma.eCGCase.create({
    data: {
      caseId: `SPRINT27-CASE-${stamp}`,
      ecgType: "12-Lead ECG",
      patientId,
      priority: "MEDIUM",
      uploadedById: admin.id,
    },
  });
  const report = await ensureClinicalReportForCase(ecgCase.id, admin.id);
  assert(report.occupationalReportSection !== null, "Generated ECG report must include occupational decision section.");

  const auditCount = await prisma.auditLog.count({
    where: {
      actorId: admin.id,
      OR: [
        { action: "COMPANY_CREATED", entityId: company.id },
        { action: "EMPLOYEE_CREATED", entityId: employee.id },
        { action: "OCCUPATIONAL_RISK_UPDATED" },
      ],
    },
  });
  assert(auditCount >= 3, "Sprint 27 workflow must create audit logs.");

  server.close();

  await prisma.clinicalReport.deleteMany({ where: { patientId } });
  await prisma.eCGCase.deleteMany({ where: { id: ecgCase.id } });
  await prisma.workRestriction.deleteMany({ where: { employeeId: employee.id } });
  await prisma.fitnessAssessment.deleteMany({ where: { employeeId: employee.id } });
  await prisma.occupationalRiskProfile.deleteMany({ where: { employeeId: employee.id } });
  await prisma.patient.deleteMany({ where: { id: patientId } });
  await prisma.auditLog.deleteMany({ where: { OR: [{ actorId: admin.id }, { organizationId: organization.id }, { entityId: company.id }, { entityId: employee.id }] } });
  await prisma.employee.deleteMany({ where: { id: employee.id } });
  await prisma.contractorCompany.deleteMany({ where: { id: contractor.id } });
  await prisma.department.deleteMany({ where: { id: department.id } });
  await prisma.company.deleteMany({ where: { id: company.id } });
  await prisma.organization.deleteMany({ where: { id: organization.id } });
  await prisma.session.deleteMany({ where: { userId: admin.id } });
  await prisma.subscription.deleteMany({ where: { userId: admin.id } });
  await prisma.user.deleteMany({ where: { id: admin.id } });

  console.log("Sprint 27 occupational cardiology integration test passed.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
