import { expect, type APIRequestContext, type Page, type TestInfo } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { createSyntheticEcgPngBuffer } from "./ecg-fixture-image";
import { uploadClinicalEcgImage } from "./clinical-upload";
import { runtimeTimestamp, waitForRuntimeEvent, waitForStreamingFinished, waitForUploadFinished, waitForVoiceIdle } from "./runtime-events";

export const API_URL = process.env["PLAYWRIGHT_API_URL"] ?? "http://127.0.0.1:3002/api";

export const users = {
  doctor: { email: "doctor@ecginsight.com", password: "password" },
  owner: { email: "ahmedyahia3052@gmail.com", password: "Ahmed@2026" },
};

export type ApiSession = {
  csrfToken?: string;
  token: string;
  user: { id: string };
};

export type ClinicalFixture = {
  caseId: string;
  caseNumber?: string;
  csrfToken?: string;
  ecgFileId?: string;
  medicalRecordNumber?: string;
  patientId: string;
  patientName: string;
  reportId?: string;
  token?: string;
};

async function csrfTokenFromRequest(request: APIRequestContext) {
  const state = await request.storageState();
  return state.cookies.find((cookie) => cookie.name === "ecg_csrf_token")?.value;
}

export function authHeaders(token: string, csrfToken?: string) {
  const headers: Record<string, string> = { authorization: `Bearer ${token}` };
  if (csrfToken) headers["x-csrf-token"] = csrfToken;
  return headers;
}

export async function apiLogin(request: APIRequestContext, role: keyof typeof users = "doctor"): Promise<ApiSession> {
  const response = await request.post(`${API_URL}/auth/login`, {
    data: { email: users[role].email, password: users[role].password, rememberMe: true },
  });
  expect(response.ok(), `API login should succeed for ${role}`).toBeTruthy();
  const body = await response.json();
  const csrfToken = await csrfTokenFromRequest(request);
  return { csrfToken, token: body.accessToken, user: body.user };
}

export async function uiLogin(page: Page, role: keyof typeof users = "doctor") {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    await gotoLogin(page, "/login");
    if (!(await page.getByText(/Welcome Back/i).isVisible({ timeout: 5_000 }).catch(() => false))) {
      const logoutButton = page.getByRole("button", { name: /logout/i }).first();
      if (await logoutButton.isVisible().catch(() => false)) {
        await logoutButton.click();
      } else {
        await gotoLogin(page, "/login?force=1");
      }
    }
    await expect(page.getByText(/Welcome Back/i)).toBeVisible();
    await page.getByPlaceholder(/doctor@hospital\.com|name@organization\.com/i).fill(users[role].email);
    await page.getByPlaceholder(/password/i).fill(users[role].password);
    const signIn = page.getByRole("button", { name: /sign in/i });
    await expect(signIn).toBeEnabled({ timeout: 45_000 });
    await signIn.click();
    try {
      await expect(page.getByText(/Enterprise Clinical Command Center|Good Morning|Good Afternoon|Good Evening/).first()).toBeVisible({ timeout: 30_000 });
      return;
    } catch (error) {
      if (attempt >= 4) throw error;
      await page.waitForTimeout(2_000 * (attempt + 1));
    }
  }
}

async function gotoLogin(page: Page, path: "/login" | "/login?force=1") {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await page.goto(path, { timeout: 30_000, waitUntil: "domcontentloaded" });
      return;
    } catch (error) {
      if (attempt >= 2) throw error;
      await page.waitForTimeout(1_000 * (attempt + 1));
    }
  }
}

export async function logout(page: Page) {
  const logoutButton = page.getByRole("button", { name: /logout/i }).first();
  if (await logoutButton.isVisible().catch(() => false)) {
    await logoutButton.click();
  } else {
    await page.goto("/login");
  }
  await expect(page.getByText(/Welcome Back/i)).toBeVisible({ timeout: 20_000 });
}

export async function createPatient(request: APIRequestContext, session: ApiSession | string, suffix = Date.now().toString()) {
  const token = typeof session === "string" ? session : session.token;
  const csrfToken = typeof session === "string" ? undefined : session.csrfToken;
  const uniqueSuffix = `${suffix}-${Math.random().toString(36).slice(2, 8)}`;
  const response = await request.post(`${API_URL}/patients`, {
    data: {
      dateOfBirth: "1975-04-12",
      firstName: `QA${uniqueSuffix.slice(-6)}`,
      gender: "male",
      lastName: "Patient",
      medicalRecordNumber: `QA-MRN-${uniqueSuffix}`,
    },
    headers: authHeaders(token, csrfToken),
  });
  const body = await response.json();
  expect(response.ok(), `Patient API create should succeed: ${JSON.stringify(body)}`).toBeTruthy();
  return body.patient as { id: string; firstName: string; lastName: string; medicalRecordNumber: string };
}

