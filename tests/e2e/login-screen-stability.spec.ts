import { expect, test } from "./test";
import { clearAuthState, ensureLoginScreen, logout, uiLogin } from "./utils/qa";

test.describe("LoginScreen stability", () => {
  test("survives null OAuth providers, repeated refresh, storage clears, and login/logout cycles @smoke", async ({ page }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => {
      pageErrors.push(error.message);
    });

    await page.route("**/auth/oauth/providers", async (route) => {
      await route.fulfill({
        contentType: "application/json",
        status: 200,
        body: JSON.stringify({ providers: null }),
      });
    });

    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await ensureLoginScreen(page);

    for (let index = 0; index < 12; index += 1) {
      await page.reload({ waitUntil: "domcontentloaded" });
      await expect(
        page.getByTestId("auth-sign-in-button").or(page.getByRole("button", { name: /sign in/i })).first(),
      ).toBeVisible({ timeout: 15_000 });
    }

    await page.evaluate(async () => {
      localStorage.clear();
      sessionStorage.clear();
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
      }
    });
    await clearAuthState(page);
    await ensureLoginScreen(page);

    for (let cycle = 0; cycle < 3; cycle += 1) {
      await uiLogin(page, "doctor");
      await expect(page.getByText(/Enterprise Clinical Command Center|Good Morning|Good Afternoon|Good Evening/).first()).toBeVisible({
        timeout: 15_000,
      });
      await logout(page);
    }

    expect(pageErrors.filter((message) => message.includes("filter"))).toEqual([]);
    expect(pageErrors).toEqual([]);
  });
});
