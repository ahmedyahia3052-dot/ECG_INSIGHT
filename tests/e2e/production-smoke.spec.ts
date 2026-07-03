import { expect, test } from "@playwright/test";
import { API_URL } from "./utils/qa";

test.describe("production deployment smoke", () => {
  test("API health, liveness, readiness, login screen, and protected redirect work @smoke", async ({ page, request }) => {
    for (const endpoint of ["/health", "/liveness", "/readiness"]) {
      const url = endpoint === "/readiness" ? API_URL.replace(/\/api$/, endpoint) : API_URL.replace(/\/api$/, endpoint);
      const response = await request.get(url);
      expect(response.ok(), `${endpoint} should respond`).toBeTruthy();
      const payload = await response.json();
      expect(payload.ok).toBeTruthy();
    }

    await page.goto("/login");
    await expect(page.getByText(/Welcome Back/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /Sign In/i })).toBeVisible();

    await page.goto("/dashboard");
    await expect(page).toHaveURL(/login|dashboard/);
  });
});
