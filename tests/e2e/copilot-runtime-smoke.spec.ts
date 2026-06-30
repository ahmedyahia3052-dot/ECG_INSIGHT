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
      Object.assign(window, { SpeechRecognition: MockSpeechRecognition, webkitSpeechRecognition: MockSpeechRecognition });
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
    await expectNoErrorBoundary();

    await page.getByRole("button", { name: "New Chat" }).click();
    await expectNoErrorBoundary();

    const composer = page.getByPlaceholder(/Ask about ECG interpretation/i);
    await page.getByRole("button", { name: "Voice" }).last().click();
    await expect(composer).toHaveValue(/runtime smoke voice transcript/i);

    const fileChooser = page.waitForEvent("filechooser");
    await page.getByRole("button", { name: "Upload Files" }).last().click();
    await (await fileChooser).setFiles({ buffer: Buffer.from("Troponin 0.42 potassium 5.7 ECG irregular rhythm"), mimeType: "text/plain", name: "runtime-labs.txt" });
    await expect(page.getByText("runtime-labs.txt")).toBeVisible({ timeout: 30_000 });
    await expectNoErrorBoundary();

    const ecgChooser = page.waitForEvent("filechooser");
    await page.getByRole("button", { name: "Upload ECG" }).last().click();
    await (await ecgChooser).setFiles({ buffer: Buffer.from("ECG rhythm strip PR interval QRS QTc ST depression"), mimeType: "application/pdf", name: "runtime-ecg.pdf" });
    await expect(page.getByText("runtime-ecg.pdf")).toBeVisible({ timeout: 30_000 });
    await expectNoErrorBoundary();

    await composer.fill("Runtime smoke test: summarize uploaded ECG and labs with citations.");
    const streamResponse = page.waitForResponse((response) => response.url().includes("/copilot/chat/stream") && response.status() === 201, { timeout: 45_000 });
    await page.getByRole("button", { name: "Send" }).click();
    await streamResponse;
    await expect(page.getByText("Ready").first()).toBeVisible({ timeout: 45_000 });
    await expect(page.getByText("AI Clinical Copilot").first()).toBeVisible({ timeout: 45_000 });
    await expect(page).toHaveURL(/\/copilot\/[^/]+$/);
    await expectNoErrorBoundary();

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
