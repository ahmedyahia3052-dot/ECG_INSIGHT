import { expect, test } from "./test";
import { bootstrapAuthenticatedPage, createClinicalFixture, API_URL, authHeaders } from "./utils/qa";
import {
  assertWorkspaceShell,
  ecgClinicalRightPanel,
  ecgStatusBar,
  ecgToolbarGroup,
  ecgViewMode,
  ecgViewModeSwitcher,
  enableDeveloperMetrics,
  openEcgWorkspace, activateMonitorView } from "./utils/ecg-workspace-locators";

test.describe("Sprint 18 ECG Clinical Workstation 2.0 @sprint18", () => {
  test.describe.configure({ mode: "serial" });

  let caseId = "";

  test.beforeAll(async ({ request }) => {
    const fixture = await createClinicalFixture(request, { analyze: false, report: false });
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

  test("workstation 2.0 shell and grouped toolbar visible", async ({ page }) => {
    await openEcgWorkspace(page, caseId);
    await assertWorkspaceShell(page);
    await expect(ecgToolbarGroup(page, "file")).toBeVisible();
    await expect(ecgToolbarGroup(page, "view")).toBeVisible();
    await expect(ecgToolbarGroup(page, "export")).toBeVisible();
    await expect(ecgViewModeSwitcher(page)).toBeVisible();
  });

  test("view mode switching: monitor, waveform, compare", async ({ page }) => {
    await openEcgWorkspace(page, caseId);
    await activateMonitorView(page);
    await expect(page.getByTestId("sprint18-live-monitor").or(page.getByTestId("sprint22-hospital-live-monitor"))).toBeVisible();
    await openEcgWorkspace(page, caseId);
    await ecgViewMode(page, "waveform").click();
    await expect(page.getByTestId("sprint18-waveform-view")).toBeVisible();
    await ecgViewMode(page, "compare").click();
    await expect(page.getByTestId("sprint165-ecg-compare-viewer").or(page.getByTestId("sprint18-ecg-compare-overlay"))).toBeVisible();
  });

  test("live monitor route and clinical panel visible", async ({ page }) => {
    await openEcgWorkspace(page, caseId);
    await expect(ecgClinicalRightPanel(page)).toBeVisible();
    await activateMonitorView(page);
    await expect(page.getByTestId("sprint22-hospital-monitor-canvas")).toBeVisible();
    await page.screenshot({ fullPage: true, path: "test-results/screenshots/sprint18-ecg-workstation.png" });
  });

  test("mini navigator and status bar remain functional", async ({ page }) => {
    await openEcgWorkspace(page, caseId);
    await ecgViewMode(page, "image").click();
    await expect(page.getByTestId("sprint13-ecg-pro-viewer-engine")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("sprint17-status-zoom")).toBeVisible();
    await expect(ecgStatusBar(page)).toBeVisible();
  });
});
