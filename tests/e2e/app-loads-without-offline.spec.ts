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

    const offlinePage = await page.request.get("/offline.html");
    expect(offlinePage.status()).toBeGreaterThanOrEqual(404);

    const serviceWorker = await page.request.get("/sw.js");
    expect(serviceWorker.status()).toBeGreaterThanOrEqual(404);
  });
});
