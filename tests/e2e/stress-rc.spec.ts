import { expect, test } from "@playwright/test";
import { createSyntheticEcgPngBuffer } from "./utils/ecg-fixture-image";
import {
  clickCopilotStreamingAction,
  disableCopilotVoiceMode,
  exportCopilotConversation,
  uiLogin,
  uploadCopilotAttachment,
  waitForConversationReady,
} from "./utils/qa";
import { getRuntimeListenerCounts, runtimeTimestamp, waitForRuntimeEvent, waitForVoiceIdle } from "./utils/runtime-events";

test.describe("@stress RC endurance without reload", () => {
  test.setTimeout(60 * 60 * 1000);

  test("survives long copilot, upload, voice, and export sessions", async ({ page }) => {
    test.skip(!process.env["QA_RC_STRESS"], "Set QA_RC_STRESS=1 to run endurance suite.");

    await uiLogin(page, "doctor");
    await page.goto("/copilot");
    await disableCopilotVoiceMode(page);
    await waitForConversationReady(page);

    const baselineListeners = await getRuntimeListenerCounts(page);

    for (let index = 0; index < 100; index += 1) {
      await page.getByTestId("copilot-composer-input").last().fill(`Stress chat ${index + 1}: summarize sinus rhythm findings.`);
      await clickCopilotStreamingAction(page, "Send");
    }

    const png = await createSyntheticEcgPngBuffer();
    for (let index = 0; index < 25; index += 1) {
      await uploadCopilotAttachment(page, {
        buffer: png,
        buttonName: "Upload ECG",
        mimeType: "image/png",
        name: `stress-ecg-${index + 1}.png`,
      });
      await page.getByRole("button", { name: `Remove stress-ecg-${index + 1}.png` }).last().click().catch(() => undefined);
    }

    for (let index = 0; index < 20; index += 1) {
      await clickCopilotStreamingAction(page, "Regenerate");
    }

    for (let index = 0; index < 20; index += 1) {
      await exportCopilotConversation(page, index % 2 === 0 ? "pdf" : "txt");
    }

    for (let index = 0; index < 50; index += 1) {
      const after = await runtimeTimestamp(page);
      await page.getByRole("button", { name: "Voice" }).last().click();
      await waitForRuntimeEvent(page, "VoiceListeningStarted", { after, timeout: 30_000 }).catch(() => undefined);
      await page.getByRole("button", { name: "Voice" }).last().click();
      await waitForVoiceIdle(page, { after, timeout: 30_000 });
    }

    const finalListeners = await getRuntimeListenerCounts(page);
    expect(finalListeners.total ?? 0).toBeLessThanOrEqual((baselineListeners.total ?? 0) + 5);
    await waitForConversationReady(page);
  });
});
