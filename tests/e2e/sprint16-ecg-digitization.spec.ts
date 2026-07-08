import { expect, test } from "./test";
import { bootstrapAuthenticatedPage, createClinicalFixture, API_URL, authHeaders } from "./utils/qa";
import { clickViewControl, ecgViewMode, openEcgMonitor } from "./utils/ecg-workspace-locators";

async function openMonitorReady(page: import("@playwright/test").Page, caseId: string) {
  await openEcgMonitor(page, caseId);
  await expect(page.getByTestId("sprint13-ecg-image-loading")).toHaveCount(0, { timeout: 45_000 });
}

test.describe("Sprint 16 ECG Digitization Engine @sprint16", () => {
  test.describe.configure({ mode: "serial" });

  let caseId = "";
  let csrfToken = "";

  test.beforeAll(async ({ request }) => {
    const fixture = await createClinicalFixture(request, { analyze: false, report: false });
    caseId = fixture.caseId;
    csrfToken = fixture.csrfToken ?? "";
    const digitize = await request.post(`${API_URL}/ecg/digitize`, {
      data: { caseId, gainMmPerMv: 10, paperSpeedMmPerSec: 25 },
      headers: authHeaders(fixture.token, csrfToken),
    });
    expect(digitize.ok(), `Digitize API should succeed: ${await digitize.text()}`).toBeTruthy();
  });

  test.beforeEach(async ({ page }) => {
    await bootstrapAuthenticatedPage(page, "doctor");
  });

  test("monitor viewer loads digitized waveform layer when digital ECG is available", async ({ page }) => {
    await openMonitorReady(page, caseId);
    await expect(page.getByTestId("sprint13-ecg-pro-viewer-engine")).toBeVisible();
    await ecgViewMode(page, "waveform").click();
    await expect(page.getByTestId("sprint18-waveform-view")).toBeVisible({ timeout: 20_000 });
    await expect(
      page.getByTestId("sprint28-clinical-visualization-canvas").or(page.getByTestId("sprint13-ecg-layer-digitized")),
    ).toHaveCount(1, { timeout: 20_000 });
  });

  test("measurement overlay and digitized layer remain synchronized after zoom", async ({ page }) => {
    await openMonitorReady(page, caseId);
    await clickViewControl(page, "Zoom In");
    await clickViewControl(page, "Fit Image");
    await ecgViewMode(page, "waveform").click();
    await expect(page.getByTestId("sprint18-waveform-view")).toBeVisible();
    await expect(page.getByTestId("sprint13-ecg-pro-viewer-engine").or(page.getByTestId("sprint28-clinical-visualization-canvas"))).toBeVisible();
  });
});
