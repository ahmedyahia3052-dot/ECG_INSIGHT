import { expect, test } from "./test";
import { ensureLoginScreen, logout, uiLogin } from "./utils/qa";

test.describe("auth logout regression", () => {
  test("owner logout clears session and shows login without auto-redirect @smoke", async ({ page }) => {
    await uiLogin(page, "owner");
    await expect(page.getByText(/Enterprise Clinical Command Center|Good Morning|Good Afternoon|Good Evening/).first()).toBeVisible();

    await logout(page);

    await expect(page).toHaveURL(/\/login(\?force=1)?$/);
    await ensureLoginScreen(page);
    await expect(page.getByText(/Enterprise Clinical Command Center|Good Morning|Good Afternoon|Good Evening/)).toHaveCount(0);
  });

  test("owner can login again immediately after logout @smoke", async ({ page }) => {
    await uiLogin(page, "owner");
    await logout(page);
    await uiLogin(page, "owner");
    await expect(page.getByText(/Enterprise Clinical Command Center|Good Morning|Good Afternoon|Good Evening/).first()).toBeVisible();
  });
});
