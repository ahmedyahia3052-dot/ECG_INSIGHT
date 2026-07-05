import { expect, test } from "./test";
import { bootstrapAuthenticatedPage, createClinicalFixture, API_URL, authHeaders } from "./utils/qa";

async function openEcgWorkspace(page: import("@playwright/test").Page, caseId: string) {
  await page.goto(`/ecg-workspace?caseId=${caseId}`, { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("ecg-workspace-loading")).toHaveCount(0, { timeout: 45_000 });
  await expect(page.getByTestId("ecg-enterprise-workspace-ready")).toBeVisible({ timeout: 45_000 });
  await expect(page.getByTestId("sprint13-ecg-monitor-ready")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId("sprint21-ecg-workstation-toolbar").or(page.getByTestId("sprint18-ecg-workstation-toolbar"))).toBeVisible({ timeout: 20_000 });
}

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
    await expect(page.getByText("ECG Insight Enterprise Workstation")).toBeVisible();
    await expect(page.getByTestId("sprint21-toolbar-group-file").or(page.getByTestId("sprint18-toolbar-group-file"))).toBeVisible();
    await expect(page.getByTestId("sprint21-toolbar-group-view").or(page.getByTestId("sprint18-toolbar-group-viewer"))).toBeVisible();
    await expect(page.getByTestId("sprint21-toolbar-group-measure").or(page.getByTestId("sprint18-toolbar-group-clinical"))).toBeVisible();
    await expect(page.getByTestId("sprint21-view-mode-switcher").or(page.getByTestId("sprint18-view-mode-switcher"))).toBeVisible();
  });

  test("view mode switching: monitor, waveform, compare", async ({ page }) => {
    await openEcgWorkspace(page, caseId);
    await page.getByTestId("sprint21-view-mode-monitor").or(page.getByTestId("sprint18-view-mode-monitor")).click();
    await expect(page.getByTestId("sprint18-live-monitor")).toBeVisible();
    await page.getByTestId("sprint21-view-mode-waveform").or(page.getByTestId("sprint18-view-mode-waveform")).click();
    await expect(page.getByTestId("sprint18-waveform-view")).toBeVisible();
    await page.getByTestId("sprint21-view-mode-compare").or(page.getByTestId("sprint18-view-mode-compare")).click();
    await expect(page.getByTestId("sprint165-ecg-compare-viewer").or(page.getByTestId("sprint18-ecg-compare-overlay"))).toBeVisible();
  });

  test("playback timeline and clinical panel visible", async ({ page }) => {
    await openEcgWorkspace(page, caseId);
    await expect(page.getByTestId("sprint18-waveform-timeline")).toBeVisible();
    await expect(page.getByTestId("sprint21-clinical-right-panel").or(page.getByTestId("sprint18-clinical-right-panel"))).toBeVisible();
    await page.screenshot({ fullPage: true, path: "test-results/screenshots/sprint18-ecg-workstation.png" });
  });

  test("mini navigator and status bar remain functional", async ({ page }) => {
    await openEcgWorkspace(page, caseId);
    await page.getByTestId("sprint21-view-mode-image").or(page.getByTestId("sprint18-view-mode-image")).click();
    await expect(page.getByTestId("sprint17-ecg-mini-navigator")).toBeVisible();
    await expect(page.getByTestId("sprint17-status-zoom")).toBeVisible();
    await expect(page.getByTestId("sprint17-status-fps")).toBeVisible();
  });
});
