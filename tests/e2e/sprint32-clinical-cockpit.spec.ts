import { expect, test } from "./test";
import { bootstrapAuthenticatedPage, createClinicalFixture } from "./utils/qa";
import { ecgClinicalRightPanel, ecgDiagnosticExit, ecgLeftRail, ecgStatusBar, ecgToolbar, openEcgWorkspace, toolbarButton } from "./utils/ecg-workspace-locators";

test.describe("Sprint 32 Clinical Cockpit @sprint32", () => {
  test.describe.configure({ mode: "serial" });

  let caseId = "";

  test.beforeAll(async ({ request }) => {
    const fixture = await createClinicalFixture(request, { analyze: true });
    caseId = fixture.caseId;
  });

  test.beforeEach(async ({ page }) => {
    await bootstrapAuthenticatedPage(page, "doctor");
  });

  test("clinical summary panel, compact toolbar, and tabbed right panel", async ({ page }) => {
    await openEcgWorkspace(page, caseId);
    await expect(ecgLeftRail(page).first()).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("sprint32-lead-selector-grid")).toBeVisible();
    await expect(ecgToolbar(page)).toBeVisible();
    await expect(ecgClinicalRightPanel(page)).toBeVisible();
    await page.getByTestId("sprint26-clinical-tab-ai").click();
    await expect(page.getByTestId("sprint30-ai-review-panel")).toBeVisible();
    await page.screenshot({ fullPage: false, path: "test-results/screenshots/sprint32-clinical-cockpit.png" });
  });

  test("doctor mode status bar shows core telemetry", async ({ page }) => {
    await openEcgWorkspace(page, caseId);
    await expect(ecgStatusBar(page)).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("sprint17-status-fps")).toBeVisible();
    await expect(page.getByTestId("sprint28-status-gpu")).toBeVisible();
  });

  test("diagnostic fullscreen hides chrome and restores on ESC", async ({ page }) => {
    await openEcgWorkspace(page, caseId);
    await toolbarButton(page, "Fullscreen").click();
    await expect(ecgDiagnosticExit(page)).toBeVisible();
    await expect(ecgToolbar(page)).toHaveCount(0);
    await page.keyboard.press("Escape");
    await expect(ecgToolbar(page)).toBeVisible({ timeout: 10_000 });
  });
});
