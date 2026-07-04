import { expect, test } from "./test";
import { API_URL, apiLogin, attachStrictRuntimeDiagnostics, authHeaders, bootstrapAuthenticatedPage, clickCopilotStreamingAction, createClinicalFixture, disableCopilotVoiceMode, expectPageReady, exportCopilotConversation, navigate, uiLogin, uploadCopilotAttachment, waitForCopilotIdle } from "./utils/qa";
import { installCopilotVoiceMocks } from "./utils/voice-mocks";

test.describe("owner controls, copilot, ECG viewer, search, notifications, and exports", () => {
  test("owner license management can grant a temporary enterprise license @smoke", async ({ page, request }) => {
    const owner = await apiLogin(request, "owner");
    const stamp = Date.now();
    const userResponse = await request.post(`${API_URL}/users/internal`, {
      data: {
        email: `qa-license-${stamp}@ecg.test`,
        name: "QA License User",
        password: "StrongPass123!",
        role: "doctor",
      },
      headers: authHeaders(owner.token, owner.csrfToken),
    });
    expect(userResponse.ok(), "Owner should create temporary internal user").toBeTruthy();
    const target = (await userResponse.json()).user as { id: string; email: string };

    await uiLogin(page, "owner");
    await navigate(page, "/owner/licenses", "Owner License Management");
    await expectPageReady(page, "Owner License Management");
    await page.getByPlaceholder("User UUID").fill(target.id);
    await page.getByRole("button", { name: "enterprise" }).click();
    await page.getByRole("button", { name: /^Grant License$/ }).click();
    await expect(page.getByText("QA License User").first()).toBeVisible({ timeout: 30_000 });
    await page.getByPlaceholder("Search user/email...").fill(target.email);
    await expect(page.getByText(target.email)).toBeVisible();
  });

  test("AI Clinical Copilot workspace activates every visible action @smoke", async ({ page }) => {
    const runtime = attachStrictRuntimeDiagnostics(page);
    await installCopilotVoiceMocks(page, ["mock voice transcript"]);
    await page.addInitScript(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    });

    const loginResponse = await page.request.post(`${API_URL}/auth/login`, {
      data: { email: "doctor@ecginsight.com", password: "password", rememberMe: true },
    });
    if (!loginResponse.ok()) throw new Error(`Browser-context doctor login should succeed: ${await loginResponse.text()}`);
    const loginPayload = await loginResponse.json();
    await page.route("**/api/auth/refresh", async (route) => {
      await route.fulfill({ contentType: "application/json", json: loginPayload, status: 200 });
    });
    await page.goto("/copilot");
    await expectPageReady(page, "Clinical Copilot Workspace");

    const composer = page.getByPlaceholder(/Message the assistant|Ask about ECG/i);
    await page.getByRole("button", { name: "Voice" }).last().click();
    await expect(composer).toHaveValue(/mock voice transcript/i, { timeout: 15_000 });
    await disableCopilotVoiceMode(page);

    await uploadCopilotAttachment(page, {
      buffer: Buffer.from("ECG rhythm strip PR interval QRS QTc ST depression"),
      buttonName: "Upload ECG",
      mimeType: "application/pdf",
      name: "qa-resting-ecg.pdf",
    });

    await uploadCopilotAttachment(page, {
      buffer: Buffer.from("89504e470d0a1a0a0000000d49484452", "hex"),
      buttonName: "Upload Image",
      mimeType: "image/png",
      name: "qa-medical-image.png",
    });

    await uploadCopilotAttachment(page, {
      buffer: Buffer.from("Troponin 0.42 potassium 5.7 ECG irregular rhythm"),
      buttonName: "Upload Files",
      mimeType: "text/plain",
      name: "qa-labs.txt",
    });

    async function sendCopilotMessage(prompt: string) {
      await waitForCopilotIdle(page);
      await composer.fill(prompt);
      await expect(composer).toHaveValue(prompt, { timeout: 10_000 });
      await clickCopilotStreamingAction(page, "Send");
    }

    await sendCopilotMessage("Please review the uploaded ECG, image, and lab files.");
    await expect(page.getByText(/received the ECG|analyzing it now|I've reviewed the material|reviewed the material|uploaded|qa-resting-ecg|Happy to help/i).first()).toBeVisible({ timeout: 45_000 });

    await sendCopilotMessage("What causes AF and how should I think about risk?");
    await expect(page.getByText(/atrial fibrillation|irregular rhythm|stroke risk/i).first()).toBeVisible({ timeout: 45_000 });
    await expect(page.getByText(/Short Answer|Confidence Score|Knowledge Base/i)).toHaveCount(0);

    await sendCopilotMessage("Using the files I uploaded earlier, what should I re-check?");
    await expect(page.getByText(/reviewed the material|qa-resting-ecg|qa-labs/i).first()).toBeVisible({ timeout: 45_000 });

    await exportCopilotConversation(page, "pdf");
    await exportCopilotConversation(page, "txt");

    await page.getByRole("button", { name: "Share" }).click();
    await expect(page.getByText(/Share sheet opened|Conversation deep link and text copied|Conversation text downloaded/)).toBeVisible({ timeout: 20_000 });

    await clickCopilotStreamingAction(page, "Regenerate");
    await expect(page.getByText(/atrial fibrillation|reviewed the material|received the ECG/i).first()).toBeVisible({ timeout: 45_000 });
    await clickCopilotStreamingAction(page, "Continue");
    await expect(page.getByText(/atrial fibrillation|reviewed the material|received the ECG/i).first()).toBeVisible({ timeout: 45_000 });

    runtime.assertClean();
  });

  test("ECG Pro Viewer exposes viewer controls, annotations, AI explainability, and report actions", async ({ page, request }) => {
    const fixture = await createClinicalFixture(request, { analyze: true, report: false });
    await bootstrapAuthenticatedPage(page, "doctor");
    await page.goto(`/ecg-cases/${fixture.caseId}`, { timeout: 30_000, waitUntil: "domcontentloaded" });
    await expect(page.getByText(/Loading ECG case/i)).toHaveCount(0, { timeout: 45_000 });
    await expect(page.getByText(/ECG Measurements|AI Findings|Explainability|ECG Case/).first()).toBeVisible({ timeout: 60_000 });
    await expect(page.getByRole("button", { name: /Run AI|Generate Report|Review|Process/i }).first()).toBeVisible();
    await page.getByRole("button", { name: /Generate Report/i }).first().click();
    await navigate(page, "/reports", "Reports Workflow");
    await expect(page.getByText(/Report ID|Clinical Reports/).first()).toBeVisible({ timeout: 30_000 });
  });

  test("notifications, filters, dialogs, search, and settings persistence work", async ({ page, request }) => {
    const doctor = await apiLogin(request, "doctor");
    const notification = await request.post(`${API_URL}/notifications`, {
      data: { message: "QA notification from Playwright.", title: "QA Playwright Notification", type: "INFO" },
      headers: authHeaders(doctor.token, doctor.csrfToken),
    });
    expect(notification.ok()).toBeTruthy();

    await uiLogin(page, "doctor");
    await navigate(page, "/notifications", /Alerts|Notifications/);
    await expectPageReady(page, /Alerts|Notifications/);
    await page.getByPlaceholder("Search notifications...").fill("QA Playwright");
    await expect(page.getByText("QA Playwright Notification").first()).toBeVisible({ timeout: 30_000 });
    await page.getByRole("button", { name: "All", exact: true }).first().click();
    await page.getByRole("button", { name: "Read" }).first().click();
    await page.getByRole("button", { name: "Clear" }).first().click();

    await navigate(page, "/settings", "Workspace Settings");
    await expectPageReady(page, "Workspace Settings");
    await page.getByText("Reduce Motion").click();
    await expect(page.getByText("Workspace setting saved.")).toBeVisible({ timeout: 20_000 });
    await navigate(page, "/settings", "Workspace Settings");

    await page.getByLabel("Global search").fill("QA");
    await expect(page.getByLabel("Global search")).toHaveValue("QA");
  });
});
