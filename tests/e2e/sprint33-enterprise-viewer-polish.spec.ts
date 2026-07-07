import { expect, test } from "./test";
import { bootstrapAuthenticatedPage, createClinicalFixture } from "./utils/qa";
import { ecgClinicalRightPanel, ecgStatusBar, ecgToolbar, openEcgWorkspace } from "./utils/ecg-workspace-locators";

test.describe("Sprint 33 Enterprise Viewer Polish @sprint33", () => {
  test.describe.configure({ mode: "serial" });

  let caseId = "";

  test.beforeAll(async ({ request }) => {
    const fixture = await createClinicalFixture(request, { analyze: true });
    caseId = fixture.caseId;
  });

  test.beforeEach(async ({ page }) => {
    await bootstrapAuthenticatedPage(page, "doctor");
  });

  test("compact toolbar, floating palette, and clinical summary defaults", async ({ page }) => {
    await openEcgWorkspace(page, caseId);
    await expect(page.getByTestId("sprint33-clinical-summary-panel")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("sprint33-floating-tool-palette")).toBeVisible();
    await expect(ecgToolbar(page)).toBeVisible();
    await expect(ecgClinicalRightPanel(page)).toBeVisible();
    await expect(page.getByTestId("sprint33-clinical-tabs")).toBeVisible();
    await page.screenshot({ fullPage: false, path: "test-results/screenshots/sprint33-viewer-polish-before.png" });
  });

  test("diagnostic mode shows only ECG, floating tools, and exit", async ({ page }) => {
    await openEcgWorkspace(page, caseId);
    await page.getByTestId("sprint29-diagnostic-mode").first().click();
    await expect(page.getByTestId("sprint29-exit-diagnostic")).toBeVisible();
    await expect(ecgStatusBar(page)).toHaveCount(0);
    await expect(ecgToolbar(page)).toHaveCount(0);
    await expect(page.getByTestId("sprint33-floating-tool-palette")).toBeVisible();
    await page.screenshot({ fullPage: false, path: "test-results/screenshots/sprint33-diagnostic-mode.png" });
    await page.keyboard.press("Escape");
    await expect(ecgToolbar(page)).toBeVisible({ timeout: 10_000 });
  });
});