async function apiPostWithRetry(
  request: APIRequestContext,
  url: string,
  options: { data?: unknown; headers?: Record<string, string> },
  label: string,
  retries = 4,
) {
  let lastBody = "";
  for (let attempt = 0; attempt < retries; attempt += 1) {
    const response = await request.post(url, options);
    if (response.ok()) return response;
    lastBody = await response.text();
    if (response.status() >= 500 || response.status() === 429) {
      await new Promise((resolve) => setTimeout(resolve, 1_000 * (attempt + 1)));
      continue;
    }
    break;
  }
  throw new Error(`${label} failed: ${lastBody}`);
}

export async function createClinicalFixture(request: APIRequestContext, options: { analyze?: boolean; report?: boolean } = {}): Promise<ClinicalFixture & { csrfToken?: string; token: string }> {
  const session = await apiLogin(request, "doctor");
  const suffix = Date.now().toString();
  const patient = await createPatient(request, session, suffix);
  const caseResponse = await apiPostWithRetry(
    request,
    `${API_URL}/cases`,
    { data: { ecgType: "12-lead QA ECG", patientId: patient.id, priority: "high", status: "pending" }, headers: authHeaders(session.token, session.csrfToken) },
    "ECG case API create",
  );
  const ecgCase = (await caseResponse.json()).case as { caseNumber?: string; id: string };

  const ecgImage = await createSyntheticEcgPngBuffer();
  const uploadResponse = await uploadClinicalEcgImage(request, session, {
    caseId: ecgCase.id,
    fileName: `qa-${suffix}-50mm-20mm-ecg.png`,
    image: ecgImage,
    patientId: patient.id,
    source: "playwright",
  });
  expect(uploadResponse.ok(), "ECG upload API should succeed").toBeTruthy();
  const file = (await uploadResponse.json()).file as { id: string };

  if (options.analyze) {
    const analyzeResponse = await request.post(`${API_URL}/ecg/analyze`, {
      data: { caseId: ecgCase.id, ecgFileId: file.id },
      headers: authHeaders(session.token, session.csrfToken),
    });
    expect(analyzeResponse.ok(), `ECG image analysis API should succeed: ${await analyzeResponse.text()}`).toBeTruthy();
  }

  let reportId: string | undefined;
  if (options.report) {
    const reportResponse = await request.post(`${API_URL}/reports/cases/${ecgCase.id}/generate`, {
      headers: authHeaders(session.token, session.csrfToken),
    });
    expect(reportResponse.ok(), "Report generation API should succeed").toBeTruthy();
    reportId = (await reportResponse.json()).report.id;
  }

  return {
    caseId: ecgCase.id,
    caseNumber: ecgCase.caseNumber,
    csrfToken: session.csrfToken,
    ecgFileId: file.id,
    medicalRecordNumber: patient.medicalRecordNumber,
    patientId: patient.id,
    patientName: `${patient.firstName} ${patient.lastName}`,
    reportId,
    token: session.token,
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
  await expect(page.getByText(heading).first()).toBeVisible({ timeout: 45_000 });
  await expect(page.locator("body")).toBeVisible();
}

export async function navigate(page: Page, path: string, heading: RegExp | string) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const shellLabel = shellNavigationLabel(path);
    if (shellLabel && attempt === 0) {
      const button = page.getByRole("button", { name: `Open ${shellLabel}` }).first();
      if (await button.isVisible().catch(() => false)) {
        await button.click();
      } else {
        await page.goto(path);
      }
    } else {
      await page.goto(path);
    }
    try {
      await expectPageReady(page, heading);
      return;
    } catch (error) {
      if (attempt >= 2) throw error;
      await page.waitForTimeout(1_500 * (attempt + 1));
    }
  }
}

function shellNavigationLabel(path: string) {
  if (path.startsWith("/analytics")) return "Analytics";
  if (path.startsWith("/dashboard")) return "Dashboard";
  if (path.startsWith("/ecg-analysis")) return "ECG Analysis";
  if (path.startsWith("/ecg-cases")) return "ECG Cases";
  if (path.startsWith("/notifications")) return "Notifications";
  if (path.startsWith("/owner/licenses")) return "License Controls";
  if (path.startsWith("/release-candidate")) return "Release Candidate";
  if (path.startsWith("/patients")) return "Patients";
  if (path.startsWith("/reports")) return "Reports";
  if (path.startsWith("/settings")) return "Settings";
  if (path.startsWith("/upload-ecg")) return "Upload ECG";
  if (path.startsWith("/ecg-workspace")) return "ECG Workspace";
  return null;
}

export async function disableCopilotVoiceMode(page: Page) {
  const after = await runtimeTimestamp(page);
  let changed = false;
  if (await page.getByTestId("copilot-voice-status").getByText("Listening").isVisible().catch(() => false)) {
    await page.getByRole("button", { name: "Voice" }).last().click().catch(() => undefined);
    changed = true;
  }
  if (await page.getByText("Voice mode on").isVisible().catch(() => false)) {
    await page.getByTestId("copilot-voice-mode-toggle").click();
    changed = true;
  }
  if (changed) {
    await waitForVoiceIdle(page, { after, timeout: 60_000 });
  }
}

