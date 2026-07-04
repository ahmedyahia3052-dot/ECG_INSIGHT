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
    await expect(page.getByText(/Welcome Back/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /Sign In/i })).toBeVisible();

    await page.goto("/dashboard");
    await expect(page).toHaveURL(/login|dashboard/);
  });
});
