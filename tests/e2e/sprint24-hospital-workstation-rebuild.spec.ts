import { expect, test } from "./test";
import { bootstrapAuthenticatedPage, createClinicalFixture, API_URL, authHeaders } from "./utils/qa";
import { ecgClinicalRightPanel, ecgLeftRail, ecgStatusBar, ecgToolbar, ecgToolbarGroup, ecgViewMode, ecgViewModeSwitcher, enableDeveloperMetrics, openEcgWorkspace, activateMonitorView } from "./utils/ecg-workspace-locators";

test.describe("Sprint 24 Hospital Workstation Rebuild @sprint24", () => {
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

  test("CSS grid shell, compact toolbar, and unified clinical panel", async ({ page }) => {
    await openEcgWorkspace(page, caseId);
    await expect(page.getByTestId("sprint29-enterprise-layout-engine").or(page.getByTestId("sprint25-workstation-dock")).or(page.getByTestId("sprint24-workstation-grid"))).toBeVisible();
    await expect(ecgToolbar(page)).toBeVisible();
    await expect(ecgLeftRail(page).first()).toBeVisible();
    await expect(ecgToolbarGroup(page, "file")).toBeVisible();
    await page.screenshot({ fullPage: false, path: "test-results/screenshots/sprint24-hospital-shell.png" });
  });

  test("clinical sidebar, status bar, and live monitor", async ({ page }) => {
    await openEcgWorkspace(page, caseId);
    await expect(ecgClinicalRightPanel(page)).toBeVisible();
    await page.getByTestId("sprint26-clinical-tab-reports").click();
    await expect(ecgClinicalRightPanel(page).getByText("Export", { exact: true })).toBeVisible();
    await activateMonitorView(page);
    await expect(page.getByTestId("sprint22-hospital-live-monitor")).toBeVisible();
    await expect(ecgStatusBar(page)).toBeVisible();
    await expect(page.getByTestId("sprint28-status-gpu")).toBeVisible();
    await page.screenshot({ path: "test-results/screenshots/sprint24-hospital-monitor.png" });
  });

  test("view modes including overlay and report", async ({ page }) => {
    await openEcgWorkspace(page, caseId);
    await expect(ecgViewModeSwitcher(page)).toBeVisible();
    await page.getByTestId("sprint30-workflow-step-final-report").click();
    await expect(page.getByTestId("sprint19-report-preview-panel")).toBeVisible();
    await ecgViewMode(page, "overlay").click();
    await page.screenshot({ path: "test-results/screenshots/sprint24-mode-overlay.png" });
  });
});
