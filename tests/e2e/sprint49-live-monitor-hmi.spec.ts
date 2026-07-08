import { expect, test } from "./test";
import { bootstrapAuthenticatedPage, createClinicalFixture, API_URL, authHeaders } from "./utils/qa";
import { openEcgLiveMonitor } from "./utils/ecg-workspace-locators";

test.describe("Sprint 49 Hospital ECG Monitor HMI @sprint49 @enterprise", () => {
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
    await page.setViewportSize({ height: 1080, width: 1920 });
    await bootstrapAuthenticatedPage(page, "doctor");
    await openEcgLiveMonitor(page, caseId);
    await expect(page.getByTestId("sprint37-live-monitor-ready")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("sprint49-hmi-workspace-ready")).toBeVisible();
    await expect(page.getByTestId("sprint22-hospital-monitor-canvas")).toBeVisible({ timeout: 15_000 });
  });

  test("professional HMI status bar shows patient identity and telemetry", async ({ page }) => {
    await expect(page.getByTestId("sprint49-hmi-status-bar")).toBeVisible();
    await expect(page.getByTestId("sprint45-hospital-hud")).toBeVisible();
    await expect(page.getByTestId("sprint37-live-monitor-status")).toContainText("mm/s");
    await expect(page.getByTestId("sprint49-hmi-status-bar")).toContainText(/PATIENT|MRN|HOSPITAL/i);
    await expect(page.getByTestId("sprint49-alarm-status")).toBeVisible();
  });

  test("left and right HMI rails render with clinical sections", async ({ page }) => {
    await expect(page.getByTestId("sprint49-hmi-left-rail")).toBeVisible();
    await expect(page.getByTestId("sprint49-hmi-right-rail")).toBeVisible();
    await expect(page.getByTestId("sprint37-live-monitor-leads")).toBeVisible();
    await expect(page.getByTestId("sprint41-live-monitor-toolbar")).toBeVisible();
  });

  test("bottom bar hosts monitor transport controls", async ({ page }) => {
    await expect(page.getByTestId("sprint45-floating-palette")).toBeVisible();
    await expect(page.getByTestId("sprint49-hmi-bottom-bar")).toBeVisible();
    await expect(page.getByTestId("sprint37-live-monitor-controls")).toBeVisible();
  });

  test("canvas dominates viewport at hospital HMI ratio", async ({ page }) => {
    const metrics = await page.evaluate(() => {
      const canvas = document.querySelector('[data-testid="sprint22-hospital-monitor-canvas"]') as HTMLCanvasElement | null;
      const vh = window.innerHeight;
      const canvasRect = canvas?.getBoundingClientRect();
      return {
        canvasHeight: canvasRect?.height ?? 0,
        canvasRatio: (canvasRect?.height ?? 0) / vh,
        viewportHeight: vh,
      };
    });
    expect(metrics.canvasRatio).toBeGreaterThan(0.45);
    expect(metrics.canvasHeight).toBeGreaterThan(280);
  });

  test("diagnostic fullscreen hides chrome and preserves canvas", async ({ page }) => {
    await page.getByRole("button", { name: "Diagnostic Monitor" }).click();
    await expect(page.getByTestId("sprint49-hmi-status-bar")).toHaveCount(0, { timeout: 10_000 });
    await expect(page.getByTestId("sprint49-hmi-diagnostic-hud")).toBeVisible();
    await expect(page.getByTestId("sprint37-exit-diagnostic")).toBeVisible();
    await expect(page.getByTestId("sprint22-hospital-monitor-canvas")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("sprint49-hmi-status-bar")).toBeVisible({ timeout: 10_000 });
  });

  test("Sprint 45 HUD and transport regression", async ({ page }) => {
    await expect(page.getByTestId("sprint45-hospital-hud")).toBeVisible();
    await expect(page.getByTestId("sprint37-live-monitor-controls")).toBeVisible();
    await expect(page.getByTestId("sprint37-live-monitor-status")).toContainText(/LIVE|PAUSED|FROZEN/);
    await expect(page.getByTestId("sprint50-pro-hud")).toBeVisible();
  });
});
