import { expect, test } from "./test";
import { bootstrapAuthenticatedPage, createClinicalFixture, API_URL, authHeaders } from "./utils/qa";
import { openEcgLiveMonitor, openEcgWorkspace } from "./utils/ecg-workspace-locators";

test.describe("Sprint 37 Live ECG Monitor Workspace @sprint37 @enterprise", () => {
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

  test("live monitor is an independent workspace", async ({ page }) => {
    await openEcgLiveMonitor(page, caseId);
    await expect(page.getByTestId("sprint37-live-monitor-header")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("sprint30-clinical-workflow-ribbon")).toHaveCount(0);
    await expect(page.getByTestId("sprint35-compact-toolbar").or(page.getByTestId("sprint29-zero-chrome-toolbar"))).toHaveCount(0);
  });

  test("playback, freeze, lead switching, and status panel", async ({ page }) => {
    await openEcgLiveMonitor(page, caseId);
    await expect(page.getByTestId("sprint37-live-monitor-status")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("sprint37-live-monitor-leads")).toBeVisible();
    await expect(page.getByTestId("sprint37-live-monitor-controls")).toBeVisible();

    await page.getByRole("button", { name: "Play" }).click();
    await expect(page.getByTestId("sprint37-live-monitor-status")).toContainText("LIVE");

    await page.getByRole("button", { name: "Freeze" }).click();
    await expect(page.getByTestId("sprint37-live-monitor-status")).toContainText("FROZEN");

    await page.getByRole("button", { name: "Resume" }).click();
    await expect(page.getByTestId("sprint37-live-monitor-status")).toContainText("LIVE");

    await page.getByRole("button", { name: "V5" }).click();
    await expect(page.getByTestId("sprint22-hospital-live-monitor")).toContainText("LEAD V5");

    await page.getByRole("button", { name: "Rhythm Strip" }).click();
    await expect(page.getByTestId("sprint22-hospital-live-monitor")).toContainText("RHYTHM STRIP");
  });

  test("diagnostic monitor mode hides chrome and exits with ESC", async ({ page }) => {
    await openEcgLiveMonitor(page, caseId);
    await page.getByRole("button", { name: "Diagnostic Monitor" }).click();
    await expect(page.getByTestId("sprint37-live-monitor-header")).toHaveCount(0, { timeout: 10_000 });
    await expect(page.getByTestId("sprint37-exit-diagnostic")).toBeVisible();
    await expect(page.getByTestId("sprint22-hospital-monitor-canvas")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("sprint37-live-monitor-header")).toBeVisible({ timeout: 10_000 });
  });

  test("review workspace remains unchanged", async ({ page }) => {
    await openEcgWorkspace(page, caseId);
    await expect(page.getByTestId("sprint30-clinical-workflow-ribbon")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("sprint37-live-monitor-ready")).toHaveCount(0);
  });
});
