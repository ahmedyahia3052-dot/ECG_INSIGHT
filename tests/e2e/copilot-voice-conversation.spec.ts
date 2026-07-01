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

  test("voice mode auto-sends transcript and resolves follow-up context", async ({ page }) => {
    await installCopilotVoiceMocks(page, ["What is hypertension?", "How is it diagnosed?"]);
    await page.goto("/copilot");
    await expect(page.getByText("Clinical Copilot Workspace")).toBeVisible({ timeout: 30_000 });
    await page.getByRole("button", { name: "New Chat" }).click();
    await page.getByRole("button", { name: "Voice mode" }).click();

    const firstResponse = page.waitForResponse((item) => item.url().includes("/copilot/chat/stream") && item.status() === 201, { timeout: 60_000 });
    await expect(page.getByTestId("copilot-live-transcript")).toContainText(/hypertension/i, { timeout: 15_000 });
    await firstResponse;
    await expect(page.getByTestId("copilot-message-thread").getByText(/hypertension|blood pressure/i).first()).toBeVisible({ timeout: 60_000 });

    const secondResponse = page.waitForResponse((item) => item.url().includes("/copilot/chat/stream") && item.status() === 201, { timeout: 60_000 });
    await expect(page.getByTestId("copilot-voice-status")).toContainText(/Listening|Thinking|Speaking|Transcribing|Voice mode|Ready/i);
    await secondResponse;
    await expect(page.getByTestId("copilot-message-thread").getByText(/diagnos|blood pressure|measure|workup|hypertension/i).first()).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId("copilot-message-thread").getByText(/hypertensive emergency/i)).toHaveCount(0);
  });

  test("manual voice input fills composer with live transcript", async ({ page }) => {
    await installCopilotVoiceMocks(page, ["Explain atrial fibrillation briefly"]);
    await page.goto("/copilot");
    await expect(page.getByText("Clinical Copilot Workspace")).toBeVisible({ timeout: 30_000 });
    await page.getByRole("button", { name: "Voice" }).last().click();
    const composer = page.getByPlaceholder(/Message the assistant|Ask about ECG/i);
    await expect(composer).toHaveValue(/atrial fibrillation/i, { timeout: 10_000 });
    await expect(page.getByTestId("copilot-live-transcript")).toContainText(/atrial fibrillation/i);
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
    await page.getByRole("button", { name: "Stop voice" }).first().click();
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
