import { expect, test } from "./test";
import { bootstrapAuthenticatedPage, createClinicalFixture, type ClinicalFixture } from "./utils/qa";

async function loginDoctorPage(page: import("@playwright/test").Page) {
  await bootstrapAuthenticatedPage(page, "doctor");
}

async function openEcgMonitorReady(page: import("@playwright/test").Page, caseId: string) {
  await page.goto(`/ecg-monitor/${caseId}`, { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("sprint13-ecg-monitor-loading")).toHaveCount(0, { timeout: 45_000 });
  await expect(page.getByTestId("sprint13-ecg-monitor-ready")).toBeVisible({ timeout: 45_000 });
}

test.describe("Sprint 13 ECG Monitor Workspace @sprint13", () => {
  test.describe.configure({ mode: "serial" });

  let fixture: ClinicalFixture & { csrfToken?: string; token: string };

  test.beforeAll(async ({ request }) => {
    fixture = await createClinicalFixture(request, { analyze: false, report: false });
  });

  test.beforeEach(async ({ page }) => {
    await loginDoctorPage(page);
  });

  test("ecg monitor workspace renders viewer foundation with toolbar and dockable panels", async ({ page }) => {
    await openEcgMonitorReady(page, fixture.caseId);
    await expect(page.getByTestId("sprint13-ecg-viewer-toolbar")).toBeVisible();
    await expect(page.getByText("ECG Pro Viewer & Monitor Workspace")).toBeVisible();
    await expect(page.getByText("Patient Information")).toBeVisible();
    await expect(page.getByText("Study Information")).toBeVisible();
    await expect(page.getByTestId("sprint13-ecg-clinical-findings-panel")).toBeVisible();
    await expect(page.getByTestId("sprint13-ecg-measurements-panel")).toBeVisible();
    await expect(page.getByTestId("sprint13-ecg-viewer-timeline")).toBeVisible();
    await expect(page.getByTestId("sprint13-ecg-viewer-status")).toBeVisible();
  });

  test("viewer toolbar controls adjust zoom and grid without crash", async ({ page }) => {
    await openEcgMonitorReady(page, fixture.caseId);
    await page.getByRole("button", { name: "Zoom In" }).click();
    await page.getByRole("button", { name: "Fit Width" }).click();
    await page.getByRole("button", { name: "Rotate" }).click();
    await page.getByRole("button", { name: /Grid On|Grid Off/ }).click();
    await expect(page.getByTestId("sprint13-ecg-viewer-status").getByText("Grid OFF")).toBeVisible();
    await expect(page.getByText("Please reload the app to continue.")).toHaveCount(0);
  });

  test("ecg case detail exposes ECG Monitor entry point", async ({ page }) => {
    await page.goto(`/ecg-cases/${fixture.caseId}`);
    await expect(page.getByRole("button", { name: "ECG Monitor" })).toBeVisible({ timeout: 45_000 });
    await page.getByRole("button", { name: "ECG Monitor" }).click();
    await expect(page).toHaveURL(new RegExp(`/ecg-monitor/${fixture.caseId}$`));
    await expect(page.getByTestId("sprint13-ecg-monitor-loading")).toHaveCount(0, { timeout: 45_000 });
    await expect(page.getByTestId("sprint13-ecg-monitor-ready")).toBeVisible({ timeout: 45_000 });
  });

  test("measurement workspace panel and tools are available in Phase 2", async ({ page }) => {
    await openEcgMonitorReady(page, fixture.caseId);
    await expect(page.getByTestId("sprint13-ecg-measurements-panel")).toBeVisible();
    await page.getByRole("button", { name: "Measure" }).click();
    await page.getByRole("button", { name: "Caliper" }).click();
    await page.getByRole("button", { name: "Horizontal" }).click();
    await expect(page.getByTestId("sprint13-ecg-measurement-overlay")).toBeVisible();
    await expect(page.getByTestId("sprint13-ecg-viewer-status").getByText(/Tool caliper/)).toBeVisible();
    await expect(page.getByText("Please reload the app to continue.")).toHaveCount(0);
  });

  test("production viewer engine exposes pan, grid opacity, and clinical findings", async ({ page }) => {
    await openEcgMonitorReady(page, fixture.caseId);
    await expect(page.getByTestId("sprint13-ecg-pro-viewer-engine")).toBeVisible();
    await expect(page.getByTestId("sprint13-ecg-image-canvas")).toBeVisible();
    await expect(page.getByTestId("sprint13-ecg-clinical-findings-panel")).toBeVisible();
    await expect(page.getByTestId("sprint13-ecg-rhythm-strip-panel")).toBeVisible();
    await page.getByRole("button", { name: "Pan" }).click();
    await page.getByRole("button", { name: /Grid \d+%/ }).click();
    await page.getByRole("button", { name: "Fit Width" }).click();
    await expect(page.getByTestId("sprint13-ecg-viewer-status").getByText(/Resolution \d+ × \d+/)).toBeVisible();
  });
});
