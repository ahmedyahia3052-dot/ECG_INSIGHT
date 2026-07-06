import { expect, test } from "./test";
import { bootstrapAuthenticatedPage, createClinicalFixture, API_URL, authHeaders } from "./utils/qa";

async function openEcgWorkspace(page: import("@playwright/test").Page, caseId: string) {
  await page.goto(`/ecg-workspace?caseId=${caseId}`, { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("ecg-workspace-loading")).toHaveCount(0, { timeout: 45_000 });
  await expect(page.getByTestId("ecg-enterprise-workspace-ready")).toBeVisible({ timeout: 45_000 });
  await expect(
    page.getByTestId("sprint26-hospital-workstation-ready").or(page.getByTestId("sprint25-hospital-workstation-ready")),
  ).toBeVisible({ timeout: 20_000 });
}

test.describe("Sprint 26 Hospital Layout Optimization @sprint26", () => {
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

  test("compact ribbon and mode switcher on one row", async ({ page }) => {
    await openEcgWorkspace(page, caseId);
    await expect(page.getByTestId("sprint26-compact-ribbon").or(page.getByTestId("sprint25-hospital-command-ribbon"))).toBeVisible();
    await expect(page.getByTestId("sprint26-view-mode-switcher").or(page.getByTestId("sprint25-view-mode-switcher"))).toBeVisible();
    await expect(page.getByTestId("sprint21-view-mode-image")).toBeVisible();
    await expect(page.getByTestId("sprint21-view-mode-monitor")).toBeVisible();
    await page.screenshot({ path: "test-results/screenshots/sprint26-compact-layout.png" });
  });

  test("tabbed clinical panel and compact status bar", async ({ page }) => {
    await openEcgWorkspace(page, caseId);
    await expect(page.getByTestId("sprint26-clinical-tabbed-panel").or(page.getByTestId("sprint25-clinical-right-panel"))).toBeVisible();
    await expect(page.getByTestId("sprint26-clinical-tab-measurements")).toBeVisible();
    await page.getByTestId("sprint26-clinical-tab-ai").click();
    await expect(page.getByTestId("sprint25-clinical-card-diagnosis")).toBeVisible();
    await expect(page.getByTestId("sprint26-compact-status-bar").or(page.getByTestId("sprint24-hospital-status-bar"))).toBeVisible();
  });

  test("layout shell maximizes viewer and left rail collapses", async ({ page }) => {
    await openEcgWorkspace(page, caseId);
    await expect(page.getByTestId("sprint26-workstation-layout").or(page.getByTestId("sprint25-workstation-dock"))).toBeVisible();
    await page.getByTestId("sprint22-toggle-left-panel").click();
    await expect(page.getByTestId("sprint13-ecg-image-canvas").first()).toBeVisible();
    await page.getByTestId("sprint21-view-mode-monitor").click();
    await expect(page.getByTestId("sprint22-hospital-live-monitor")).toBeVisible();
    await page.screenshot({ path: "test-results/screenshots/sprint26-maximized-viewer.png" });
  });
});
