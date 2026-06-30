import { expect, test } from "@playwright/test";
import { API_URL } from "./utils/qa";

test.describe("Application loads without offline mode", () => {
  test("dashboard opens normally and offline assets are removed @smoke", async ({ page }) => {
    const loginResponse = await page.request.post(`${API_URL}/auth/login`, {
      data: { email: "doctor@ecginsight.com", password: "password", rememberMe: true },
    });
    expect(loginResponse.ok(), `Doctor login should succeed: ${await loginResponse.text()}`).toBeTruthy();
    const loginPayload = await loginResponse.json();
    await page.route("**/api/auth/refresh", async (route) => {
      await route.fulfill({ contentType: "application/json", json: loginPayload, status: 200 });
    });

    await page.goto("/dashboard");
    await expect(page.getByText(/Dashboard|Clinical Copilot|ECG Insight/i).first()).toBeVisible({ timeout: 30_000 });
    await expect(page).not.toHaveURL(/offline\.html/);

    const serviceWorkerCount = await page.evaluate(async () => {
      if (!("serviceWorker" in navigator)) return 0;
      return (await navigator.serviceWorker.getRegistrations()).length;
    });
    expect(serviceWorkerCount).toBe(0);

    const offlineBody = await (await page.request.get("/offline.html")).text();
    expect(offlineBody).not.toMatch(/offline mode|You are offline|ecg-insight-pwa/i);

    const serviceWorkerBody = await (await page.request.get("/sw.js")).text();
    expect(serviceWorkerBody).not.toMatch(/addEventListener\s*\(\s*['"]install['"]|ecg-insight-pwa/i);
  });
});
