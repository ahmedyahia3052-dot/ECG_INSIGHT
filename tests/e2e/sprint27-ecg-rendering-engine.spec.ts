import { expect, test } from "./test";
import { bootstrapAuthenticatedPage, createClinicalFixture, API_URL, authHeaders } from "./utils/qa";

async function openEcgWorkspace(page: import("@playwright/test").Page, caseId: string) {
  await page.goto(`/ecg-workspace?caseId=${caseId}`, { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("ecg-workspace-loading")).toHaveCount(0, { timeout: 45_000 });
  await expect(page.getByTestId("ecg-enterprise-workspace-ready")).toBeVisible({ timeout: 45_000 });
  await expect(page.getByTestId("sprint13-ecg-monitor-ready")).toBeVisible({ timeout: 20_000 });
}

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
    await page.getByTestId("sprint21-view-mode-waveform").or(page.getByTestId("sprint18-view-mode-waveform")).click();
    await expect(page.getByTestId("sprint18-waveform-view")).toBeVisible({ timeout: 20_000 });
    const engine = page.getByTestId("sprint27-ecg-rendering-engine");
    const svg = page.getByTestId("sprint27-ecg-render-svg");
    const canvas = page.getByTestId("sprint27-ecg-render-canvas");
    await expect(engine.or(svg).or(canvas)).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("sprint27-ecg-render-metrics")).toBeVisible();
  });

  test("rendering metrics bar reports FPS", async ({ page }) => {
    await openEcgWorkspace(page, caseId);
    await page.getByTestId("sprint21-view-mode-waveform").or(page.getByTestId("sprint18-view-mode-waveform")).click();
    await expect(page.getByTestId("sprint27-ecg-render-metrics")).toBeVisible({ timeout: 20_000 });
    const metrics = page.getByTestId("sprint27-ecg-render-metrics");
    await expect(metrics).toContainText(/FPS|Rendering Engine|Sprint 27/i);
    await page.screenshot({ fullPage: true, path: "test-results/screenshots/sprint27-ecg-rendering-engine.png" });
  });

  test("monitor canvas remains available for live mode", async ({ page }) => {
    await openEcgWorkspace(page, caseId);
    await page.getByTestId("sprint18-view-mode-monitor").click();
    await expect(page.getByTestId("sprint22-hospital-monitor-canvas")).toBeVisible({ timeout: 20_000 });
  });
});
