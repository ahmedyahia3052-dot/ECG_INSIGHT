import { expect, test } from "@playwright/test";
import { API_URL } from "./utils/qa";
import { installCopilotVoiceMocks } from "./utils/voice-mocks";

test.describe("Voice AI conversation pipeline", () => {
  test.beforeEach(async ({ page }) => {
    const loginResponse = await page.request.post(`${API_URL}/auth/login`, {
      data: { email: "doctor@ecginsight.com", password: "password", rememberMe: true },
    });
    expect(loginResponse.ok()).toBeTruthy();
    const loginPayload = await loginResponse.json();
    await page.route("**/api/auth/refresh", async (route) => {
      await route.fulfill({ contentType: "application/json", json: loginPayload, status: 200 });
    });
  });

  test("voice mode auto-sends transcript without pressing send", async ({ page }) => {
    await installCopilotVoiceMocks(page, ["What is hypertension?"]);
    await page.goto("/copilot");
    await expect(page.getByText("Clinical Copilot Workspace")).toBeVisible({ timeout: 30_000 });
    await page.getByRole("button", { name: "New Chat" }).click();
    const firstResponse = page.waitForResponse((item) => item.url().includes("/copilot/chat/stream") && item.status() === 201, { timeout: 60_000 });
    await page.getByRole("button", { name: "Voice mode" }).click();
    await firstResponse;
    const thread = page.getByTestId("copilot-message-thread");
    await expect(thread.getByText(/you|hypertension|blood pressure/i).first()).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId("copilot-voice-status")).toContainText(/Voice mode|Ready|Speaking|Thinking|Listening/i);
  });

  test("manual voice input fills composer with live transcript", async ({ page }) => {
    await installCopilotVoiceMocks(page, ["Explain atrial fibrillation briefly"]);
    await page.goto("/copilot");
    await expect(page.getByText("Clinical Copilot Workspace")).toBeVisible({ timeout: 30_000 });
    await page.getByRole("button", { name: "Voice" }).last().click();
    const composer = page.getByPlaceholder(/Message the assistant|Ask about ECG/i);
    await expect(composer).toHaveValue(/atrial fibrillation/i, { timeout: 10_000 });
  });

  test("voice playback controls remain available on assistant answers", async ({ page }) => {
    await installCopilotVoiceMocks(page, ["What is hypertension?"]);
    await page.goto("/copilot");
    await expect(page.getByText("Clinical Copilot Workspace")).toBeVisible({ timeout: 30_000 });
    await page.getByRole("button", { name: "New Chat" }).click();
    const composer = page.getByPlaceholder(/Message the assistant|Ask about ECG/i);
    await composer.fill("What is hypertension?");
    const response = page.waitForResponse((item) => item.url().includes("/copilot/chat/stream") && item.status() === 201, { timeout: 60_000 });
    await page.getByRole("button", { name: "Send" }).click();
    await response;
    await expect(page.getByText("Ready").first()).toBeVisible({ timeout: 60_000 });
    await page.getByRole("button", { name: "Play answer" }).first().click();
    await expect(page.getByText(/Speaking|Voice paused/).first()).toBeVisible({ timeout: 10_000 });
    await page.getByRole("button", { name: "Stop voice" }).first().click({ force: true });
  });

  test("topic-specific AF query does not drift to unrelated QT content", async ({ page }) => {
    await page.goto("/copilot");
    await expect(page.getByText("Clinical Copilot Workspace")).toBeVisible({ timeout: 30_000 });
    await page.getByRole("button", { name: "New Chat" }).click();
    const composer = page.getByPlaceholder(/Message the assistant|Ask about ECG/i);
    await composer.fill("AF");
    const response = page.waitForResponse((item) => item.url().includes("/copilot/chat/stream") && item.status() === 201, { timeout: 60_000 });
    await page.getByRole("button", { name: "Send" }).click();
    await response;
    const thread = page.getByTestId("copilot-message-thread");
    await expect(thread.getByText(/atrial fibrillation|\bAF\b|irregular/i).first()).toBeVisible({ timeout: 60_000 });
    await expect(thread.getByText(/long QT|QT syndrome/i)).toHaveCount(0);
  });
});
