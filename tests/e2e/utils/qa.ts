import { expect, type APIRequestContext, type Page, type TestInfo } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

export const API_URL = process.env["PLAYWRIGHT_API_URL"] ?? "http://127.0.0.1:3002/api";

export const users = {
  doctor: { email: "doctor@ecginsight.com", password: "password" },
  owner: { email: "ahmedyahia3052@gmail.com", password: "Ahmed@2026" },
};

type ApiSession = {
  token: string;
  user: { id: string };
};

export type ClinicalFixture = {
  caseId: string;
  caseNumber?: string;
  ecgFileId?: string;
  patientId: string;
  patientName: string;
  reportId?: string;
};

export async function apiLogin(request: APIRequestContext, role: keyof typeof users = "doctor"): Promise<ApiSession> {
  const response = await request.post(`${API_URL}/auth/login`, {
    data: { email: users[role].email, password: users[role].password, rememberMe: true },
  });
  expect(response.ok(), `API login should succeed for ${role}`).toBeTruthy();
  const body = await response.json();
  return { token: body.accessToken, user: body.user };
}

export async function uiLogin(page: Page, role: keyof typeof users = "doctor") {
  await page.goto("/login");
  if (!(await page.getByText("Welcome back").isVisible({ timeout: 5_000 }).catch(() => false))) {
    const logoutButton = page.getByRole("button", { name: /logout/i }).first();
    if (await logoutButton.isVisible().catch(() => false)) {
      await logoutButton.click();
    } else {
      await page.goto("/login?force=1");
    }
  }
  await expect(page.getByText("Welcome back")).toBeVisible();
  await page.getByPlaceholder("doctor@hospital.com").fill(users[role].email);
  await page.getByPlaceholder("Password").fill(users[role].password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page.getByText(/Enterprise Clinical Command Center|Good Morning|Good Afternoon|Good Evening/).first()).toBeVisible({ timeout: 30_000 });
}

export async function logout(page: Page) {
  const logoutButton = page.getByRole("button", { name: /logout/i }).first();
  if (await logoutButton.isVisible().catch(() => false)) {
    await logoutButton.click();
  } else {
    await page.goto("/login");
  }
  await expect(page.getByText("Welcome back")).toBeVisible({ timeout: 20_000 });
}

export async function createPatient(request: APIRequestContext, token: string, suffix = Date.now().toString()) {
  const uniqueSuffix = `${suffix}-${Math.random().toString(36).slice(2, 8)}`;
  const response = await request.post(`${API_URL}/patients`, {
    data: {
      dateOfBirth: "1975-04-12",
      firstName: `QA${uniqueSuffix.slice(-6)}`,
      gender: "male",
      lastName: "Patient",
      medicalRecordNumber: `QA-MRN-${uniqueSuffix}`,
    },
    headers: authHeaders(token),
  });
  const body = await response.json();
  expect(response.ok(), `Patient API create should succeed: ${JSON.stringify(body)}`).toBeTruthy();
  return body.patient as { id: string; firstName: string; lastName: string; medicalRecordNumber: string };
}

export async function createClinicalFixture(request: APIRequestContext, options: { analyze?: boolean; report?: boolean } = {}): Promise<ClinicalFixture> {
  const session = await apiLogin(request, "doctor");
  const suffix = Date.now().toString();
  const patient = await createPatient(request, session.token, suffix);
  const caseResponse = await request.post(`${API_URL}/cases`, {
    data: { ecgType: "12-lead QA ECG", patientId: patient.id, priority: "high", status: "pending" },
    headers: authHeaders(session.token),
  });
  expect(caseResponse.ok(), "ECG case API create should succeed").toBeTruthy();
  const ecgCase = (await caseResponse.json()).case as { caseNumber?: string; id: string };

  const uploadResponse = await request.post(`${API_URL}/ecg/files/upload`, {
    headers: authHeaders(session.token),
    multipart: {
      caseId: ecgCase.id,
      file: {
        buffer: Buffer.from("89504e470d0a1a0a0000000d49484452", "hex"),
        mimeType: "image/png",
        name: `qa-${suffix}-50mm-20mm-ecg.png`,
      },
      patientId: patient.id,
      source: "playwright",
    },
  });
  expect(uploadResponse.ok(), "ECG upload API should succeed").toBeTruthy();
  const file = (await uploadResponse.json()).file as { id: string };

  if (options.analyze) {
    const analyzeResponse = await request.post(`${API_URL}/ecg/analyze`, {
      data: { caseId: ecgCase.id, ecgFileId: file.id },
      headers: authHeaders(session.token),
    });
    expect(analyzeResponse.ok(), `ECG image analysis API should succeed: ${await analyzeResponse.text()}`).toBeTruthy();
  }

  let reportId: string | undefined;
  if (options.report) {
    const reportResponse = await request.post(`${API_URL}/reports/cases/${ecgCase.id}/generate`, {
      headers: authHeaders(session.token),
    });
    expect(reportResponse.ok(), "Report generation API should succeed").toBeTruthy();
    reportId = (await reportResponse.json()).report.id;
  }

  return {
    caseId: ecgCase.id,
    caseNumber: ecgCase.caseNumber,
    ecgFileId: file.id,
    patientId: patient.id,
    patientName: `${patient.firstName} ${patient.lastName}`,
    reportId,
  };
}

export async function attachA11yScan(page: Page, testInfo: TestInfo, scopeName: string) {
  const results = await new AxeBuilder({ page })
    .disableRules(["color-contrast"])
    .analyze();
  await testInfo.attach(`${scopeName}-axe-results`, {
    body: JSON.stringify(results.violations, null, 2),
    contentType: "application/json",
  });
  expect(results.violations, `${scopeName} should not have critical accessibility violations`).not.toEqual(
    expect.arrayContaining([expect.objectContaining({ impact: "critical" })]),
  );
}

export async function expectPageReady(page: Page, heading: RegExp | string) {
  await expect(page.getByText(heading).first()).toBeVisible({ timeout: 30_000 });
  await expect(page.locator("body")).toBeVisible();
}

export async function navigate(page: Page, path: string, heading: RegExp | string) {
  const shellLabel = shellNavigationLabel(path);
  if (shellLabel) {
    const button = page.getByRole("button", { name: `Open ${shellLabel}` }).first();
    if (await button.isVisible().catch(() => false)) {
      await button.click();
    } else {
      await page.goto(path);
    }
  } else {
    await page.goto(path);
  }
  await expectPageReady(page, heading);
}

function shellNavigationLabel(path: string) {
  if (path.startsWith("/analytics")) return "Analytics";
  if (path.startsWith("/dashboard")) return "Dashboard";
  if (path.startsWith("/ecg-analysis")) return "ECG Analysis";
  if (path.startsWith("/ecg-cases")) return "ECG Cases";
  if (path.startsWith("/notifications")) return "Notifications";
  if (path.startsWith("/owner/licenses")) return "License Management";
  if (path.startsWith("/patients")) return "Patients";
  if (path.startsWith("/reports")) return "Reports";
  if (path.startsWith("/settings")) return "Settings";
  if (path.startsWith("/upload-ecg")) return "Upload ECG";
  return null;
}

function authHeaders(token: string) {
  return { authorization: `Bearer ${token}` };
}
