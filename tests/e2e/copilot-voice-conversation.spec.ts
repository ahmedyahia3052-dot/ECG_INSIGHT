import { expect, test } from "./test";
import {
  clickCopilotStreamingAction,
  navigate,
  uiLogin,
  waitForConversationReady,
  waitForCopilotIdle,
} from "./utils/qa";
import { installCopilotVoiceMocks } from "./utils/voice-mocks";
import { runtimeTimestamp, waitForRuntimeEvent, waitForStreamingFinished } from "./utils/runtime-events";

test.describe("Voice AI conversation pipeline", () => {
  test.beforeEach(async ({ page }) => {
    await installCopilotVoiceMocks(page, ["What is hypertension?", "Explain atrial fibrillation briefly"]);
    await uiLogin(page, "doctor");
  });

  test("voice mode auto-sends transcript without pressing send", async ({ page }) => {
    await navigate(page, "/copilot", "Clinical Copilot Workspace");
    await page.getByRole("button", { name: "New Chat" }).click();
    await waitForConversationReady(page);
    const after = await runtimeTimestamp(page);
    const firstResponse = page.waitForResponse((item) => item.url().includes("/copilot/chat/stream") && item.status() === 201, { timeout: 120_000 });
    await page.getByTestId("copilot-voice-mode-toggle").click();
    await firstResponse;
    await waitForStreamingFinished(page, { after, timeout: 120_000 });
    await waitForConversationReady(page, { keepVoiceMode: true });
    const thread = page.getByTestId("copilot-message-thread");
    await expect(thread.getByText(/you|hypertension|blood pressure/i).first()).toBeVisible({ timeout: 60_000 });
  });

  test("manual voice input fills composer with live transcript", async ({ page }) => {
    await installCopilotVoiceMocks(page, ["Explain atrial fibrillation briefly"]);
    await page.reload({ waitUntil: "domcontentloaded" });
    await navigate(page, "/copilot", "Clinical Copilot Workspace");
    await page.getByRole("button", { name: "Voice" }).last().click();
    const composer = page.getByTestId("copilot-composer-input").last();
    await expect(composer).toHaveValue(/atrial fibrillation/i, { timeout: 10_000 });
  });

  test("voice playback controls remain available on assistant answers", async ({ page }) => {
    await navigate(page, "/copilot", "Clinical Copilot Workspace");
    await page.getByRole("button", { name: "New Chat" }).click();
    await waitForConversationReady(page);
    const composer = page.getByTestId("copilot-composer-input").last();
    await composer.fill("What is hypertension?");
    await clickCopilotStreamingAction(page, "Send");
    await waitForCopilotIdle(page, { keepVoiceMode: true });
    await page.getByRole("button", { name: "Play answer" }).first().click();
    await expect(page.getByText(/Speaking|Voice paused/).first()).toBeVisible({ timeout: 10_000 });
    await page.getByRole("button", { name: "Stop voice" }).first().click({ force: true });
    await waitForRuntimeEvent(page, "VoiceIdle", { timeout: 30_000 });
  });

  test("topic-specific AF query does not drift to unrelated QT content", async ({ page }) => {
    await navigate(page, "/copilot", "Clinical Copilot Workspace");
    await page.getByRole("button", { name: "New Chat" }).click();
    await waitForConversationReady(page);
    const composer = page.getByTestId("copilot-composer-input").last();
    await composer.fill("AF");
    await clickCopilotStreamingAction(page, "Send");
    const thread = page.getByTestId("copilot-message-thread");
    await expect(thread.getByText(/atrial fibrillation|\bAF\b|irregular/i).first()).toBeVisible({ timeout: 60_000 });
    await expect(thread.getByText(/long QT|QT syndrome/i)).toHaveCount(0);
  });
});
