import { expect, test } from "./test";
import { bootstrapAuthenticatedPage, createClinicalFixture } from "./utils/qa";
import { ecgClinicalRightPanel, ecgFloatingPalette, ecgStatusBar, ecgToolbar, openEcgWorkspace } from "./utils/ecg-workspace-locators";

test.describe("Sprint 33.5 Enterprise Viewer Polish @sprint335", () => {
  test.describe.configure({ mode: "serial" });

  let caseId = "";

  test.beforeAll(async ({ request }) => {
    const fixture = await createClinicalFixture(request, { analyze: true });
    caseId = fixture.caseId;
  });

  test.beforeEach(async ({ page }) => {
    await bootstrapAuthenticatedPage(page, "doctor");
  });

  test("pixel-perfect shell with compact toolbar and aligned panels", async ({ page }) => {
    await openEcgWorkspace(page, caseId);
    await expect(page.getByTestId("sprint335-clinical-summary-panel")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("sprint335-clinical-tabs")).toBeVisible();
    await expect(ecgToolbar(page)).toBeVisible();
    await expect(ecgClinicalRightPanel(page)).toBeVisible();
    await expect(page.getByTestId("sprint335-enterprise-status-bar")).toBeVisible();
    await expect(page.getByTestId("sprint24-status-patient")).toHaveCount(0);
    await page.screenshot({ fullPage: false, path: "test-results/screenshots/sprint335-viewer-polish-after.png" });
  });

  test("diagnostic mode and floating palette", async ({ page }) => {
    await openEcgWorkspace(page, caseId);
    await page.getByTestId("sprint29-diagnostic-mode").first().click();
    await expect(page.getByTestId("sprint35-exit-diagnostic").or(page.getByTestId("sprint29-exit-diagnostic"))).toBeVisible();
    await expect(ecgToolbar(page)).toHaveCount(0);
    await expect(ecgStatusBar(page)).toBeVisible();
    await page.mouse.move(400, 300);
    await expect(ecgFloatingPalette(page)).toBeVisible();
    await page.screenshot({ fullPage: false, path: "test-results/screenshots/sprint335-diagnostic-after.png" });
    await page.keyboard.press("Escape");
    await expect(ecgToolbar(page)).toBeVisible({ timeout: 10_000 });
  });
});
