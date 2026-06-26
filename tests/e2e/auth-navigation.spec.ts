import { expect, test } from "@playwright/test";
import { attachA11yScan, expectPageReady, logout, navigate, uiLogin } from "./utils/qa";

test.describe("enterprise authentication and navigation", () => {
  test("owner can login, navigate all primary modules, use shell buttons, and logout @smoke", async ({ page }, testInfo) => {
    await uiLogin(page, "owner");
    await attachA11yScan(page, testInfo, "dashboard");

    await page.getByRole("button", { name: /upload ecg/i }).first().click();
    await expectPageReady(page, "Upload ECG");
    await page.getByRole("button", { name: /open dashboard|dashboard/i }).first().click();
    await expectPageReady(page, /Enterprise Clinical Command Center|Dashboard/);

    await navigate(page, "/patients", "Patient Command Search");
    await expect(page.getByRole("button", { name: /add patient|new patient/i }).first()).toBeVisible();

    await navigate(page, "/ecg-cases", "ECG Case Management");
    await expect(page.getByRole("button", { name: /new ecg case/i }).first()).toBeVisible();

    await navigate(page, "/reports", "Reports Workflow");
    await expect(page.getByRole("button", { name: /create report/i }).first()).toBeVisible();

    await navigate(page, "/notifications", "Notification Center");
    await expect(page.getByPlaceholder("Search notifications...")).toBeVisible();

    await navigate(page, "/settings", "Workspace Settings");
    await expect(page.getByText("Reduce Motion")).toBeVisible();

    await navigate(page, "/owner/licenses", "Owner License Management");
    await expect(page.getByRole("button", { name: /grant license/i })).toBeVisible();

    await page.getByRole("button", { name: "Notifications", exact: true }).click();
    await expect(page.getByText("Notification Center").first()).toBeVisible();
    await page.keyboard.press("Escape");

    await logout(page);
  });

  test("doctor is protected from owner-only license management @smoke", async ({ page }) => {
    await uiLogin(page, "doctor");
    await page.evaluate(() => window.history.pushState({}, "", "/owner/licenses"));
    await page.reload();
    await expect(page.getByText(/Welcome back|Owner access required|License Management/).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /grant license/i })).toHaveCount(0);
  });
});
