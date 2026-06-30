import { expect, test } from "@playwright/test";

test.describe("PWA offline diagnostics", () => {
  test("shows diagnostics for backend offline, browser offline, reconnect, and disableOffline bypass @smoke", async ({ context, page }) => {
    const logs: string[] = [];
    page.on("console", (message) => {
      const text = message.text();
      if (text.includes("[ONLINE CHECK]") || text.includes("[BACKEND CHECK]") || text.includes("[OFFLINE REASON]")) {
        logs.push(text);
      }
    });

    await page.route("http://offline.test/health", async (route) => route.abort("connectionrefused"));
    await page.goto("/offline.html?apiUrl=http://offline.test/api");
    await expect(page.getByText("ECG Insight is offline")).toBeVisible();
    await expect(page.locator("#browser-online")).toHaveText("true");
    await expect(page.locator("#backend-reachable")).toHaveText("false");
    await expect(page.locator("#api-url")).toHaveText("http://offline.test/api");
    await expect(page.locator("#offline-reason")).not.toHaveText("checking");
    expect(logs.some((entry) => entry.includes("[ONLINE CHECK]"))).toBeTruthy();
    expect(logs.some((entry) => entry.includes("[BACKEND CHECK]"))).toBeTruthy();
    expect(logs.some((entry) => entry.includes("[OFFLINE REASON]"))).toBeTruthy();

    await context.setOffline(true);
    await page.evaluate(() => {
      const offlineWindow = window as Window & { recoverWhenReachable?: () => Promise<void> };
      return offlineWindow.recoverWhenReachable?.();
    });
    await expect(page.locator("#browser-online")).toHaveText("false");
    await expect(page.locator("#backend-reachable")).toHaveText("false");

    await context.setOffline(false);
    await page.unroute("http://offline.test/health");
    await page.route("http://offline.test/health", async (route) => {
      await route.fulfill({
        contentType: "application/json",
        json: { ok: true, service: "api-gateway", status: "ok" },
        status: 200,
      });
    });
    await page.evaluate(() => {
      const offlineWindow = window as Window & { recoverWhenReachable?: () => Promise<void> };
      return offlineWindow.recoverWhenReachable?.();
    });
    await expect(page).not.toHaveURL(/offline\.html/, { timeout: 15_000 });

    await page.goto("/offline.html?disableOffline=true");
    await expect(page).not.toHaveURL(/offline\.html/, { timeout: 15_000 });
  });
});
