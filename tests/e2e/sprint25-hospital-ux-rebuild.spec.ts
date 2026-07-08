import { expect, test } from "./test";
import { bootstrapAuthenticatedPage, createClinicalFixture, API_URL, authHeaders } from "./utils/qa";
import {
  ecgClinicalRightPanel,
  ecgLeftRail,
  ecgToolbarGroup,
  ecgViewMode,
  ecgViewModeSwitcher,
  ensureLeftPanelOpen,
  openEcgWorkspace, activateMonitorView } from "./utils/ecg-workspace-locators";

test.describe("Sprint 25 Hospital UX Rebuild @sprint25", () => {
  test.describe.configure({ mode: "serial" });

  let caseId = "";

  test.beforeAll(async ({ request }) => {
    const fixture = await createClinicalFixture(request, { analyze: true, report: false });
    caseId = fixture.caseId;
    const digitize = await request.post(`${API_URL}/ecg/digitize`, {
      data: { caseId, gainMmPerMv: 10, paperSpeedMmPerSec: 25 },
      headers: authHeaders(fixture.token, fixture.csrfToken),
    });
    expect(digitize.ok()).toBeTruthy();
  });

  test.beforeEach(async ({ page }) => {
    await bootstrapAuthenticatedPage(page, "doctor");
  });

  test("docking layout, command ribbon, and workflow timeline", async ({ page }) => {
    await openEcgWorkspace(page, caseId);
    await expect(page.getByTestId("sprint30-clinical-workflow-ribbon")).toBeVisible();
    await expect(ecgToolbarGroup(page, "file")).toBeVisible();
    await expect(ecgToolbarGroup(page, "export")).toBeVisible();
    await page.screenshot({ fullPage: false, path: "test-results/screenshots/sprint25-hospital-shell.png" });
  });

  test("clinical cards, decision panel, crosshair, and command palette", async ({ page }) => {
    await openEcgWorkspace(page, caseId);
    await ensureLeftPanelOpen(page);
    await expect(ecgLeftRail(page).first()).toBeVisible();
    await expect(ecgClinicalRightPanel(page)).toBeVisible();
    await page.getByTestId("sprint13-ecg-image-canvas").first().hover({ position: { x: 320, y: 240 } });
    await expect(page.getByTestId("sprint25-viewer-crosshair").or(page.getByTestId("sprint28-clinical-crosshair-panel"))).toBeVisible({ timeout: 10_000 });
    await page.keyboard.press("Control+K");
    await expect(page.getByTestId("sprint25-command-palette")).toBeVisible();
    await page.screenshot({ path: "test-results/screenshots/sprint25-clinical-ux.png" });
  });

  test("live monitor and view modes", async ({ page }) => {
    await openEcgWorkspace(page, caseId);
    await activateMonitorView(page);
    await expect(page.getByTestId("sprint22-hospital-live-monitor")).toBeVisible();
    await expect(ecgViewModeSwitcher(page)).toBeVisible();
    await page.getByTestId("sprint30-workflow-step-final-report").click();
    await expect(page.getByTestId("sprint19-report-preview-panel")).toBeVisible();
    await page.screenshot({ path: "test-results/screenshots/sprint25-monitor-report.png" });
  });
});
