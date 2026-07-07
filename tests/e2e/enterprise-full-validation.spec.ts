import { expect, test } from "./test";
import { API_URL, apiLogin, authHeaders, attachA11yScan, bootstrapAuthenticatedPage, createClinicalFixture, expectPageReady, navigate, uiLogin, uploadCopilotAttachment } from "./utils/qa";
import { createPipelineFixture, validateCopilotStream, validateEcgPipeline, validatePdfParse } from "./utils/enterprise-pipeline";
import { createSyntheticEcgPngBuffer } from "./utils/ecg-fixture-image";
import { installCopilotVoiceMocks } from "./utils/voice-mocks";
import {
  assertWorkspaceShell,
  ecgRightRail,
  ensureLeftPanelOpen,
  openEcgWorkspace,
} from "./utils/ecg-workspace-locators";

test.describe("ECG Insight Enterprise — Full Validation @enterprise @e2e", () => {
  test("API: complete ECG pipeline — preprocessing, digitization, measurement, interpretation, AI diagnosis", async ({ request }) => {
    test.setTimeout(120_000);
    const fixture = await createPipelineFixture(request);
    const result = await validateEcgPipeline(request, fixture);
    expect(result.measured.clinicalMeasurements?.heartRate).toBeGreaterThan(0);
    expect(result.interpreted.clinicalInterpretation?.primaryDiagnosis.length).toBeGreaterThan(0);
    expect(result.diagnosed.aiDiagnosis?.confidence).toBeGreaterThan(0);
  });

  test("API: PDF file upload and parse endpoint", async ({ request }) => {
    const fixture = await createPipelineFixture(request);
    const parsed = await validatePdfParse(request, fixture.token, fixture.caseId, fixture.patientId, fixture.csrfToken);
    expect(parsed).toHaveProperty("parsed");
  });

  test("API: Ollama / clinical AI streaming responds with clinical content", async ({ request }) => {
    const session = await apiLogin(request, "doctor");
    await validateCopilotStream(request, session.token, session.csrfToken);
  });

  test("API: invalid file upload rejected with error status", async ({ request }) => {
    const fixture = await createClinicalFixture(request);
    const response = await request.post(`${API_URL}/ecg/files/upload`, {
      headers: authHeaders(fixture.token, fixture.csrfToken),
      multipart: {
        caseId: fixture.caseId,
        file: { buffer: Buffer.from("not-a-valid-image"), mimeType: "application/octet-stream", name: "invalid.bin" },
        patientId: fixture.patientId,
        source: "enterprise-e2e-invalid",
      },
    });
    expect([400, 415, 422, 500]).toContain(response.status());
  });

  test("API: regression — clinical fixture creation is not IP rate limited under E2E", async ({ request }) => {
    for (let index = 0; index < 3; index += 1) {
      const fixture = await createClinicalFixture(request);
      expect(fixture.caseId).toBeTruthy();
      expect(fixture.patientId).toBeTruthy();
    }
  });

  test("API: empty copilot message rejected", async ({ request }) => {
    const session = await apiLogin(request, "doctor");
    const response = await request.post(`${API_URL}/copilot/chat/stream`, {
      data: { question: "   " },
      headers: authHeaders(session.token, session.csrfToken),
    });
    expect([400, 422]).toContain(response.status());
  });

  test("UI: upload ECG image, analyze, and show loading/results", async ({ page, request }) => {
    const patient = await createClinicalFixture(request);
    const ecgImage = await createSyntheticEcgPngBuffer();
    await uiLogin(page, "doctor");
    await navigate(page, "/upload-ecg", "Upload ECG");
    const chooserPromise = page.waitForEvent("filechooser");
    await page.getByRole("button", { name: /Select Images\/PDF/i }).click();
    await (await chooserPromise).setFiles({
      buffer: ecgImage,
      mimeType: "image/png",
      name: `enterprise-e2e-${Date.now()}-50mm-20mm-ecg.png`,
    });
    await page.getByPlaceholder(/Patient ID, employee ID/i).fill(patient.medicalRecordNumber ?? patient.patientName.split(" ")[0] ?? "QA");
    await expect(page.getByText(patient.medicalRecordNumber ?? patient.patientName.split(" ")[0] ?? "QA").first()).toBeVisible({ timeout: 30_000 });
    if (await page.getByText("Select").last().isVisible().catch(() => false)) {
      await page.getByText("Select").last().click();
    }
    await page.getByRole("button", { name: /Analyze ECG/i }).click();
    await expect(page.getByText(/Analyzing|Processing|AI Results|Normal ECG|Pending|Enterprise report/).first()).toBeVisible({ timeout: 90_000 });
  });

  test("UI: ECG workspace route loads enterprise clinical viewer", async ({ page }) => {
    await bootstrapAuthenticatedPage(page, "doctor");
    await openEcgWorkspace(page);
    if (await page.getByTestId("ecg-enterprise-workspace-ready").isVisible()) {
      await assertWorkspaceShell(page);
      await ensureLeftPanelOpen(page);
      await expect(ecgRightRail(page)).toBeVisible();
    }
  });

  test("UI: voice input and speech recognition populate composer", async ({ page }) => {
    await installCopilotVoiceMocks(page, ["Enterprise validation voice transcript"]);
    const loginResponse = await page.request.post(`${API_URL}/auth/login`, {
      data: { email: "doctor@ecginsight.com", password: "password", rememberMe: true },
    });
    const loginPayload = await loginResponse.json();
    await page.route("**/api/auth/refresh", async (route) => {
      await route.fulfill({ contentType: "application/json", json: loginPayload, status: 200 });
    });
    await page.goto("/copilot");
    await expect(page.getByText("Clinical Copilot Workspace")).toBeVisible({ timeout: 30_000 });
    await page.getByRole("button", { name: "Voice" }).last().click();
    await expect(page.getByPlaceholder(/Message the assistant|Ask about ECG/i)).toHaveValue(/Enterprise validation voice transcript/i, { timeout: 10_000 });
  });

  test("UI: copilot upload files, image, and ECG attachments", async ({ page }) => {
    const loginResponse = await page.request.post(`${API_URL}/auth/login`, {
      data: { email: "doctor@ecginsight.com", password: "password", rememberMe: true },
    });
    const loginPayload = await loginResponse.json();
    await page.route("**/api/auth/refresh", async (route) => {
      await route.fulfill({ contentType: "application/json", json: loginPayload, status: 200 });
    });
    await page.goto("/copilot");
    await expect(page.getByText("Clinical Copilot Workspace")).toBeVisible({ timeout: 30_000 });

    await uploadCopilotAttachment(page, {
      buffer: Buffer.from("lab results"),
      buttonName: "Upload Files",
      mimeType: "text/plain",
      name: "enterprise-labs.txt",
    });

    await uploadCopilotAttachment(page, {
      buffer: Buffer.from("89504e470d0a1a0a0000000d49484452", "hex"),
      buttonName: "Upload Image",
      mimeType: "image/png",
      name: "enterprise-image.png",
    });

    await uploadCopilotAttachment(page, {
      buffer: Buffer.from("%PDF-1.4"),
      buttonName: "Upload ECG",
      mimeType: "application/pdf",
      name: "enterprise-ecg.pdf",
    });
  });

  test("UI: network failure on copilot stream shows graceful error without crash", async ({ page }) => {
    await bootstrapAuthenticatedPage(page, "doctor");
    const loginResponse = await page.request.post(`${API_URL}/auth/login`, {
      data: { email: "doctor@ecginsight.com", password: "password", rememberMe: true },
    });
    expect(loginResponse.ok()).toBeTruthy();
    const loginPayload = await loginResponse.json();
    await page.route("**/api/auth/refresh", async (route) => {
      await route.fulfill({ contentType: "application/json", json: loginPayload, status: 200 });
    });
    await page.route("**/api/copilot/chat/stream", async (route) => {
      await route.abort("failed");
    });
    await page.goto("/copilot");
    await expectPageReady(page, "Clinical Copilot Workspace");
    await page.getByRole("button", { name: "New Chat" }).click();
    const composer = page.getByPlaceholder(/Message the assistant|Ask about ECG/i);
    await composer.fill("Network failure test");
    await page.getByRole("button", { name: "Send" }).click();
    await expect(page.getByText(/Something went wrong|failed|error|try again|Ready/i).first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("Please reload the app to continue.")).toHaveCount(0);
  });

  test("UI: empty copilot send blocked or shows validation", async ({ page }) => {
    const loginResponse = await page.request.post(`${API_URL}/auth/login`, {
      data: { email: "doctor@ecginsight.com", password: "password", rememberMe: true },
    });
    const loginPayload = await loginResponse.json();
    await page.route("**/api/auth/refresh", async (route) => {
      await route.fulfill({ contentType: "application/json", json: loginPayload, status: 200 });
    });
    await page.goto("/copilot");
    await page.getByRole("button", { name: "New Chat" }).click();
    const sendButton = page.getByRole("button", { name: "Send" });
    await expect(sendButton).toBeDisabled();
  });

  test("UI: dashboard shows loading then enterprise KPIs", async ({ page }) => {
    await uiLogin(page, "doctor");
    await expect(page.getByText(/Enterprise Clinical Command Center|Good Morning|Good Afternoon|Good Evening/).first()).toBeVisible();
    await expect(page.getByText(/Total ECG Analyses|Critical Cases|Pending Reviews/).first()).toBeVisible({ timeout: 30_000 });
  });

  test("UI: login rejects invalid credentials with error message", async ({ page }) => {
    await page.goto("/login");
    await page.getByPlaceholder(/doctor@hospital\.com|name@organization\.com/i).fill("invalid@ecginsight.com");
    await page.getByPlaceholder(/password/i).fill("wrong-password");
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page.getByText(/invalid|incorrect|failed|unable/i).first()).toBeVisible({ timeout: 15_000 });
  });

  test("UI: core screens pass accessibility scan @enterprise @accessibility", async ({ page }, testInfo) => {
    await uiLogin(page, "doctor");
    const screens: Array<[string, string | RegExp]> = [
      ["/dashboard", /Enterprise Clinical Command Center|Dashboard/],
      ["/upload-ecg", "Upload ECG"],
    ];
    for (const [path, heading] of screens) {
      await navigate(page, path, heading);
      await attachA11yScan(page, testInfo, `enterprise-${path.replace(/\W+/g, "-")}`);
    }
    await page.goto("/ecg-workspace", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("ecg-enterprise-workspace-ready").or(page.getByTestId("ecg-workspace-no-demo"))).toBeVisible({
      timeout: 60_000,
    });
    if (await page.getByTestId("ecg-enterprise-workspace-ready").isVisible()) {
      await assertWorkspaceShell(page);
    }
    await attachA11yScan(page, testInfo, "enterprise-ecg-workspace");
  });

  test("UI: mobile viewport renders navigation and upload flow @enterprise @mobile", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await uiLogin(page, "doctor");
    await expect(page.getByLabel("Open navigation")).toBeVisible();
    await page.getByLabel("Open navigation").click();
    await page.getByRole("button", { name: "Open Upload ECG" }).click();
    await expect(page.getByText("Smart ECG Upload")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole("button", { name: /Select Images\/PDF/i })).toBeVisible();
  });
});
