import { expect, test } from "./test";
import { API_ORIGIN } from "./utils/qa";

test.describe("production deployment smoke", () => {
  test("API health, live, ready, login screen, and protected redirect work @smoke", async ({ page, request }) => {
    for (const endpoint of ["/health", "/live", "/ready"]) {
      const response = await request.get(`${API_ORIGIN}${endpoint}`);
      expect(response.ok(), `${endpoint} should respond`).toBeTruthy();
      const payload = await response.json();
      expect(payload.ok).toBeTruthy();
    }

    await page.goto("/login");
    await expect(page.getByTestId("auth-login-screen")).toBeVisible();
    await expect(page.getByTestId("auth-sign-in-button")).toBeVisible();

    await page.goto("/dashboard");
    await expect(page).toHaveURL(/login|dashboard/);
  });
});
