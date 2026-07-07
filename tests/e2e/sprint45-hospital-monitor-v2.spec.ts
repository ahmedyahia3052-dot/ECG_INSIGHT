import { expect, test } from "./test";
import { bootstrapAuthenticatedPage, createClinicalFixture, API_URL, authHeaders } from "./utils/qa";
import { openEcgLiveMonitor } from "./utils/ecg-workspace-locators";

test.describe("Sprint 45 Hospital Grade ECG Monitor V2 @sprint45 @enterprise", () => {
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
    await openEcgLiveMonitor(page, caseId);
    await expect(page.getByTestId("sprint37-live-monitor-ready")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("sprint22-hospital-monitor-canvas")).toBeVisible({ timeout: 15_000 });
  });

  test("hospital HUD shows acquisition telemetry fields", async ({ page }) => {
    await expect(page.getByTestId("sprint45-hospital-hud")).toBeVisible();
    await expect(page.getByTestId("sprint41-live-monitor-alarm-bar")).toBeVisible();
    await expect(page.getByTestId("sprint37-live-monitor-status")).toContainText("mm/s");
    await expect(page.getByTestId("sprint37-live-monitor-status")).toContainText("mm/mV");
    await expect(page.getByTestId("sprint37-live-monitor-status")).toContainText("FILTER");
    await expect(page.getByTestId("sprint37-live-monitor-status")).toContainText("PATIENT");
  });

  test("floating palette exposes clinical controls", async ({ page }) => {
    await expect(page.getByTestId("sprint45-floating-palette")).toBeVisible();
    await expect(page.getByTestId("sprint41-live-monitor-toolbar")).toBeVisible();
    await expect(page.getByTestId("sprint37-live-monitor-controls")).toBeVisible();
    await expect(page.getByTestId("sprint37-live-monitor-leads")).toBeVisible();
  });

  test("6 lead layout mode renders", async ({ page }) => {
    await page.getByRole("button", { name: "6 Lead" }).click();
    await expect(page.getByTestId("sprint22-hospital-live-monitor")).toContainText("6-LEAD MONITOR");
    await expect(page.getByTestId("sprint22-hospital-monitor-canvas")).toBeVisible();
  });

  test("custom layout and filter cycle", async ({ page }) => {
    await page.getByRole("button", { name: "Custom" }).click();
    await expect(page.getByTestId("sprint22-hospital-live-monitor")).toContainText("CUSTOM MONITOR");
    await page.getByRole("button", { name: /Filter Monitor/i }).click();
    await expect(page.getByTestId("sprint37-live-monitor-status")).toContainText("FILTER");
  });

  test("canvas dominates viewport height", async ({ page }) => {
    const metrics = await page.evaluate(() => {
      const canvas = document.querySelector('[data-testid="sprint22-hospital-monitor-canvas"]') as HTMLCanvasElement | null;
      const host = document.querySelector('[data-testid="sprint22-hospital-live-monitor"]') as HTMLElement | null;
      const vh = window.innerHeight;
      const canvasRect = canvas?.getBoundingClientRect();
      const hostRect = host?.getBoundingClientRect();
      return {
        canvasHeight: canvasRect?.height ?? 0,
        hostHeight: hostRect?.height ?? 0,
        ratio: (hostRect?.height ?? 0) / vh,
        viewportHeight: vh,
      };
    });
    expect(metrics.ratio).toBeGreaterThan(0.88);
    expect(metrics.canvasHeight).toBeGreaterThan(280);
  });

  test("diagnostic fullscreen hides chrome and preserves canvas", async ({ page }) => {
    await page.getByRole("button", { name: "Diagnostic Monitor" }).click();
    await expect(page.getByTestId("sprint37-live-monitor-header")).toHaveCount(0, { timeout: 10_000 });
    await expect(page.getByTestId("sprint45-hospital-hud")).toHaveCount(0);
    await expect(page.getByTestId("sprint37-exit-diagnostic")).toBeVisible();
    await expect(page.getByTestId("sprint22-hospital-monitor-canvas")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("sprint45-hospital-hud")).toBeVisible({ timeout: 10_000 });
  });

  test("Sprint 41 transport regression via floating palette", async ({ page }) => {
    await page.getByRole("button", { name: "Play" }).click();
    await expect(page.getByTestId("sprint37-live-monitor-status")).toContainText("LIVE");
    await page.getByRole("button", { name: "Pause" }).click();
    await expect(page.getByTestId("sprint37-live-monitor-status")).toContainText("PAUSED");
  });
});
