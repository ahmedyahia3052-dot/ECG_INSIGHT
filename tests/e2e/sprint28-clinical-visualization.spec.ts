import { expect, test } from "./test";
import { bootstrapAuthenticatedPage, createClinicalFixture, API_URL, authHeaders } from "./utils/qa";
import { ecgStatusBar, ecgViewMode, openEcgWorkspace } from "./utils/ecg-workspace-locators";

test.describe("Sprint 28 Clinical Visualization Engine @sprint28 @enterprise", () => {
  test.describe.configure({ mode: "serial" });

  let caseId = "";

  test.beforeAll(async ({ request }) => {
    const fixture = await createClinicalFixture(request, { analyze: true, report: false });
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

  test("waveform view mounts Sprint 28 clinical canvas", async ({ page }) => {
    await openEcgWorkspace(page, caseId);
    await ecgViewMode(page, "waveform").click();
    await expect(page.getByTestId("sprint18-waveform-view")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("sprint28-clinical-visualization-canvas")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("sprint28-clinical-render-svg")).toBeVisible();
  });

  test("clinical overlays and status bar telemetry", async ({ page }) => {
    await openEcgWorkspace(page, caseId);
    await ecgViewMode(page, "waveform").click();
    await expect(page.getByTestId("sprint28-clinical-timeline")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("sprint30-clinical-workflow-ribbon")).toBeVisible();
    await expect(
      page.getByTestId("sprint32-ecg-mini-navigator").or(page.getByTestId("sprint28-clinical-mini-navigator")).or(page.getByTestId("sprint22-monitor-mini-navigator")),
    ).toBeVisible();
    await expect(ecgStatusBar(page)).toBeVisible();
    await expect(page.getByTestId("sprint17-status-zoom")).toBeVisible();
    await page.screenshot({ fullPage: true, path: "test-results/screenshots/sprint28-clinical-visualization.png" });
  });

  test("crosshair panel appears on waveform hover", async ({ page }) => {
    await openEcgWorkspace(page, caseId);
    await ecgViewMode(page, "waveform").click();
    const canvas = page.getByTestId("sprint28-clinical-visualization-canvas");
    await expect(canvas).toBeVisible({ timeout: 20_000 });
    await canvas.hover({ position: { x: 320, y: 240 } });
    await expect(page.getByTestId("sprint28-clinical-crosshair-panel")).toBeVisible({ timeout: 10_000 });
  });
});
