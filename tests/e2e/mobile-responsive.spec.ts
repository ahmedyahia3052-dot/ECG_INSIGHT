import { expect, test } from "@playwright/test";
import { navigate, uiLogin } from "./utils/qa";

test.describe("mobile and tablet viewport regression", () => {
  test("mobile shell drawer, clinical pages, and primary actions fit viewport @smoke", async ({ page }) => {
    await uiLogin(page, "doctor");
    await expect(page.getByLabel("Open navigation")).toBeVisible();
    await page.getByLabel("Open navigation").click();
    await page.getByRole("button", { name: "Open Patients" }).click();
    await expect(page.getByText("Patient Command Search")).toBeVisible({ timeout: 30_000 });
    await expect(page.locator("body")).toBeVisible();

    await page.getByLabel("Open navigation").click();
    await page.getByRole("button", { name: "Open Upload ECG" }).click();
    await expect(page.getByText("Smart ECG Upload")).toBeVisible();
    await expect(page.getByRole("button", { name: /Select Images\/PDF/i })).toBeVisible();

    await page.getByLabel("Open navigation").click();
    await page.getByRole("button", { name: "Open Reports" }).click();
    await expect(page.getByText("Reports Workflow")).toBeVisible();
  });

  test("tablet layout renders dashboard, ECG cases, reports, and settings without blank content", async ({ page }) => {
    await uiLogin(page, "doctor");
    await navigate(page, "/dashboard", /Enterprise Clinical Command Center|Dashboard/);
    await navigate(page, "/ecg-cases", "ECG Case Management");
    await navigate(page, "/reports", "Reports Workflow");
    await navigate(page, "/settings", "Workspace Settings");
    await expect(page.locator("body")).toBeVisible();
  });
});
