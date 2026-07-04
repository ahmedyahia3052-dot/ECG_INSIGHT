import { expect, test } from "./test";
import { bootstrapAuthenticatedPage, createClinicalFixture } from "./utils/qa";

async function openMonitorReady(page: import("@playwright/test").Page, caseId: string) {
  await page.goto(`/ecg-monitor/${caseId}`, { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("sprint13-ecg-monitor-loading")).toHaveCount(0, { timeout: 45_000 });
  await expect(page.getByTestId("sprint13-ecg-monitor-ready")).toBeVisible({ timeout: 45_000 });
  await expect(page.getByTestId("sprint13-ecg-image-loading")).toHaveCount(0, { timeout: 45_000 });
  await expect(page.getByTestId("sprint13-ecg-layer-image")).toBeVisible({ timeout: 45_000 });
}

test.describe("Sprint 14 Clinical Calipers @sprint14", () => {
  test.describe.configure({ mode: "serial" });

  let caseId = "";

  test.beforeAll(async ({ request }) => {
    const fixture = await createClinicalFixture(request, { analyze: false, report: false });
    caseId = fixture.caseId;
  });

  test.beforeEach(async ({ page }) => {
    await bootstrapAuthenticatedPage(page, "doctor");
  });

  test("clinical measurement presets and lead selector render", async ({ page }) => {
    await openMonitorReady(page, caseId);
    await expect(page.getByTestId("sprint15-ecg-measurements-panel")).toBeVisible();
    const panel = page.getByTestId("sprint15-ecg-measurements-panel");
    await expect(panel.getByRole("button", { name: "PR", exact: true })).toBeVisible();
    await expect(panel.getByRole("button", { name: "QRS", exact: true })).toBeVisible();
    await expect(panel.getByRole("button", { name: "QT", exact: true })).toBeVisible();
    await expect(panel.getByRole("button", { name: "QTc", exact: true })).toBeVisible();
    await expect(panel.getByRole("button", { name: "RR", exact: true })).toBeVisible();
    await expect(panel.getByRole("button", { name: "PP", exact: true })).toBeVisible();
    await expect(panel.getByRole("button", { name: "ST↑", exact: true })).toBeVisible();
    await expect(panel.getByRole("button", { name: "ST↓", exact: true })).toBeVisible();
    await expect(panel.getByRole("button", { name: "Custom", exact: true })).toBeVisible();
    await expect(panel.getByRole("button", { name: "V1", exact: true })).toBeVisible();
    await expect(panel.getByRole("button", { name: "Rhythm Strip", exact: true })).toBeVisible();
  });

  test("measurement overlay supports drag placement workflow", async ({ page }) => {
    await openMonitorReady(page, caseId);
    await expect(page.locator("#error-overlay")).toHaveCount(0);
    await page.getByTestId("sprint15-ecg-measurements-panel").getByRole("button", { name: "PR", exact: true }).click();
    await page.getByRole("button", { name: "Caliper" }).click();
    await expect(page.getByTestId("sprint14-ecg-measurement-overlay")).toBeVisible();
    const overlay = page.getByTestId("sprint13-ecg-measurement-overlay");
    const box = await overlay.boundingBox();
    assertBox(box);
    await overlay.click({ position: { x: box.width * 0.35, y: box.height * 0.45 } });
    await overlay.click({ position: { x: box.width * 0.55, y: box.height * 0.45 } });
    await expect(page.getByTestId("sprint14-measurement-row-pr_interval")).toBeVisible({ timeout: 20_000 });
  });

  test("toolbar exposes export json for measurement workspace", async ({ page }) => {
    await openMonitorReady(page, caseId);
    await expect(page.getByRole("button", { name: "Export JSON" })).toBeVisible();
  });
});

function assertBox(box: { height: number; width: number; x: number; y: number } | null): asserts box is { height: number; width: number; x: number; y: number } {
  if (!box) throw new Error("Measurement overlay bounding box unavailable.");
}
