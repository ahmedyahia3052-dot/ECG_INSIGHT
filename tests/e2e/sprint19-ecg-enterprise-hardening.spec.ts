import { expect, test } from "./test";
import { bootstrapAuthenticatedPage, createClinicalFixture, API_URL, authHeaders } from "./utils/qa";
import { ecgViewMode, enableDeveloperMetrics, openEcgWorkspace, toolbarButton , activateMonitorView } from "./utils/ecg-workspace-locators";

test.describe("Sprint 19 ECG Enterprise Hardening @sprint19", () => {
  test.describe.configure({ mode: "serial" });

  let caseId = "";

  test.beforeAll(async ({ request }) => {
    const fixture = await createClinicalFixture(request, { analyze: true, report: true });
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

  test("report preview and measurement view modes visible", async ({ page }) => {
    await openEcgWorkspace(page, caseId);
    await page.getByTestId("sprint30-workflow-step-final-report").click();
    await expect(page.getByTestId("sprint19-report-preview-panel")).toBeVisible({ timeout: 20_000 });
    await ecgViewMode(page, "waveform").click();
    await toolbarButton(page, "Measure").click();
    await expect(page.getByTestId("sprint19-measurement-view").or(page.getByTestId("sprint18-waveform-view"))).toBeVisible();
    await page.screenshot({ fullPage: true, path: "test-results/screenshots/sprint19-measurement-view.png" });
  });

  test("canvas monitor renders with monitor status", async ({ page }) => {
    await openEcgWorkspace(page, caseId);
    await activateMonitorView(page);
    await expect(page.getByTestId("sprint22-hospital-live-monitor").or(page.getByTestId("sprint18-live-monitor"))).toBeVisible();
    await expect(page.getByTestId("sprint22-hospital-monitor-canvas").or(page.getByTestId("sprint19-monitor-canvas"))).toBeVisible();
    await expect(page.getByTestId("sprint17-status-fps")).toBeVisible();
    await page.screenshot({ fullPage: true, path: "test-results/screenshots/sprint19-monitor-canvas.png" });
  });
});
