import { expect, test } from "./test";
import { bootstrapAuthenticatedPage, createClinicalFixture } from "./utils/qa";
import { ecgClinicalRightPanel, ecgDiagnosticExit, ecgFloatingPalette, ecgLeftRail, ecgStatusBar, ecgToolbar, openEcgWorkspace, toolbarButton } from "./utils/ecg-workspace-locators";

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
    await expect(ecgLeftRail(page).first()).toBeVisible({ timeout: 20_000 });
    await expect(ecgFloatingPalette(page)).toBeVisible();
    await expect(ecgToolbar(page)).toBeVisible();
    await expect(ecgClinicalRightPanel(page)).toBeVisible();
    await page.screenshot({ fullPage: false, path: "test-results/screenshots/sprint33-viewer-polish-before.png" });
  });

  test("diagnostic mode shows only ECG, floating tools, and exit", async ({ page }) => {
    await openEcgWorkspace(page, caseId);
    await toolbarButton(page, "Fullscreen").click();
    await expect(ecgDiagnosticExit(page)).toBeVisible();
    await expect(ecgStatusBar(page)).toHaveCount(0);
    await expect(ecgToolbar(page)).toHaveCount(0);
    await expect(ecgFloatingPalette(page)).toBeVisible();
    await page.screenshot({ fullPage: false, path: "test-results/screenshots/sprint33-diagnostic-mode.png" });
    await page.keyboard.press("Escape");
    await expect(ecgToolbar(page)).toBeVisible({ timeout: 10_000 });
  });
});
