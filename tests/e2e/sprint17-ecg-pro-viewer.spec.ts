import { expect, test } from "./test";
import { bootstrapAuthenticatedPage, createClinicalFixture, API_URL, authHeaders } from "./utils/qa";
import {
  clickViewControl,
  ecgStatusBar,
  ecgViewMode,
  ensureLeftPanelOpen,
  openEcgWorkspace,
  paletteButton,
  toolbarButton,
} from "./utils/ecg-workspace-locators";

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
    await expect(toolbarButton(page, "Export PNG")).toBeVisible();
    await expect(paletteButton(page, "Zoom In")).toBeVisible();
    await ecgViewMode(page, "waveform").click();
    await expect(page.getByTestId("sprint18-waveform-view")).toBeVisible({ timeout: 20_000 });
    await expect(toolbarButton(page, "Digitize")).toBeVisible();
    await expect(page.getByTestId("sprint17-status-paper-speed")).toBeVisible();
    await expect(page.getByTestId("sprint17-status-gain")).toBeVisible();
  });

  test("clinical status bar shows sprint 17 metrics", async ({ page }) => {
    await openEcgWorkspace(page, caseId);
    await expect(page.getByTestId("sprint17-status-paper-speed")).toBeVisible();
    await expect(page.getByTestId("sprint17-status-gain")).toBeVisible();
    await expect(page.getByTestId("sprint17-status-zoom")).toBeVisible();
    await expect(page.getByTestId("sprint17-status-lead")).toBeVisible();
    await expect(page.getByTestId("sprint17-status-fps")).toBeVisible();
    await expect(ecgStatusBar(page)).toBeVisible();
  });

  test("mini navigator and zoom interactions are visible", async ({ page }) => {
    await openEcgWorkspace(page, caseId);
    await expect(
      page.getByTestId("sprint32-ecg-mini-navigator").or(page.getByTestId("sprint17-ecg-mini-navigator")).or(page.getByTestId("sprint28-clinical-mini-navigator")),
    ).toBeVisible();
    await ecgViewMode(page, "image").click();
    await clickViewControl(page, "Zoom In");
    await expect(page.getByTestId("sprint17-status-zoom")).toContainText(/\d+%/);
    await page.screenshot({ fullPage: true, path: "test-results/screenshots/sprint17-ecg-pro-viewer.png" });
  });

  test("lead focus mode toggle is available", async ({ page }) => {
    await openEcgWorkspace(page, caseId);
    await ensureLeftPanelOpen(page);
    await expect(page.getByText(/Lead Focus/)).toBeVisible();
  });
});
