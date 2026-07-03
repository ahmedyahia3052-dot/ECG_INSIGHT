import { expect, type Page } from "@playwright/test";

export type RuntimeEventName =
  | "StreamingStarted"
  | "StreamingFinished"
  | "VoiceListeningStarted"
  | "VoiceProcessingStarted"
  | "VoicePlaybackStarted"
  | "VoiceIdle"
  | "UploadStarted"
  | "UploadFinished"
  | "OCRFinished"
  | "ViewerReady";

export async function runtimeTimestamp(page: Page) {
  return page.evaluate(() => Date.now());
}

export async function waitForRuntimeEvent(
  page: Page,
  name: RuntimeEventName,
  options: { after?: number; timeout?: number } = {},
) {
  const afterTs = options.after ?? 0;
  const timeout = options.timeout ?? 120_000;
  await page.waitForFunction(
    ({ eventName, minTs }) => {
      const log = (window as unknown as { __ECG_RUNTIME_EVENT_LOG__?: Array<{ name: string; ts: number }> }).__ECG_RUNTIME_EVENT_LOG__ ?? [];
      return log.some((entry) => entry.name === eventName && entry.ts > minTs);
    },
    { eventName: name, minTs: afterTs },
    { timeout },
  );
}

export async function waitForVoiceIdle(page: Page, options: { after?: number; timeout?: number } = {}) {
  await waitForRuntimeEvent(page, "VoiceIdle", options);
}

export async function waitForStreamingFinished(page: Page, options: { after?: number; timeout?: number } = {}) {
  await waitForRuntimeEvent(page, "StreamingFinished", options);
}

export async function waitForViewerReady(page: Page, options: { after?: number; timeout?: number } = {}) {
  await waitForRuntimeEvent(page, "ViewerReady", options);
  await expect(page.getByTestId("ecg-viewer-ready")).toBeAttached({ timeout: options.timeout ?? 60_000 });
}

export async function waitForUploadFinished(page: Page, options: { after?: number; timeout?: number } = {}) {
  await waitForRuntimeEvent(page, "UploadFinished", options);
}

export async function getRuntimeListenerCounts(page: Page) {
  return page.evaluate(() => {
    const listeners = (window as unknown as { __ECG_RUNTIME_LISTENERS__?: Array<{ name: string }> }).__ECG_RUNTIME_LISTENERS__ ?? [];
    const counts: Record<string, number> = { total: listeners.length };
    for (const listener of listeners) {
      counts[listener.name] = (counts[listener.name] ?? 0) + 1;
    }
    return counts;
  });
}