export async function waitForConversationReady(page: Page, options: { keepVoiceMode?: boolean } = {}) {
  if (!options.keepVoiceMode) {
    await disableCopilotVoiceMode(page);
  }
  await expect(page.getByTestId("copilot-conversation-ready")).toBeAttached({ timeout: 120_000 });
  await expect(page.getByTestId("copilot-stop-button")).toHaveCount(0);
  await expect(page.getByTestId("copilot-composer-input").last()).toBeEditable();
}

export async function waitForCopilotIdle(page: Page, options: { keepVoiceMode?: boolean } = {}) {
  await waitForVoiceIdle(page);
  await waitForConversationReady(page, options);
}

export async function waitForCopilotSendReady(page: Page) {
  await waitForConversationReady(page);
  await expect(page.getByTestId("copilot-send-button").last()).toBeEnabled({ timeout: 120_000 });
}

export async function clickCopilotStreamingAction(page: Page, name: string) {
  await waitForConversationReady(page);
  const actionButton = page.getByRole("button", { name }).last();
  await expect(actionButton).toBeEnabled({ timeout: 90_000 });
  if (name === "Send") {
    await expect(page.getByTestId("copilot-send-button").last()).toBeEnabled({ timeout: 90_000 });
  }
  const after = await runtimeTimestamp(page);
  const [streamResponse] = await Promise.all([
    page.waitForResponse(
      (response) => response.url().includes("/copilot/chat/stream") && response.status() === 201,
      { timeout: 120_000 },
    ),
    actionButton.click(),
  ]);
  await streamResponse.finished().catch(() => undefined);
  await waitForRuntimeEvent(page, "StreamingStarted", { after: after - 1_000, timeout: 120_000 });
  await waitForStreamingFinished(page, { after, timeout: 120_000 });
  await waitForCopilotIdle(page);
}

export type CopilotUploadSpec = {
  buffer: Buffer;
  buttonName: "Upload ECG" | "Upload Files" | "Upload Image";
  mimeType: string;
  name: string;
};

export async function uploadCopilotAttachment(page: Page, spec: CopilotUploadSpec) {
  const uploadAfter = await runtimeTimestamp(page);
  const uploadResponse = page.waitForResponse(
    (response) => response.url().includes("/copilot/attachments") && response.request().method() === "POST",
    { timeout: 60_000 },
  );
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: spec.buttonName }).last().click();
  await (await chooser).setFiles({ buffer: spec.buffer, mimeType: spec.mimeType, name: spec.name });
  const response = await uploadResponse;
  const responseBody = await response.text();
  const payload = JSON.parse(responseBody) as { attachment?: { id?: string } };
  expect(response.status(), `Copilot upload ${spec.name} should succeed: ${responseBody}`).toBe(201);
  expect(payload.attachment?.id, `Copilot upload ${spec.name} should return attachment id`).toBeTruthy();
  await waitForRuntimeEvent(page, "UploadStarted", { after: uploadAfter - 1_000, timeout: 60_000 });
  await waitForUploadFinished(page, { after: uploadAfter, timeout: 120_000 });
  await expect
    .poll(async () => {
      const removeVisible = await page.getByRole("button", { name: `Remove ${spec.name}` }).isVisible().catch(() => false);
      const nameVisible = await page.getByText(spec.name).last().isVisible().catch(() => false);
      return removeVisible || nameVisible;
    }, { message: `Copilot upload chip for ${spec.name} should render`, timeout: 45_000 })
    .toBe(true);
  await waitForCopilotSendReady(page);
}

export async function exportCopilotConversation(page: Page, format: "pdf" | "txt") {
  const label = format === "pdf" ? "Export PDF" : "Export TXT";
  const pathSuffix = format === "pdf" ? "/export" : "/export.txt";
  const exportResponse = page.waitForResponse(
    (response) => response.url().includes(pathSuffix) && response.status() === 200,
    { timeout: 30_000 },
  );
  const download = page.waitForEvent("download", { timeout: 30_000 });
  await page.getByRole("button", { name: label }).last().click();
  await exportResponse;
  await download;
}

export function attachStrictRuntimeDiagnostics(page: Page) {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const failedResponses: string[] = [];
  const failedRequests: string[] = [];

  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(`${error.message}\n${error.stack ?? ""}`));
  page.on("response", (response) => {
    if (response.status() >= 500) {
      failedResponses.push(`${response.status()} ${response.request().method()} ${response.url()}`);
    }
  });
  page.on("requestfailed", (requestFailure) => {
    failedRequests.push(requestFailure.url());
  });

  return {
    assertClean() {
      expect(failedResponses, `Unexpected HTTP 5xx responses: ${failedResponses.join("; ")}`).toEqual([]);
      expect(failedRequests, `Unexpected failed requests: ${failedRequests.join("; ")}`).toEqual([]);
      expect(consoleErrors, `Unexpected console errors: ${consoleErrors.join("; ")}`).toEqual([]);
      expect(pageErrors, `Unexpected page errors: ${pageErrors.join("; ")}`).toEqual([]);
    },
    consoleErrors,
    failedRequests,
    failedResponses,
    pageErrors,
  };
}
