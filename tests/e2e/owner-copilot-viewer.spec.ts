import { expect, test } from "@playwright/test";
import { API_URL, apiLogin, createClinicalFixture, expectPageReady, navigate, uiLogin } from "./utils/qa";

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
      headers: { authorization: `Bearer ${owner.token}` },
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
    const consoleErrors: string[] = [];
    const failedRequests: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    page.on("requestfailed", (requestFailure) => failedRequests.push(requestFailure.url()));
    await page.addInitScript(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
      class MockSpeechRecognition {
        continuous = false;
        interimResults = false;
        lang = "en-US";
        onend: (() => void) | null = null;
        onerror: ((event: { error?: string }) => void) | null = null;
        onresult: ((event: { results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }> }) => void) | null = null;
        start() {
          setTimeout(() => {
            this.onresult?.({ results: [{ 0: { transcript: "mock voice transcript" }, isFinal: true }] });
            this.onend?.();
          }, 50);
        }
        stop() {
          this.onend?.();
        }
      }
      Object.assign(window, { SpeechRecognition: MockSpeechRecognition, webkitSpeechRecognition: MockSpeechRecognition });
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
    async function clickStreamingButton(name: string) {
      const streamResponse = page.waitForResponse((response) => response.url().includes("/copilot/chat/stream") && response.status() === 201, { timeout: 45_000 });
      await page.getByRole("button", { name }).click();
      await streamResponse;
      await expect(page.getByText("Ready").first()).toBeVisible({ timeout: 45_000 });
    }

    const composer = page.getByPlaceholder(/Ask about ECG interpretation/i);
    await page.getByRole("button", { name: "Voice" }).last().click();
    await expect(composer).toHaveValue(/mock voice transcript/i);

    const ecgChooser = page.waitForEvent("filechooser");
    await page.getByRole("button", { name: "Upload ECG" }).last().click();
    await (await ecgChooser).setFiles({ buffer: Buffer.from("ECG rhythm strip PR interval QRS QTc ST depression"), mimeType: "application/pdf", name: "qa-resting-ecg.pdf" });
    await expect(page.getByText("qa-resting-ecg.pdf")).toBeVisible({ timeout: 30_000 });

    const imageChooser = page.waitForEvent("filechooser");
    await page.getByRole("button", { name: "Upload Image" }).last().click();
    await (await imageChooser).setFiles({ buffer: Buffer.from("89504e470d0a1a0a0000000d49484452", "hex"), mimeType: "image/png", name: "qa-medical-image.png" });
    await expect(page.getByText("qa-medical-image.png")).toBeVisible({ timeout: 30_000 });

    const fileChooser = page.waitForEvent("filechooser");
    await page.getByRole("button", { name: "Upload Files" }).last().click();
    await (await fileChooser).setFiles({ buffer: Buffer.from("Troponin 0.42 potassium 5.7 ECG irregular rhythm"), mimeType: "text/plain", name: "qa-labs.txt" });
    await expect(page.getByText("qa-labs.txt")).toBeVisible({ timeout: 30_000 });

    await clickStreamingButton("Send");
    await expect(page.getByText(/Clinical Summary|AI Clinical Copilot/).first()).toBeVisible({ timeout: 45_000 });

    for (const action of ["Interpret ECG", "Generate Impression", "Patient Summary", "Differential Diagnosis", "Occupational Fitness", "Follow-up Plan"]) {
      await clickStreamingButton(action);
      await expect(page.getByText("AI Clinical Copilot").first()).toBeVisible({ timeout: 45_000 });
    }

    const reportDownload = page.waitForEvent("download", { timeout: 45_000 }).catch(() => null);
    await clickStreamingButton("Generate Report");
    await reportDownload;

    const pdfDownload = page.waitForEvent("download", { timeout: 30_000 }).catch(() => null);
    await page.getByRole("button", { name: "Export PDF" }).click();
    await pdfDownload;

    const txtDownload = page.waitForEvent("download", { timeout: 30_000 }).catch(() => null);
    await page.getByRole("button", { name: "Export TXT" }).click();
    await txtDownload;

    await page.getByRole("button", { name: "Share" }).click();
    await expect(page.getByText(/Share sheet opened|Conversation deep link and text copied|Conversation text downloaded/)).toBeVisible({ timeout: 20_000 });

    await clickStreamingButton("Regenerate");
    await expect(page.getByText("AI Clinical Copilot").first()).toBeVisible({ timeout: 45_000 });
    await clickStreamingButton("Continue");
    await expect(page.getByText("AI Clinical Copilot").first()).toBeVisible({ timeout: 45_000 });

    expect(consoleErrors).toEqual([]);
    expect(failedRequests).toEqual([]);
  });

  test("ECG Pro Viewer exposes viewer controls, annotations, AI explainability, and report actions", async ({ page, request }) => {
    const fixture = await createClinicalFixture(request, { analyze: true, report: true });
    await uiLogin(page, "doctor");
    await navigate(page, "/ecg-cases", "ECG Case Management");
    await page.getByPlaceholder(/Search case/i).fill(fixture.caseNumber ?? fixture.caseId);
    await expect(page.getByText(fixture.caseNumber ?? fixture.caseId)).toBeVisible({ timeout: 30_000 });
    await page.getByRole("button", { name: "Open" }).first().click();
    await expectPageReady(page, "ECG Case");
    await expect(page.getByText(/ECG Measurements|AI Findings|Explainability/)).toBeVisible();
    await expect(page.getByRole("button", { name: /Run AI|Generate Report|Review|Process/i }).first()).toBeVisible();
    await page.getByRole("button", { name: /Generate Report/i }).first().click();
    await navigate(page, "/reports", "Reports Workflow");
    await expect(page.getByText(/Report ID|Clinical Reports/)).toBeVisible({ timeout: 30_000 });
  });

  test("notifications, filters, dialogs, search, and settings persistence work", async ({ page, request }) => {
    const doctor = await apiLogin(request, "doctor");
    const notification = await request.post(`${API_URL}/notifications`, {
      data: { message: "QA notification from Playwright.", title: "QA Playwright Notification", type: "INFO" },
      headers: { authorization: `Bearer ${doctor.token}` },
    });
    expect(notification.ok()).toBeTruthy();

    await uiLogin(page, "doctor");
    await navigate(page, "/notifications", "Notification Center");
    await expectPageReady(page, "Notification Center");
    await page.getByPlaceholder("Search notifications...").fill("QA Playwright");
    await expect(page.getByText("QA Playwright Notification")).toBeVisible({ timeout: 30_000 });
    await page.getByRole("button", { name: "info" }).click();
    await page.getByRole("button", { name: "Read" }).first().click();
    await page.getByRole("button", { name: "Dismiss" }).first().click();

    await navigate(page, "/settings", "Workspace Settings");
    await expectPageReady(page, "Workspace Settings");
    await page.getByText("Reduce Motion").click();
    await expect(page.getByText("Workspace setting saved.")).toBeVisible({ timeout: 20_000 });
    await page.reload();
    await expect(page.getByText("Workspace Settings")).toBeVisible();

    await page.getByLabel("Global search").fill("QA");
    await expect(page.getByLabel("Global search")).toHaveValue("QA");
  });
});
