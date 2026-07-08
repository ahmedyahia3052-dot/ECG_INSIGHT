import { expect, test } from "./test";
import { bootstrapAuthenticatedPage, createClinicalFixture } from "./utils/qa";
import { clickViewControl, openEcgMonitor, openMeasurementsTab, paletteButton, toolbarButton } from "./utils/ecg-workspace-locators";

async function openMonitorReady(page: import("@playwright/test").Page, caseId: string) {
  await openEcgMonitor(page, caseId);
  await expect(page.getByTestId("sprint13-ecg-image-loading")).toHaveCount(0, { timeout: 45_000 });
}

test.describe("Sprint 15 Clinical Measurement Engine @sprint15", () => {
  test.describe.configure({ mode: "serial" });

  let caseId = "";

  test.beforeAll(async ({ request }) => {
    const fixture = await createClinicalFixture(request, { analyze: false, report: false });
    caseId = fixture.caseId;
  });

  test.beforeEach(async ({ page }) => {
    await bootstrapAuthenticatedPage(page, "doctor");
  });

  test("professional caliper geometry and measurement presets render", async ({ page }) => {
    await openMonitorReady(page, caseId);
    await openMeasurementsTab(page);
    const panel = page.getByTestId("sprint15-ecg-measurements-panel");
    await expect(panel).toBeVisible();
    await expect(panel.getByRole("button", { name: "Multi", exact: true })).toBeVisible();
    await expect(panel.getByRole("button", { name: "Angle", exact: true })).toBeVisible();
    await expect(panel.getByRole("button", { name: "Distance", exact: true })).toBeVisible();
    await expect(panel.getByRole("button", { name: "HR", exact: true })).toBeVisible();
    await expect(panel.getByRole("button", { name: "Axis", exact: true })).toBeVisible();
  });

  test("zoom presets and export controls are available", async ({ page }) => {
    await openMonitorReady(page, caseId);
    await expect(paletteButton(page, "Zoom In")).toBeVisible();
    await expect(toolbarButton(page, "Export PDF")).toBeVisible();
    await clickViewControl(page, "Zoom In");
    await expect(page.getByText("Please reload the app to continue.")).toHaveCount(0);
  });

  test("measurement overlay remains stable after zoom and pan", async ({ page }) => {
    await openMonitorReady(page, caseId);
    await openMeasurementsTab(page);
    await page.getByTestId("sprint15-ecg-measurements-panel").getByRole("button", { name: "PR", exact: true }).click();
    await paletteButton(page, "Caliper").click();
    const overlay = page.getByTestId("sprint13-ecg-measurement-overlay");
    await expect(page.getByTestId("sprint14-ecg-measurement-overlay")).toBeVisible();
    const box = await overlay.boundingBox();
    if (!box) throw new Error("Measurement overlay bounding box unavailable.");
    await overlay.click({ position: { x: box.width * 0.35, y: box.height * 0.45 } });
    await overlay.click({ position: { x: box.width * 0.55, y: box.height * 0.45 } });
    await clickViewControl(page, "Zoom In");
    await clickViewControl(page, "Pan");
    await clickViewControl(page, "Fit Image");
    await expect(page.getByTestId("sprint14-ecg-measurement-overlay")).toBeVisible();
  });
});
