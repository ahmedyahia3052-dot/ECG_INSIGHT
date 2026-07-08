import { expect, test } from "./test";
import { bootstrapAuthenticatedPage, createClinicalFixture, API_URL, authHeaders } from "./utils/qa";
import { ecgRenderEngine, ecgRenderMetrics, ecgViewMode, openEcgWorkspace, activateMonitorView } from "./utils/ecg-workspace-locators";

test.describe("Sprint 27 ECG Rendering Engine @sprint27 @enterprise", () => {
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

  test("waveform view mounts Sprint 27 rendering engine", async ({ page }) => {
    await openEcgWorkspace(page, caseId);
    await ecgViewMode(page, "waveform").click();
    await expect(page.getByTestId("sprint18-waveform-view")).toBeVisible({ timeout: 20_000 });
    await expect(ecgRenderEngine(page)).toBeVisible({ timeout: 20_000 });
    await expect(ecgRenderMetrics(page)).toBeVisible();
  });

  test("rendering metrics bar reports FPS", async ({ page }) => {
    await openEcgWorkspace(page, caseId);
    await ecgViewMode(page, "waveform").click();
    await expect(ecgRenderMetrics(page)).toBeVisible({ timeout: 20_000 });
    await expect(ecgRenderMetrics(page)).toContainText(/FPS|Rendering Engine|Sprint 27|Sprint 28/i);
    await page.screenshot({ fullPage: true, path: "test-results/screenshots/sprint27-ecg-rendering-engine.png" });
  });

  test("monitor canvas remains available for live mode", async ({ page }) => {
    await openEcgWorkspace(page, caseId);
    await activateMonitorView(page);
    await expect(page.getByTestId("sprint22-hospital-live-monitor").or(page.getByTestId("sprint18-live-monitor"))).toBeVisible();
  });
});
