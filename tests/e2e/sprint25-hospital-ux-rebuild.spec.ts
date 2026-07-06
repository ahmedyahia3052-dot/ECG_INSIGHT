import { expect, test } from "./test";
import { bootstrapAuthenticatedPage, createClinicalFixture, API_URL, authHeaders } from "./utils/qa";

async function openEcgWorkspace(page: import("@playwright/test").Page, caseId: string) {
  await page.goto(`/ecg-workspace?caseId=${caseId}`, { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("ecg-workspace-loading")).toHaveCount(0, { timeout: 45_000 });
  await expect(page.getByTestId("ecg-enterprise-workspace-ready")).toBeVisible({ timeout: 45_000 });
  await expect(
    page.getByTestId("sprint25-hospital-workstation-ready").or(page.getByTestId("sprint24-hospital-workstation-ready")),
  ).toBeVisible({ timeout: 20_000 });
}

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
    await expect(page.getByTestId("sprint25-workstation-dock")).toBeVisible();
    await expect(page.getByTestId("sprint25-hospital-command-ribbon")).toBeVisible();
    await expect(page.getByTestId("sprint25-clinical-workflow-timeline")).toBeVisible();
    await expect(page.getByTestId("sprint21-toolbar-group-digitize")).toBeVisible();
    await expect(page.getByTestId("sprint21-toolbar-group-measure")).toBeVisible();
    await page.screenshot({ fullPage: false, path: "test-results/screenshots/sprint25-hospital-shell.png" });
  });

  test("clinical cards, decision panel, crosshair, and command palette", async ({ page }) => {
    await openEcgWorkspace(page, caseId);
    await expect(page.getByTestId("sprint25-clinical-left-rail")).toBeVisible();
    await expect(page.getByTestId("sprint25-clinical-card-patient-summary")).toBeVisible();
    await expect(page.getByTestId("sprint25-clinical-right-panel")).toBeVisible();
    await expect(page.getByTestId("sprint25-clinical-card-recommendations")).toBeVisible();
    await page.getByTestId("sprint13-ecg-image-canvas").first().hover({ position: { x: 320, y: 240 } });
    await expect(page.getByTestId("sprint25-viewer-crosshair")).toBeVisible({ timeout: 10_000 });
    await page.keyboard.press("Control+K");
    await expect(page.getByTestId("sprint25-command-palette")).toBeVisible();
    await page.screenshot({ path: "test-results/screenshots/sprint25-clinical-ux.png" });
  });

  test("live monitor and view modes", async ({ page }) => {
    await openEcgWorkspace(page, caseId);
    await page.getByTestId("sprint21-view-mode-monitor").click();
    await expect(page.getByTestId("sprint22-hospital-live-monitor")).toBeVisible();
    await expect(page.getByTestId("sprint25-view-mode-switcher").or(page.getByTestId("sprint24-view-mode-switcher"))).toBeVisible();
    await page.getByTestId("sprint21-view-mode-report").click();
    await expect(page.getByTestId("sprint19-report-preview-panel")).toBeVisible();
    await page.screenshot({ path: "test-results/screenshots/sprint25-monitor-report.png" });
  });
});
