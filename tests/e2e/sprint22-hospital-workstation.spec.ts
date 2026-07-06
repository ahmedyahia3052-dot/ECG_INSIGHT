import { expect, test } from "./test";
import { bootstrapAuthenticatedPage, createClinicalFixture, API_URL, authHeaders } from "./utils/qa";

async function openEcgWorkspace(page: import("@playwright/test").Page, caseId: string) {
  await page.goto(`/ecg-workspace?caseId=${caseId}`, { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("ecg-workspace-loading")).toHaveCount(0, { timeout: 45_000 });
  await expect(page.getByTestId("ecg-enterprise-workspace-ready")).toBeVisible({ timeout: 45_000 });
  await expect(
    page.getByTestId("sprint23-visual-inspector-toolbar").or(page.getByTestId("sprint22-hospital-workstation-toolbar")),
  ).toBeVisible({ timeout: 20_000 });
}

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
    await expect(page.getByText("Hospital ECG Workstation")).toBeVisible();
    await expect(page.getByTestId("sprint23-visual-inspector-toolbar").or(page.getByTestId("sprint22-hospital-workstation-toolbar"))).toBeVisible();
    await expect(page.getByTestId("sprint21-toolbar-group-file")).toBeVisible();
    const panel = page.getByTestId("sprint22-clinical-right-panel");
    await expect(panel).toBeVisible();
    await expect(panel.getByText("Patient", { exact: true })).toBeVisible();
    await expect(panel.getByText("Case", { exact: true })).toBeVisible();
    await expect(panel.getByText("Intervals", { exact: true })).toBeVisible();
    await expect(panel.getByText("Rhythm", { exact: true })).toBeVisible();
    await expect(page.getByTestId("sprint21-enterprise-status-bar")).toBeVisible();
    await page.screenshot({ fullPage: true, path: "test-results/screenshots/sprint22-hospital-shell.png" });
  });

  test("hospital digital monitor with canvas, mini navigator, and panel toggles", async ({ page }) => {
    await openEcgWorkspace(page, caseId);
    await page.getByTestId("sprint21-view-mode-monitor").click();
    await expect(page.getByTestId("sprint22-hospital-live-monitor").or(page.getByTestId("sprint18-live-monitor"))).toBeVisible();
    await expect(page.getByTestId("sprint22-hospital-monitor-canvas").or(page.getByTestId("sprint19-monitor-canvas"))).toBeVisible();
    await expect(page.getByTestId("sprint22-monitor-mini-navigator")).toBeVisible();
    const toggleLeft = page.getByTestId("sprint22-toggle-left-panel");
    await toggleLeft.scrollIntoViewIfNeeded();
    await toggleLeft.click();
    await page.screenshot({ path: "test-results/screenshots/sprint22-hospital-monitor.png" });
  });

  test("digitized waveform mode and view mode switcher", async ({ page }) => {
    await openEcgWorkspace(page, caseId);
    await expect(page.getByTestId("sprint22-view-mode-switcher")).toBeVisible();
    await page.getByTestId("sprint21-view-mode-waveform").click();
    await expect(page.getByTestId("sprint18-waveform-view")).toBeVisible();
    await page.getByTestId("sprint21-view-mode-processed").click();
    await page.screenshot({ path: "test-results/screenshots/sprint22-mode-processed.png" });
  });
});
