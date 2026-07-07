import { expect, type Page, type TestInfo } from "@playwright/test";

export type NetworkMonitor = {
  assertStable: (testInfo: TestInfo) => void;
  getFailures: () => string[];
  getSlowResponses: () => string[];
};

const SLOW_RESPONSE_MS = 15_000;

export function createNetworkMonitor(page: Page): NetworkMonitor {
  const failedRequests: string[] = [];
  const slowResponses: string[] = [];
  const serverErrors: string[] = [];

  page.on("requestfailed", (request) => {
    const failure = request.failure();
    failedRequests.push(`${request.method()} ${request.url()} :: ${failure?.errorText ?? "unknown"}`);
  });

  page.on("response", (response) => {
    const timing = response.request().timing();
    const responseEnd = timing.responseEnd ?? 0;
    const requestStart = timing.requestStart ?? 0;
    const duration = responseEnd > 0 && requestStart > 0 ? responseEnd - requestStart : 0;
    if (duration >= SLOW_RESPONSE_MS) {
      slowResponses.push(`${duration}ms ${response.request().method()} ${response.url()}`);
    }
    if (response.status() >= 500) {
      serverErrors.push(`${response.status()} ${response.request().method()} ${response.url()}`);
    }
  });

  return {
    assertStable(testInfo: TestInfo) {
      if (serverErrors.length) {
        testInfo.attach("network-server-errors", {
          body: serverErrors.join("\n"),
          contentType: "text/plain",
        });
      }
      if (failedRequests.length) {
        testInfo.attach("network-failed-requests", {
          body: failedRequests.join("\n"),
          contentType: "text/plain",
        });
      }
      if (slowResponses.length) {
        testInfo.attach("network-slow-responses", {
          body: slowResponses.join("\n"),
          contentType: "text/plain",
        });
      }
      expect(serverErrors, `Unexpected HTTP 5xx during test: ${serverErrors.join("; ")}`).toEqual([]);
    },
    getFailures: () => [...failedRequests],
    getSlowResponses: () => [...slowResponses],
  };
}

export async function waitForApiRecovery(request: import("@playwright/test").APIRequestContext, origin: string) {
  let lastError = "unknown";
  for (let attempt = 0; attempt < 6; attempt += 1) {
    try {
      const live = await request.get(`${origin}/live`, { timeout: 10_000 });
      if (live.ok()) return;
      lastError = `HTTP ${live.status()}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    await new Promise((resolve) => setTimeout(resolve, 1_500 * (attempt + 1)));
  }
  throw new Error(`API did not recover: ${lastError}`);
}
