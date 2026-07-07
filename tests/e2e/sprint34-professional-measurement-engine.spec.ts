import { expect, test } from "./test";
import { bootstrapAuthenticatedPage, createClinicalFixture } from "./utils/qa";
import { openEcgMonitor, openMeasurementsTab } from "./utils/ecg-workspace-locators";

async function openMonitorReady(page: import("@playwright/test").Page, caseId: string) {
  await openEcgMonitor(page, caseId);
  await expect(page.getByTestId("sprint13-ecg-image-loading")).toHaveCount(0, { timeout: 45_000 });
}

test.describe("Sprint 34 Professional Measurement Engine @sprint34-measurement", () => {
  test.describe.configure({ mode: "serial" });

  let caseId = "";

  test.beforeAll(async ({ request }) => {
    const fixture = await createClinicalFixture(request, { analyze: false, report: false });
    caseId = fixture.caseId;
  });

  test.beforeEach(async ({ page }) => {
    await bootstrapAuthenticatedPage(page, "doctor");
  });

  test("live measurements panel and measurement history render", async ({ page }) => {
    await openMonitorReady(page, caseId);
    await openMeasurementsTab(page);
    await expect(page.getByTestId("sprint34-live-measurements-panel")).toBeVisible();
    await expect(page.getByTestId("sprint34-measurement-history-panel")).toBeVisible();
  });

  test("floating measurement toolbar appears in measurement mode", async ({ page }) => {
    await openMonitorReady(page, caseId);
    await openMeasurementsTab(page);
    await page.getByTestId("sprint15-ecg-measurements-panel").getByRole("button", { name: "PR", exact: true }).click();
    await expect(page.getByTestId("sprint34-measurement-floating-toolbar")).toBeVisible();
    await expect(page.getByTestId("sprint34-measure-horizontal")).toBeVisible();
    await expect(page.getByTestId("sprint34-measure-vertical")).toBeVisible();
    await expect(page.getByTestId("sprint34-measure-angle")).toBeVisible();
  });

  test("measurement overlay remains stable after caliper placement", async ({ page }) => {
    await openMonitorReady(page, caseId);
    await openMeasurementsTab(page);
    await page.getByTestId("sprint15-ecg-measurements-panel").getByRole("button", { name: "PR", exact: true }).click();
    const overlay = page.getByTestId("sprint13-ecg-measurement-overlay");
    const box = await overlay.boundingBox();
    if (!box) throw new Error("Measurement overlay bounding box unavailable.");
    await overlay.click({ position: { x: box.width * 0.35, y: box.height * 0.45 } });
    await overlay.click({ position: { x: box.width * 0.55, y: box.height * 0.45 } });
    await expect(page.getByTestId("sprint14-ecg-measurement-overlay")).toBeVisible();
  });
});
