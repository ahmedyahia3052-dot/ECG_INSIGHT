import { expect, test } from "./test";
import { ensureLoginScreen, logout, navigate, uiLogin } from "./utils/qa";

test.describe("Sprint 92 production integration @smoke", () => {
  test("doctor login navigates dashboard, upload, history, profile, settings, and logout", async ({ page }) => {
    await uiLogin(page, "doctor");
    await expect(page.getByText(/Enterprise Clinical Command Center|Dashboard/).first()).toBeVisible();

    await navigate(page, "/dashboard", /Enterprise Clinical Command Center|Dashboard/);
    await expect(page.getByRole("button", { name: /Upload ECG/i }).first()).toBeVisible();

    await navigate(page, "/upload-ecg", "Upload ECG");
    await expect(page.getByText(/Capture or upload/i).first()).toBeVisible();

    await navigate(page, "/ecg-cases", "ECG Cases");
    await expect(page.getByRole("button", { name: /new ecg case/i }).first()).toBeVisible();

    await navigate(page, "/profile", "Profile");
    await expect(page.getByText(/Account|Profile|Institution/i).first()).toBeVisible();

    await navigate(page, "/settings", "Settings");
    await expect(page.getByText("Reduce Motion")).toBeVisible();

    await logout(page);
    await ensureLoginScreen(page);
    await uiLogin(page, "doctor");
    await expect(page.getByText(/Enterprise Clinical Command Center|Dashboard/).first()).toBeVisible();
  });

  test("unauthenticated users are redirected from protected routes @smoke", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/login/);
    await ensureLoginScreen(page);
  });
});
