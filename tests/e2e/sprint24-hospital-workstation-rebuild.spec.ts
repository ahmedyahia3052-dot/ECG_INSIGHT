import { expect, test } from "./test";
import { bootstrapAuthenticatedPage, createClinicalFixture, API_URL, authHeaders } from "./utils/qa";

async function openEcgWorkspace(page: import("@playwright/test").Page, caseId: string) {
  await page.goto(`/ecg-workspace?caseId=${caseId}`, { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("ecg-workspace-loading")).toHaveCount(0, { timeout: 45_000 });
  await expect(page.getByTestId("ecg-enterprise-workspace-ready")).toBeVisible({ timeout: 45_000 });
  await expect(page.getByTestId("sprint24-hospital-workstation-ready")).toBeVisible({ timeout: 20_000 });
}

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

  test("CSS grid shell, ribbon toolbar, and left navigation", async ({ page }) => {
    await openEcgWorkspace(page, caseId);
    await expect(page.getByTestId("sprint24-workstation-grid")).toBeVisible();
    await expect(page.getByTestId("sprint24-hospital-ribbon-toolbar")).toBeVisible();
    await expect(page.getByTestId("sprint24-workstation-left-nav")).toBeVisible();
    await expect(page.getByTestId("sprint21-toolbar-group-file")).toBeVisible();
    await expect(page.getByTestId("sprint21-toolbar-group-monitor")).toBeVisible();
    await page.screenshot({ fullPage: false, path: "test-results/screenshots/sprint24-hospital-shell.png" });
  });

  test("clinical sidebar, status bar, and live monitor", async ({ page }) => {
    await openEcgWorkspace(page, caseId);
    await expect(page.getByTestId("sprint24-clinical-right-panel")).toBeVisible();
    await expect(page.getByTestId("sprint24-clinical-right-panel").getByText("Export", { exact: true })).toBeVisible();
    await page.getByTestId("sprint21-view-mode-monitor").click();
    await expect(page.getByTestId("sprint22-hospital-live-monitor")).toBeVisible();
    await expect(page.getByTestId("sprint24-hospital-status-bar").or(page.getByTestId("sprint21-enterprise-status-bar"))).toBeVisible();
    await expect(page.getByTestId("sprint24-status-cpu")).toBeVisible();
    await page.screenshot({ path: "test-results/screenshots/sprint24-hospital-monitor.png" });
  });

  test("view modes including overlay and report", async ({ page }) => {
    await openEcgWorkspace(page, caseId);
    await expect(page.getByTestId("sprint24-view-mode-switcher")).toBeVisible();
    await page.getByTestId("sprint21-view-mode-overlay").click();
    await page.screenshot({ path: "test-results/screenshots/sprint24-mode-overlay.png" });
    await page.getByTestId("sprint21-view-mode-report").click();
    await expect(page.getByTestId("sprint19-report-preview-panel")).toBeVisible();
  });
});
