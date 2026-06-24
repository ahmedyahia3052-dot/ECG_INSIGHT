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

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function expectStatus(response: { status: number; body: unknown }, expected: number | number[], label: string) {
  const allowed = Array.isArray(expected) ? expected : [expected];
  assert(allowed.includes(response.status), `${label}: expected ${allowed.join("/")} but got ${response.status}: ${JSON.stringify(response.body).slice(0, 300)}`);
}

async function ensureUser(email: string, name: string, role: "ADMIN" | "DOCTOR") {
  const passwordHash = await bcrypt.hash("password", 12);
  return prisma.user.upsert({
    create: {
      avatarInitials: name
        .split(" ")
        .map((part) => part[0])
        .join("")
        .slice(0, 2),
      email,
      emailVerified: true,
      isActive: true,
      name,
      passwordHash,
      role,
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
      role,
    },
    where: { email },
  });
}

async function main() {
  await Promise.all([
    ensureUser("admin@ecginsight.com", "Admin User", "ADMIN"),
    ensureUser("doctor@ecginsight.com", "Dr. Sarah Chen", "DOCTOR"),
    ensureUser("workflow-other@ecginsight.com", "Dr. Workflow Other", "DOCTOR"),
  ]);

  const server = createServer(createApp());
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  assert(address && typeof address === "object", "Server did not expose a port.");
  const baseUrl = `http://127.0.0.1:${address.port}/api`;

  async function request(path: string, options: { body?: unknown; form?: FormData; method?: string; token?: string } = {}) {
    const headers = new Headers();
    if (options.token) headers.set("authorization", `Bearer ${options.token}`);
    let body: BodyInit | undefined;
    if (options.form) {
      body = options.form;
    } else if (options.body !== undefined) {
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
    assert(body.accessToken && body.user?.id, `Missing auth response for ${email}.`);
    return { token: body.accessToken, user: body.user };
  }

  const admin = await login("admin@ecginsight.com");
  const doctor = await login("doctor@ecginsight.com");
  const other = await login("workflow-other@ecginsight.com");
  const stamp = Date.now();

  let response = await request("/organizations", {
    body: { name: `Workflow Org ${stamp}`, status: "active", type: "company" },
    method: "POST",
    token: admin.token,
  });
  expectStatus(response, 201, "organization create");
  const organization = (response.body as { organization: { id: string } }).organization;

  response = await request("/departments", {
    body: { name: `Workflow Dept ${stamp}`, organizationId: organization.id },
    method: "POST",
    token: admin.token,
  });
  expectStatus(response, 201, "department create");
  const department = (response.body as { department: { id: string } }).department;

  response = await request("/contractors", {
    body: { name: `Workflow Contractor ${stamp}`, organizationId: organization.id, status: "active" },
    method: "POST",
    token: admin.token,
  });
  expectStatus(response, 201, "contractor create");
  const contractor = (response.body as { contractor: { id: string } }).contractor;

  response = await request("/employees", {
    body: {
      contractorCompanyId: contractor.id,
      criticalJob: true,
      dateOfBirth: "1982-02-02",
      departmentId: department.id,
      employeeId: `WF-${stamp}`,
      fullName: "Workflow Employee",
      gender: "male",
      medicalFitnessStatus: "fit",
      nationalId: `WF-NID-${stamp}`,
      organizationId: organization.id,
      workCategory: "safety_critical",
    },
    method: "POST",
    token: doctor.token,
  });
  expectStatus(response, 201, "employee create");
  const employee = (response.body as { employee: { id: string } }).employee;

  response = await request("/patients", {
    body: {
      contractorCompanyId: contractor.id,
      dateOfBirth: "1978-03-03",
      departmentId: department.id,
      firstName: "Workflow",
      gender: "male",
      lastName: "Patient",
      medicalRecordNumber: `WF-MRN-${stamp}`,
      organizationId: organization.id,
    },
    method: "POST",
    token: doctor.token,
  });
  expectStatus(response, 201, "patient create");
  const patient = (response.body as { patient: { id: string } }).patient;
  expectStatus(await request(`/patients/${patient.id}`, { token: other.token }), 403, "other doctor patient access denied");

  response = await request("/cases", {
    body: { ecgType: "12-lead workflow ECG", patientId: patient.id, priority: "high", status: "pending" },
    method: "POST",
    token: doctor.token,
  });
  expectStatus(response, 201, "case create");
  const ecgCase = (response.body as { case: { id: string } }).case;

  const ecgForm = new FormData();
  ecgForm.append("patientId", patient.id);
  ecgForm.append("caseId", ecgCase.id);
  ecgForm.append("file", new Blob([Buffer.from("%PDF-1.4 workflow")], { type: "application/pdf" }), "workflow-ecg.pdf");
  response = await request("/ecg/files/upload", { form: ecgForm, method: "POST", token: doctor.token });
  expectStatus(response, 201, "ecg upload");
  const ecgFile = (response.body as { file: { id: string } }).file;
  expectStatus(await request(`/ecg/files/${ecgFile.id}/download`, { token: doctor.token }), 200, "ecg download");

  response = await request(`/ai/analyze/${ecgCase.id}`, { method: "POST", token: doctor.token });
  expectStatus(response, 202, "ai analyze");
  assert(typeof (response.body as { analysis: { confidenceScore?: number } }).analysis.confidenceScore === "number", "AI confidence missing.");

  response = await request(`/reports/cases/${ecgCase.id}/generate`, { method: "POST", token: doctor.token });
  expectStatus(response, 201, "report generate");
  const report = (response.body as { report: { id: string } }).report;
  expectStatus(await request(`/reports/${report.id}/pdf`, { token: doctor.token }), 200, "report pdf export");

  const documentForm = new FormData();
  documentForm.append("patientId", patient.id);
  documentForm.append("caseId", ecgCase.id);
  documentForm.append("category", "ecg");
  documentForm.append("title", "Workflow ECG Document");
  documentForm.append("file", new Blob([Buffer.from("%PDF-1.4 document")], { type: "application/pdf" }), "workflow-doc.pdf");
  response = await request("/documents", { form: documentForm, method: "POST", token: doctor.token });
  expectStatus(response, 201, "document upload");
  const document = (response.body as { document: { id: string } }).document;
  expectStatus(await request(`/documents/${document.id}`, { body: { title: "Workflow ECG Document Updated" }, method: "PATCH", token: doctor.token }), 200, "document update");

  response = await request(`/occupational-risk/${employee.id}`, {
    body: { diabetes: true, hypertension: true, smoking: true },
    method: "PUT",
    token: doctor.token,
  });
  expectStatus(response, 200, "occupational risk upsert");
  response = await request("/fitness-assessments", {
    body: { employeeId: employee.id, physicianJustification: "Workflow assessment." },
    method: "POST",
    token: doctor.token,
  });
  expectStatus(response, 201, "fitness assessment create");
  const assessment = (response.body as { assessment: { id: string; restrictions?: Array<{ id: string }> } }).assessment;
  expectStatus(await request(`/fitness-assessments/${assessment.id}`, { body: { physicianJustification: "Updated workflow assessment." }, method: "PATCH", token: doctor.token }), 200, "fitness assessment update");

  response = await request("/tasks", {
    body: { assignedUserId: doctor.user.id, caseId: ecgCase.id, patientId: patient.id, priority: "MEDIUM", title: "Workflow Task" },
    method: "POST",
    token: doctor.token,
  });
  expectStatus(response, 201, "task create");
  const task = (response.body as { task: { id: string } }).task;
  expectStatus(await request(`/tasks/${task.id}`, { body: { status: "COMPLETED" }, method: "PATCH", token: doctor.token }), 200, "task update");

  response = await request("/teams", { body: { memberIds: [doctor.user.id], name: `Workflow Team ${stamp}` }, method: "POST", token: doctor.token });
  expectStatus(response, 201, "team create");
  const team = (response.body as { team: { id: string } }).team;
  expectStatus(await request(`/teams/${team.id}`, { body: { description: "Workflow team updated." }, method: "PATCH", token: doctor.token }), 200, "team update");

  response = await request("/messages", {
    body: { body: "Workflow message", caseId: ecgCase.id, patientId: patient.id, recipientIds: [doctor.user.id], title: "Workflow Conversation" },
    method: "POST",
    token: doctor.token,
  });
  expectStatus(response, 201, "message send");
  const conversation = (response.body as { conversation: { id: string } }).conversation;
  expectStatus(await request(`/messages/${conversation.id}/read`, { method: "POST", token: doctor.token }), 200, "message read receipt");

  response = await request("/alerts", {
    body: { category: "PENDING_REVIEW", caseId: ecgCase.id, message: "Workflow alert", patientId: patient.id, priority: "HIGH", title: "Workflow Alert" },
    method: "POST",
    token: doctor.token,
  });
  expectStatus(response, 201, "alert create");
  const alert = (response.body as { alert: { id: string } }).alert;
  expectStatus(await request(`/alerts/${alert.id}`, { body: { status: "RESOLVED" }, method: "PATCH", token: doctor.token }), 200, "alert update");

  response = await request("/notifications", { body: { message: "Workflow notification", title: "Workflow", type: "INFO" }, method: "POST", token: doctor.token });
  expectStatus(response, 201, "notification create");
  const notification = (response.body as { notification: { id: string } }).notification;
  expectStatus(await request(`/notifications/${notification.id}/read`, { method: "POST", token: doctor.token }), 200, "notification read");
  expectStatus(await request(`/notifications/${notification.id}`, { method: "DELETE", token: doctor.token }), 204, "notification delete");

  expectStatus(await request(`/reports?q=${encodeURIComponent("Workflow")}&status=draft&page=1&pageSize=5`, { token: doctor.token }), 200, "report search pagination");
  expectStatus(await request(`/ecg/files/list?patientId=${patient.id}&fileType=PDF_REPORT&page=1&pageSize=5`, { token: doctor.token }), 200, "ecg file filter pagination");
  expectStatus(await request(`/tasks?q=${encodeURIComponent("Workflow Task")}&status=COMPLETED&page=1&pageSize=5`, { token: doctor.token }), 200, "task search filter pagination");
  expectStatus(await request(`/teams?q=${encodeURIComponent("Workflow Team")}&page=1&pageSize=5`, { token: doctor.token }), 200, "team search pagination");
  expectStatus(await request(`/messages?q=${encodeURIComponent("Workflow message")}&patientId=${patient.id}&page=1&pageSize=5`, { token: doctor.token }), 200, "message search pagination");
  expectStatus(await request(`/alerts?q=${encodeURIComponent("Workflow Alert")}&status=RESOLVED&page=1&pageSize=5`, { token: doctor.token }), 200, "alert search filter pagination");
  expectStatus(await request(`/notifications?q=${encodeURIComponent("Workflow")}&read=true&page=1&pageSize=5`, { token: doctor.token }), 200, "notification search filter pagination");

  expectStatus(await request(`/documents/${document.id}`, { method: "DELETE", token: doctor.token }), 204, "document delete");
  expectStatus(await request(`/ecg/files/${ecgFile.id}`, { method: "DELETE", token: doctor.token }), 204, "ecg file delete");
  expectStatus(await request(`/tasks/${task.id}`, { method: "DELETE", token: doctor.token }), 204, "task delete");
  expectStatus(await request(`/teams/${team.id}`, { method: "DELETE", token: doctor.token }), 204, "team delete");
  expectStatus(await request(`/alerts/${alert.id}`, { method: "DELETE", token: doctor.token }), 204, "alert delete");
  expectStatus(await request(`/messages/${conversation.id}`, { method: "DELETE", token: doctor.token }), 204, "conversation delete");
  expectStatus(await request(`/patients/${patient.id}`, { method: "DELETE", token: doctor.token }), 200, "patient delete/archive");

  await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log("Clinical workflow integration test passed.");
  })
  .catch(async (error) => {
    await prisma.$disconnect();
    console.error(error);
    process.exitCode = 1;
  });
