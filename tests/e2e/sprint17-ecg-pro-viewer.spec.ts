import { expect, test } from "./test";
import { bootstrapAuthenticatedPage, createClinicalFixture, API_URL, authHeaders } from "./utils/qa";

async function openEcgWorkspace(page: import("@playwright/test").Page, caseId: string) {
  await page.goto(`/ecg-workspace?caseId=${caseId}`, { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("ecg-workspace-loading")).toHaveCount(0, { timeout: 45_000 });
  await expect(page.getByTestId("ecg-enterprise-workspace-ready")).toBeVisible({ timeout: 45_000 });
  await expect(page.getByTestId("sprint13-ecg-monitor-ready")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId("sprint13-ecg-pro-viewer-engine")).toBeVisible({ timeout: 20_000 });
}

test.describe("Sprint 17 ECG Pro Viewer Enterprise @sprint17", () => {
  test.describe.configure({ mode: "serial" });

  let caseId = "";

  test.beforeAll(async ({ request }) => {
    const fixture = await createClinicalFixture(request, { analyze: false, report: false });
    caseId = fixture.caseId;
    const digitize = await request.post(`${API_URL}/ecg/digitize`, {
      data: { caseId, gainMmPerMv: 10, paperSpeedMmPerSec: 25 },
      headers: authHeaders(fixture.token, fixture.csrfToken),
    });
    expect(digitize.ok(), `Digitize API should succeed: ${await digitize.text()}`).toBeTruthy();
  });

  test.beforeEach(async ({ page }) => {
    await bootstrapAuthenticatedPage(page, "doctor");
  });

  test("enterprise toolbar exposes sprint 17 controls", async ({ page }) => {
    await openEcgWorkspace(page, caseId);
    await expect(page.getByTestId("sprint18-export-png")).toBeVisible();
    await expect(page.getByTestId("sprint18-digitize")).toBeVisible();
    await expect(page.getByTestId("sprint18-zoom-200")).toBeVisible();
    await expect(page.getByTestId("sprint18-zoom-1600")).toBeVisible();
    await expect(page.getByTestId("sprint18-speed")).toBeVisible();
    await expect(page.getByTestId("sprint18-gain")).toBeVisible();
  });

  test("clinical status bar shows sprint 17 metrics", async ({ page }) => {
    await openEcgWorkspace(page, caseId);
    await expect(page.getByTestId("sprint17-status-paper-speed")).toBeVisible();
    await expect(page.getByTestId("sprint17-status-gain")).toBeVisible();
    await expect(page.getByTestId("sprint17-status-zoom")).toBeVisible();
    await expect(page.getByTestId("sprint17-status-lead")).toBeVisible();
    await expect(page.getByTestId("sprint17-status-fps")).toBeVisible();
    await expect(page.getByTestId("sprint17-status-dpi")).toBeVisible();
  });

  test("mini navigator and zoom interactions are visible", async ({ page }) => {
    await openEcgWorkspace(page, caseId);
    await expect(page.getByTestId("sprint17-ecg-mini-navigator")).toBeVisible();
    const canvas = page.getByTestId("sprint13-ecg-pro-viewer-engine");
    await page.getByTestId("sprint18-view-mode-image").click();
    await page.getByTestId("sprint18-zoom-400").click();
    await expect(page.getByTestId("sprint17-status-zoom")).toContainText("400%");
    await page.screenshot({ fullPage: true, path: "test-results/screenshots/sprint17-ecg-pro-viewer.png" });
  });

  test("lead focus mode toggle is available", async ({ page }) => {
    await openEcgWorkspace(page, caseId);
    await expect(page.getByRole("button", { name: /Lead Focus/ })).toBeVisible();
  });
});
