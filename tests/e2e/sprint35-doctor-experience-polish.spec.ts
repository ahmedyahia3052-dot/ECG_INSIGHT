import { expect, test } from "./test";
import { bootstrapAuthenticatedPage, createClinicalFixture } from "./utils/qa";
import {
  ecgClinicalRightPanel,
  ecgFloatingPalette,
  ecgLeftRail,
  ecgStatusBar,
  ecgToolbar,
  openEcgWorkspace,
} from "./utils/ecg-workspace-locators";

test.describe("Sprint 35 Doctor Experience Polish @sprint35-doctor", () => {
  test.describe.configure({ mode: "serial" });

  let caseId = "";

  test.beforeAll(async ({ request }) => {
    const fixture = await createClinicalFixture(request, { analyze: true });
    caseId = fixture.caseId;
  });

  test.beforeEach(async ({ page }) => {
    await bootstrapAuthenticatedPage(page, "doctor");
  });

  test("zero-clutter workspace with four-tab right panel", async ({ page }) => {
    await openEcgWorkspace(page, caseId);
    await expect(ecgLeftRail(page)).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("sprint35-clinical-tabs")).toBeVisible();
    await expect(page.getByTestId("sprint26-clinical-tab-measurements")).toBeVisible();
    await expect(page.getByTestId("sprint26-clinical-tab-ai")).toBeVisible();
    await expect(page.getByTestId("sprint26-clinical-tab-reports")).toBeVisible();
    await expect(page.getByTestId("sprint26-clinical-tab-history")).toBeVisible();
    await expect(page.getByTestId("sprint26-clinical-tab-patient")).toHaveCount(0);
    await expect(ecgToolbar(page)).toBeVisible();
    await expect(ecgClinicalRightPanel(page)).toBeVisible();
    await expect(ecgStatusBar(page)).toBeVisible();
    await page.screenshot({ fullPage: false, path: "test-results/screenshots/sprint35-doctor-workspace.png" });
  });

  test("diagnostic fullscreen keeps ECG, floating tools, and status bar", async ({ page }) => {
    await openEcgWorkspace(page, caseId);
    await page.getByTestId("sprint29-diagnostic-mode").first().click();
    await expect(page.getByTestId("sprint35-exit-diagnostic")).toBeVisible();
    await expect(ecgToolbar(page)).toHaveCount(0);
    await expect(ecgStatusBar(page)).toBeVisible();
    await page.mouse.move(400, 300);
    await expect(ecgFloatingPalette(page)).toBeVisible();
    await page.screenshot({ fullPage: false, path: "test-results/screenshots/sprint35-diagnostic-mode.png" });
    await page.keyboard.press("Escape");
    await expect(ecgToolbar(page)).toBeVisible({ timeout: 10_000 });
  });

  test("AI findings tab is separate from measurements", async ({ page }) => {
    await openEcgWorkspace(page, caseId);
    await page.getByTestId("sprint26-clinical-tab-ai").click();
    await expect(page.getByTestId("sprint35-ai-findings-tab-pane")).toBeVisible();
    await page.getByTestId("sprint26-clinical-tab-measurements").click();
    await expect(page.getByTestId("sprint35-measurements-tab-pane")).toBeVisible();
  });
});
