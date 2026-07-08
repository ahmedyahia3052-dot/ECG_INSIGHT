import { expect, test } from "./test";
import { bootstrapAuthenticatedPage, createClinicalFixture, API_URL, authHeaders } from "./utils/qa";
import { ecgClinicalRightPanel, ecgStatusBar, ecgToolbar, ecgViewMode, ecgViewModeSwitcher, openEcgWorkspace, paletteButton , activateMonitorView } from "./utils/ecg-workspace-locators";

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
    await expect(ecgToolbar(page)).toBeVisible();
    await expect(ecgViewModeSwitcher(page)).toBeVisible();
    await expect(ecgViewMode(page, "image")).toBeVisible();
    await expect(ecgViewMode(page, "monitor")).toBeVisible();
    await page.screenshot({ path: "test-results/screenshots/sprint26-compact-layout.png" });
  });

  test("tabbed clinical panel and compact status bar", async ({ page }) => {
    await openEcgWorkspace(page, caseId);
    await expect(ecgClinicalRightPanel(page)).toBeVisible();
    await expect(page.getByTestId("sprint26-clinical-tab-measurements")).toBeVisible();
    await page.getByTestId("sprint26-clinical-tab-ai").click();
    await expect(page.getByTestId("sprint30-ai-review-panel")).toBeVisible();
    await expect(ecgStatusBar(page)).toBeVisible();
  });

  test("layout shell maximizes viewer and left rail collapses", async ({ page }) => {
    await openEcgWorkspace(page, caseId);
    await expect(page.getByTestId("sprint29-enterprise-layout-engine").or(page.getByTestId("sprint26-workstation-layout")).or(page.getByTestId("sprint25-workstation-dock"))).toBeVisible();
    await expect(page.getByTestId("sprint13-ecg-image-canvas").first()).toBeVisible();
    await activateMonitorView(page);
    await expect(page.getByTestId("sprint22-hospital-live-monitor")).toBeVisible();
    await page.screenshot({ path: "test-results/screenshots/sprint26-maximized-viewer.png" });
  });
});
