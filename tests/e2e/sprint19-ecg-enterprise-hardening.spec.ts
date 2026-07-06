import { expect, test } from "./test";
import { bootstrapAuthenticatedPage, createClinicalFixture, API_URL, authHeaders } from "./utils/qa";

async function openEcgWorkspace(page: import("@playwright/test").Page, caseId: string) {
  await page.goto(`/ecg-workspace?caseId=${caseId}`, { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("ecg-workspace-loading")).toHaveCount(0, { timeout: 45_000 });
  await expect(page.getByTestId("ecg-enterprise-workspace-ready")).toBeVisible({ timeout: 45_000 });
  await expect(page.getByTestId("sprint23-visual-inspector-toolbar").or(page.getByTestId("sprint22-hospital-workstation-toolbar").or(page.getByTestId("sprint18-ecg-workstation-toolbar")))).toBeVisible({ timeout: 20_000 });
}

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
    await page.getByTestId("sprint21-open-report").click();
    await expect(page.getByTestId("sprint19-report-preview-panel")).toBeVisible();
    await page.getByTestId("sprint21-measurement-mode").click();
    await expect(page.getByTestId("sprint19-measurement-view")).toBeVisible();
    await page.screenshot({ fullPage: true, path: "test-results/screenshots/sprint19-measurement-view.png" });
  });

  test("canvas monitor renders with monitor status", async ({ page }) => {
    await openEcgWorkspace(page, caseId);
    await page.getByTestId("sprint21-view-mode-monitor").click();
    await expect(page.getByTestId("sprint22-hospital-live-monitor").or(page.getByTestId("sprint18-live-monitor"))).toBeVisible();
    await expect(page.getByTestId("sprint22-hospital-monitor-canvas").or(page.getByTestId("sprint19-monitor-canvas"))).toBeVisible();
    await expect(page.getByTestId("sprint19-status-monitor")).toBeVisible();
    await page.screenshot({ fullPage: true, path: "test-results/screenshots/sprint19-monitor-canvas.png" });
  });
});
