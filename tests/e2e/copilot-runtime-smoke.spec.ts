import { expect, test } from "@playwright/test";
import { API_URL } from "./utils/qa";

test.describe("Copilot runtime hardening", () => {
  test("chat, upload, refresh, navigation, export, and share never reach ErrorBoundary @smoke", async ({ page }) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];

    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    page.on("pageerror", (error) => pageErrors.push(`${error.message}\n${error.stack ?? ""}`));

    await page.addInitScript(() => {
      window.localStorage.setItem("ecg-insight:copilot-workspace-state", "{malformed-json");
      class MockSpeechRecognition {
        continuous = false;
        interimResults = false;
        lang = "en-US";
        onend: (() => void) | null = null;
        onerror: ((event: { error?: string }) => void) | null = null;
        onresult: ((event: { results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }> }) => void) | null = null;
        start() {
          setTimeout(() => {
            this.onresult?.({ results: [{ 0: { transcript: "runtime smoke voice transcript" }, isFinal: true }] });
            this.onend?.();
          }, 30);
        }
        stop() {
          this.onend?.();
        }
      }
      Object.assign(window, {
        SpeechRecognition: MockSpeechRecognition,
        webkitSpeechRecognition: MockSpeechRecognition,
      });
    });

    const loginResponse = await page.request.post(`${API_URL}/auth/login`, {
      data: { email: "doctor@ecginsight.com", password: "password", rememberMe: true },
    });
    expect(loginResponse.ok(), `Doctor login should succeed: ${await loginResponse.text()}`).toBeTruthy();
    const loginPayload = await loginResponse.json();
    await page.route("**/api/auth/refresh", async (route) => {
      await route.fulfill({ contentType: "application/json", json: loginPayload, status: 200 });
    });

    async function expectNoErrorBoundary() {
      await expect(page.getByText("Something went wrong")).toHaveCount(0);
      await expect(page.getByText("Please reload the app to continue.")).toHaveCount(0);
    }

    await page.goto("/copilot");
    await expect(page.getByText("Clinical Copilot Workspace")).toBeVisible({ timeout: 30_000 });
    for (const retiredWorkflow of ["Interpret ECG", "Generate Impression", "Patient Summary", "Differential Diagnosis", "Follow-up Plan", "Generate Report"]) {
      await expect(page.getByRole("button", { name: retiredWorkflow })).toHaveCount(0);
    }
    await expectNoErrorBoundary();

    await page.getByRole("button", { name: "New Chat" }).click();
    await expectNoErrorBoundary();

    const composer = page.getByPlaceholder(/Ask about ECG interpretation/i);
    async function sendAndWaitForAssistant(prompt: string, expectedText?: RegExp | string) {
      await composer.fill(prompt);
      const response = page.waitForResponse((item) => item.url().includes("/copilot/chat/stream") && item.status() === 201, { timeout: 45_000 });
      await page.getByRole("button", { name: "Send" }).click();
      await response;
      await expect(page.getByText("Ready").first()).toBeVisible({ timeout: 45_000 });
      await expect(page.getByText("AI Clinical Copilot").first()).toBeVisible({ timeout: 45_000 });
      if (expectedText) await expect(page.getByText(expectedText).first()).toBeVisible({ timeout: 45_000 });
      await expect(page).toHaveURL(/\/copilot\/[^/]+$/);
      await expectNoErrorBoundary();
    }

    await sendAndWaitForAssistant("hi", /Hello Dr/i);
    await page.getByRole("button", { name: "New Chat" }).click();
    await sendAndWaitForAssistant("What is hypertension?", /Short Answer|hypertension/i);
    await page.getByRole("button", { name: "New Chat" }).click();
    await sendAndWaitForAssistant("I have chest pain and sweating", /Urgent Triage|emergency assessment/i);
    await page.getByRole("button", { name: "New Chat" }).click();

    await page.getByRole("button", { name: "Voice" }).last().click();
    await expect(composer).toHaveValue(/runtime smoke voice transcript/i);

    const fileChooser = page.waitForEvent("filechooser");
    await page.getByRole("button", { name: "Upload Files" }).last().click();
    await (await fileChooser).setFiles({ buffer: Buffer.from("Troponin 0.42 potassium 5.7 ECG irregular rhythm"), mimeType: "text/plain", name: "runtime-labs.txt" });
    await expect(page.getByText("runtime-labs.txt").last()).toBeVisible({ timeout: 30_000 });
    await expectNoErrorBoundary();

    const ecgChooser = page.waitForEvent("filechooser");
    await page.getByRole("button", { name: "Upload ECG" }).last().click();
    await (await ecgChooser).setFiles({ buffer: Buffer.from("ECG rhythm strip PR interval QRS QTc ST depression"), mimeType: "application/pdf", name: "runtime-ecg.pdf" });
    await expect(page.getByText("runtime-ecg.pdf").last()).toBeVisible({ timeout: 30_000 });
    await expectNoErrorBoundary();

    const imageChooser = page.waitForEvent("filechooser");
    await page.getByRole("button", { name: "Upload Image" }).last().click();
    await (await imageChooser).setFiles({ buffer: Buffer.from("89504e470d0a1a0a0000000d49484452", "hex"), mimeType: "image/png", name: "runtime-image.png" });
    await expect(page.getByText("runtime-image.png").last()).toBeVisible({ timeout: 30_000 });
    await expectNoErrorBoundary();

    await sendAndWaitForAssistant("Runtime smoke test: summarize uploaded ECG, image, and labs with citations.", /Uploaded Document Review|Document Type|OCR Confidence/i);
    await sendAndWaitForAssistant("Using the files I uploaded earlier, what should I re-check?", /Uploaded Document Review|previously uploaded|runtime-labs\.txt/i);

    await page.getByRole("button", { name: "Play answer" }).first().click();
    await expect(page.getByText(/Speaking|Voice paused/).first()).toBeVisible({ timeout: 10_000 });
    await page.getByRole("button", { name: "Pause voice" }).first().click();
    await expect(page.getByText("Voice paused").first()).toBeVisible({ timeout: 10_000 });
    await page.getByRole("button", { name: "Resume voice" }).first().click();
    await page.getByRole("button", { name: "Replay answer" }).first().click();
    await page.getByRole("button", { name: "Stop voice" }).first().click();
    await page.getByRole("button", { name: "Play answer" }).first().click();
    await page.getByRole("button", { name: "Mute voice" }).first().click();
    await page.getByRole("button", { name: "Unmute voice" }).first().click();

    const conversationUrl = page.url();
    await page.reload();
    await expect(page.getByText("Clinical Copilot Workspace")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("AI Clinical Copilot").first()).toBeVisible({ timeout: 45_000 });
    await expectNoErrorBoundary();

    await page.getByRole("button", { name: "New Chat" }).click();
    await expect(page).toHaveURL(/\/copilot$/);
    await page.goto(conversationUrl);
    await expect(page).toHaveURL(/\/copilot\/[^/]+$/);
    await expect(page.getByText("AI Clinical Copilot").first()).toBeVisible({ timeout: 45_000 });
    await expect(page.getByRole("button", { name: "Export PDF" })).toBeEnabled({ timeout: 30_000 });
    await expectNoErrorBoundary();

    const pdfDownload = page.waitForEvent("download", { timeout: 30_000 }).catch(() => null);
    await page.getByRole("button", { name: "Export PDF" }).click();
    await pdfDownload;
    await expectNoErrorBoundary();

    const txtDownload = page.waitForEvent("download", { timeout: 30_000 }).catch(() => null);
    await page.getByRole("button", { name: "Export TXT" }).click();
    await txtDownload;
    await expectNoErrorBoundary();

    await page.getByRole("button", { name: "Share" }).click();
    await expect(page.getByText(/Share sheet opened|Conversation deep link and text copied|Conversation text downloaded/)).toBeVisible({ timeout: 20_000 });
    await expectNoErrorBoundary();

    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });
});
