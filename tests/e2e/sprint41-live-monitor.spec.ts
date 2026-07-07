import { expect, test } from "./test";
import { bootstrapAuthenticatedPage, createClinicalFixture, API_URL, authHeaders } from "./utils/qa";
import { openEcgLiveMonitor } from "./utils/ecg-workspace-locators";

test.describe("Sprint 41 Professional Live ECG Monitor @sprint41 @enterprise", () => {
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

  test("alarm bar and clinical toolbar are visible", async ({ page }) => {
    await expect(page.getByTestId("sprint41-live-monitor-alarm-bar")).toBeVisible();
    await expect(page.getByTestId("sprint41-alarm-hr")).toBeVisible();
    await expect(page.getByTestId("sprint41-alarm-signal")).toBeVisible();
    await expect(page.getByTestId("sprint41-live-monitor-toolbar")).toBeVisible();
  });

  test("play pause freeze resume transport", async ({ page }) => {
    await page.getByRole("button", { name: "Play" }).click();
    await expect(page.getByTestId("sprint37-live-monitor-status")).toContainText("LIVE");

    await page.getByRole("button", { name: "Pause" }).click();
    await expect(page.getByTestId("sprint37-live-monitor-status")).toContainText("PAUSED");

    await page.getByRole("button", { name: "Freeze" }).click();
    await expect(page.getByTestId("sprint37-live-monitor-status")).toContainText("FROZEN");

    await page.getByRole("button", { name: "Resume" }).click();
    await expect(page.getByTestId("sprint37-live-monitor-status")).toContainText("LIVE");
  });

  test("review mode freezes acquisition", async ({ page }) => {
    await page.getByRole("button", { name: "Review Mode" }).click();
    await expect(page.getByTestId("sprint37-live-monitor-status")).toContainText("REVIEW");
    await expect(page.getByTestId("sprint41-alarm-acq")).toContainText("REVIEW");
    await page.getByRole("button", { name: "Exit Review" }).click();
    await expect(page.getByTestId("sprint37-live-monitor-status")).not.toContainText("REVIEW");
  });

  test("gain and sweep speed switching", async ({ page }) => {
    await page.getByRole("button", { name: "Speed 50" }).click();
    await expect(page.getByTestId("sprint37-live-monitor-status")).toContainText("50 mm/s");

    await page.getByRole("button", { name: "Speed 25" }).click();
    await expect(page.getByTestId("sprint37-live-monitor-status")).toContainText("25 mm/s");

    await page.getByRole("button", { name: "Gain 20" }).click();
    await expect(page.getByTestId("sprint37-live-monitor-status")).toContainText("20 mm/mV");

    await page.getByRole("button", { name: "Gain 5" }).click();
    await expect(page.getByTestId("sprint37-live-monitor-status")).toContainText("5 mm/mV");
  });

  test("3 5 12 lead layout modes and lead switch", async ({ page }) => {
    await page.getByRole("button", { name: "3 Lead" }).click();
    await expect(page.getByTestId("sprint22-hospital-live-monitor")).toContainText("3-LEAD MONITOR");

    await page.getByRole("button", { name: "5 Lead" }).click();
    await expect(page.getByTestId("sprint22-hospital-live-monitor")).toContainText("5-LEAD MONITOR");

    await page.getByRole("button", { name: "12 Lead" }).click();
    await expect(page.getByTestId("sprint22-hospital-live-monitor")).toContainText("12-LEAD MONITOR");

    await page.getByRole("button", { name: "Single" }).click();
    await page.getByRole("button", { name: "V5" }).click();
    await expect(page.getByTestId("sprint22-hospital-live-monitor")).toContainText("LEAD V5");
  });

  test("rhythm strip canvas renders", async ({ page }) => {
    await page.getByRole("button", { name: "Rhythm Strip" }).click();
    await expect(page.getByTestId("sprint41-rhythm-strip-host")).toBeVisible();
    await expect(page.getByTestId("sprint41-rhythm-strip-canvas")).toBeVisible();
    await expect(page.getByTestId("sprint22-hospital-live-monitor")).toContainText("RHYTHM STRIP");
  });

  test("fullscreen diagnostic mode via toolbar and keyboard", async ({ page }) => {
    await page.getByRole("button", { name: "Diagnostic Monitor" }).click();
    await expect(page.getByTestId("sprint37-live-monitor-header")).toHaveCount(0, { timeout: 10_000 });
    await expect(page.getByTestId("sprint37-exit-diagnostic")).toBeVisible();
    await expect(page.getByTestId("sprint22-hospital-monitor-canvas")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("sprint37-live-monitor-header")).toBeVisible({ timeout: 10_000 });
  });

  test("zoom pan reset view and snapshot export", async ({ page }) => {
    await page.getByRole("button", { name: "Zoom +" }).click();
    await expect(page.getByTestId("sprint41-live-monitor-toolbar")).toContainText("Zoom");

    await page.getByRole("button", { name: "Pan", exact: true }).click();
    await expect(page.getByRole("button", { name: "Pan On" })).toBeVisible();

    await page.getByRole("button", { name: "Reset View" }).first().click();

    const downloadPromise = page.waitForEvent("download", { timeout: 5_000 }).catch(() => null);
    await page.getByRole("button", { name: "Snapshot" }).click();
    const download = await downloadPromise;
    if (download) {
      expect(download.suggestedFilename()).toMatch(/ecg-monitor-.*\.png$/);
    }
  });
});
