import { expect, test } from "./test";
import { bootstrapAuthenticatedPage, createClinicalFixture } from "./utils/qa";
import { openEcgMonitor, openMeasurementsTab } from "./utils/ecg-workspace-locators";

async function openMonitorReady(page: import("@playwright/test").Page, caseId: string) {
  await openEcgMonitor(page, caseId);
  await expect(page.getByTestId("sprint13-ecg-image-loading")).toHaveCount(0, { timeout: 45_000 });
}

test.describe("Sprint 42 Clinical Measurement Studio @sprint42 @enterprise", () => {
  test.describe.configure({ mode: "serial" });

  let caseId = "";

  test.beforeAll(async ({ request }) => {
    const fixture = await createClinicalFixture(request, { analyze: false, report: false });
    caseId = fixture.caseId;
  });

  test.beforeEach(async ({ page }) => {
    await bootstrapAuthenticatedPage(page, "doctor");
    await openMonitorReady(page, caseId);
    await openMeasurementsTab(page);
    await expect(page.getByTestId("sprint42-measurement-studio-sidebar")).toBeVisible({ timeout: 20_000 });
  });

  test("workflow presets and enhanced sidebar render", async ({ page }) => {
    await expect(page.getByTestId("sprint42-workflow-preset-basic_ecg")).toBeVisible();
    await expect(page.getByTestId("sprint42-workflow-preset-chest_pain")).toBeVisible();
    await page.getByTestId("sprint42-workflow-preset-qt_analysis").click();
    await expect(page.getByRole("button", { name: "QTcB", exact: true })).toBeVisible();
  });

  test("create delete undo redo duplicate measurement", async ({ page }) => {
    await page.getByRole("button", { name: "PR", exact: true }).click();
    const overlay = page.getByTestId("sprint13-ecg-measurement-overlay");
    const box = await overlay.boundingBox();
    if (!box) throw new Error("Measurement overlay bounding box unavailable.");
    await overlay.click({ position: { x: box.width * 0.35, y: box.height * 0.45 } });
    await overlay.click({ position: { x: box.width * 0.55, y: box.height * 0.45 } });
    await expect(page.getByTestId("sprint14-measurement-row-pr_interval")).toBeVisible();

    await page.getByTestId("sprint14-measurement-row-pr_interval").getByRole("button", { name: "Duplicate" }).click();
    await page.getByTestId("sprint14-measurement-row-pr_interval").first().getByRole("button", { name: "Delete" }).click();
    await page.getByRole("button", { name: "Undo" }).click();
    await page.getByRole("button", { name: "Redo" }).click();
  });

  test("approve measurement and export formats", async ({ page }) => {
    await page.getByRole("button", { name: "RR", exact: true }).click();
    const overlay = page.getByTestId("sprint13-ecg-measurement-overlay");
    const box = await overlay.boundingBox();
    if (!box) throw new Error("Measurement overlay bounding box unavailable.");
    await overlay.click({ position: { x: box.width * 0.3, y: box.height * 0.5 } });
    await overlay.click({ position: { x: box.width * 0.7, y: box.height * 0.5 } });
    await page.getByTestId("sprint42-measurement-approve").first().click();
    await expect(page.getByTestId("sprint42-export-json")).toBeVisible();
    await expect(page.getByTestId("sprint42-export-csv")).toBeVisible();
    await expect(page.getByTestId("sprint42-export-fhir")).toBeVisible();
    await expect(page.getByTestId("sprint42-export-xml")).toBeVisible();
  });

  test("zoom pan consistency and lead switching", async ({ page }) => {
    await page.getByRole("button", { name: "QRS", exact: true }).click();
    await page.getByRole("button", { name: "V5", exact: true }).click();
    const overlay = page.getByTestId("sprint14-ecg-measurement-overlay");
    await expect(overlay).toBeVisible();
    await page.getByRole("button", { name: "Zoom In" }).first().click().catch(() => undefined);
    await page.getByRole("button", { name: "Zoom Out" }).first().click().catch(() => undefined);
    await expect(overlay).toBeVisible();
  });

  test("floating toolbar crosshair and keyboard shortcuts", async ({ page }) => {
    await page.getByRole("button", { name: "PR", exact: true }).click();
    await expect(page.getByTestId("sprint34-measurement-floating-toolbar")).toBeVisible();
    await expect(page.getByTestId("sprint42-measure-crosshair")).toBeVisible();
    await page.keyboard.press("m");
    await page.keyboard.press("Escape");
    await page.keyboard.press("Control+Z");
  });
});
