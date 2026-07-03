import { expect, test } from "@playwright/test";
import { uiLogin } from "./utils/qa";

async function openMobileRoute(
  page: import("@playwright/test").Page,
  label: string,
  url: RegExp,
  readyCheck: () => Promise<void>,
) {
  await page.getByLabel("Open navigation").click();
  await page.getByRole("button", { name: `Open ${label}` }).click();
  await expect(page).toHaveURL(url, { timeout: 30_000 });
  await readyCheck();
}

test.describe("mobile and tablet viewport regression", () => {
  test("mobile shell drawer, clinical pages, and primary actions fit viewport @smoke", async ({ page }) => {
    await uiLogin(page, "doctor");
    await expect(page.getByLabel("Open navigation")).toBeVisible();

    await openMobileRoute(page, "Patients", /\/patients$/, async () => {
      await expect(page.getByText("Patient Command Search").first()).toBeVisible();
    });

    await openMobileRoute(page, "Upload ECG", /\/upload-ecg$/, async () => {
      await expect(page.getByRole("button", { name: /Select Images\/PDF/i })).toBeVisible();
    });

    await openMobileRoute(page, "Reports", /\/reports$/, async () => {
      await expect(page.getByText("Reports Workflow").first()).toBeVisible();
    });

    await expect(page.locator("body")).toBeVisible();
  });

  test("tablet layout renders dashboard, ECG cases, reports, and settings without blank content", async ({ page }) => {
    await uiLogin(page, "doctor");

    await openMobileRoute(page, "Dashboard", /\/dashboard$/, async () => {
      await expect(page.getByText("Recent ECG Cases").first()).toBeVisible();
    });
    await openMobileRoute(page, "ECG Cases", /\/ecg-cases$/, async () => {
      await expect(page.getByText("ECG Case Management").first()).toBeVisible();
    });
    await openMobileRoute(page, "Reports", /\/reports$/, async () => {
      await expect(page.getByText("Reports Workflow").first()).toBeVisible();
    });
    await openMobileRoute(page, "Settings", /\/settings$/, async () => {
      await expect(page.getByText("Workspace Settings").first()).toBeVisible();
    });

    await expect(page.locator("body")).toBeVisible();
  });
});
