import { expect, test } from "./test";
import { bootstrapAuthenticatedPage, createClinicalFixture, API_URL, authHeaders } from "./utils/qa";
import { openEcgLiveMonitor } from "./utils/ecg-workspace-locators";

test.describe("Sprint 50 Real Hospital ECG Monitor @sprint50 @enterprise", () => {
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
    await expect(page.getByTestId("sprint49-hmi-workspace-ready")).toBeVisible();
    await expect(page.getByTestId("sprint22-hospital-monitor-canvas")).toBeVisible({ timeout: 15_000 });
  });

  test("professional HUD shows interval metrics", async ({ page }) => {
    await expect(page.getByTestId("sprint50-pro-hud")).toBeVisible();
    await expect(page.getByTestId("sprint50-pro-hud")).toContainText(/HR|RR|PR|QRS|QT|QTc/i);
    await expect(page.getByTestId("sprint50-audio-controls")).toBeVisible();
  });

  test("hospital layout modes include 6x2 dual and quad", async ({ page }) => {
    await page.getByRole("button", { name: "6×2" }).click();
    await expect(page.getByTestId("sprint22-hospital-live-monitor")).toContainText("6×2 MONITOR");
    await page.getByRole("button", { name: "Dual" }).click();
    await expect(page.getByTestId("sprint22-hospital-live-monitor")).toContainText("DUAL LEAD MONITOR");
    await page.getByRole("button", { name: "Quad" }).click();
    await expect(page.getByTestId("sprint22-hospital-live-monitor")).toContainText("QUAD LEAD MONITOR");
  });

  test("lead focus expands selected lead to full monitor", async ({ page }) => {
    await page.getByRole("button", { name: "V5", exact: true }).click();
    await expect(page.getByTestId("sprint22-hospital-live-monitor")).toContainText(/LEAD FOCUS · V5|LEAD V5/i);
  });

  test("comparison preset II vs V5 renders custom monitor", async ({ page }) => {
    await page.getByRole("button", { name: "II vs V5" }).click();
    await expect(page.getByTestId("sprint22-hospital-live-monitor")).toContainText("CUSTOM MONITOR");
  });

  test("rhythm strip window controls visible", async ({ page }) => {
    await page.getByRole("button", { name: "Rhythm Strip" }).click();
    await page.getByRole("button", { name: "20s" }).click();
    await expect(page.getByTestId("sprint41-rhythm-strip-host")).toBeVisible();
  });

  test("Sprint 45 and 49 regression smoke", async ({ page }) => {
    await expect(page.getByTestId("sprint45-hospital-hud")).toBeVisible();
    await expect(page.getByTestId("sprint49-hmi-status-bar")).toBeVisible();
    await page.getByRole("button", { name: "6 Lead" }).click();
    await expect(page.getByTestId("sprint22-hospital-live-monitor")).toContainText("6-LEAD MONITOR");
  });
});
