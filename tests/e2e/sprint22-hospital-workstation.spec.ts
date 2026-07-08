import { expect, test } from "./test";
import { bootstrapAuthenticatedPage, createClinicalFixture, API_URL, authHeaders } from "./utils/qa";
import {
  assertWorkspaceShell,
  ecgClinicalRightPanel,
  ecgStatusBar,
  ecgToolbarGroup,
  ecgViewMode,
  ecgViewModeSwitcher,
  openEcgWorkspace,
  paletteButton, activateMonitorView } from "./utils/ecg-workspace-locators";

test.describe("Sprint 22 Hospital ECG Workstation @sprint22", () => {
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

  test("hospital shell, toolbar groups, and clinical sidebar sections", async ({ page }) => {
    await openEcgWorkspace(page, caseId);
    await assertWorkspaceShell(page);
    await expect(ecgToolbarGroup(page, "file")).toBeVisible();
    await expect(ecgClinicalRightPanel(page)).toBeVisible();
    await expect(ecgClinicalRightPanel(page).getByText("Patient", { exact: true })).toBeVisible();
    await expect(ecgStatusBar(page)).toBeVisible();
    await page.screenshot({ fullPage: true, path: "test-results/screenshots/sprint22-hospital-shell.png" });
  });

  test("hospital digital monitor with canvas, mini navigator, and panel toggles", async ({ page }) => {
    await openEcgWorkspace(page, caseId);
    await activateMonitorView(page);
    await expect(page.getByTestId("sprint22-hospital-live-monitor").or(page.getByTestId("sprint18-live-monitor"))).toBeVisible();
    await expect(page.getByTestId("sprint22-monitor-mini-navigator").or(page.getByTestId("sprint28-clinical-mini-navigator"))).toBeVisible();
    await ecgViewMode(page, "image").click();
    await paletteButton(page, "Left Panel").click();
    await page.screenshot({ path: "test-results/screenshots/sprint22-hospital-monitor.png" });
  });

  test("digitized waveform mode and view mode switcher", async ({ page }) => {
    await openEcgWorkspace(page, caseId);
    await expect(ecgViewModeSwitcher(page)).toBeVisible();
    await ecgViewMode(page, "waveform").click();
    await expect(page.getByTestId("sprint18-waveform-view")).toBeVisible();
    await ecgViewMode(page, "processed").click();
    await page.screenshot({ path: "test-results/screenshots/sprint22-mode-processed.png" });
  });
});
