import { expect, test } from "./test";
import { bootstrapAuthenticatedPage, createClinicalFixture, API_URL, authHeaders } from "./utils/qa";
import { openEcgLiveMonitor, openEcgWorkspace } from "./utils/ecg-workspace-locators";

test.describe("Hospital Grade Rebuild @hospital-grade @enterprise", () => {
  test.describe.configure({ mode: "serial" });

  let caseId = "";

  test.beforeAll(async ({ request }) => {
    const fixture = await createClinicalFixture(request, { analyze: true, report: true });
    caseId = fixture.caseId;
    const digitize = await request.post(`${API_URL}/ecg/digitize`, {
      data: { caseId, gainMmPerMv: 10, paperSpeedMmPerSec: 25 },
      headers: authHeaders(fixture.token, fixture.csrfToken),
    });
    expect(digitize.ok(), `Digitize API should succeed: ${await digitize.text()}`).toBeTruthy();
  });

  test("Login → Dashboard → ECG Workspace workflow", async ({ page }) => {
    await bootstrapAuthenticatedPage(page, "doctor");
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/dashboard/);

    await openEcgWorkspace(page, caseId);
    await expect(page.getByTestId("sprint13-ecg-monitor-ready")).toBeVisible({ timeout: 25_000 });
    await expect(page.locator("#hospital-grade-workspace-ready")).toBeAttached();
    await expect(page.getByTestId("sprint35-clinical-right-panel").or(page.getByTestId("sprint30-clinical-right-panel"))).toBeVisible();
  });

  test("Live Monitor — RE2 canvas, display presets, audio profiles", async ({ page }) => {
    await bootstrapAuthenticatedPage(page, "doctor");
    await openEcgLiveMonitor(page, caseId);
    await expect(page.getByTestId("sprint37-live-monitor-ready")).toBeVisible({ timeout: 20_000 });
    await expect(page.locator("#hospital-grade-rebuild-ready")).toBeAttached();
    await expect(page.getByTestId("sprint22-hospital-monitor-canvas")).toBeVisible({ timeout: 15_000 });

    await page.getByRole("button", { name: "Central Station" }).click();
    await expect(page.getByTestId("sprint22-hospital-live-monitor")).toContainText("CENTRAL STATION");

    await page.getByRole("button", { name: "Bedside" }).click();
    await expect(page.getByTestId("sprint22-hospital-live-monitor")).toContainText("BEDSIDE MONITOR");

    await expect(page.getByTestId("sprint50-pro-hud")).toBeVisible();
    await expect(page.getByTestId("sprint50-audio-controls")).toContainText(/Profile|Vol|Alarm/i);
  });

  test("Live Monitor → Report path smoke", async ({ page }) => {
    await bootstrapAuthenticatedPage(page, "doctor");
    await openEcgWorkspace(page, caseId);
    await expect(page.getByTestId("sprint13-ecg-monitor-ready")).toBeVisible({ timeout: 25_000 });
    const reportTab = page.getByRole("button", { name: /Report|Final Report/i }).first();
    if (await reportTab.isVisible().catch(() => false)) {
      await reportTab.click();
      await expect(page.getByTestId("sprint43-enterprise-clinical-report").first()).toBeVisible({ timeout: 15_000 });
    }
  });

  test("Sprint 50 regression — layout modes and lead focus", async ({ page }) => {
    await bootstrapAuthenticatedPage(page, "doctor");
    await openEcgLiveMonitor(page, caseId);
    await page.getByRole("button", { name: "6×2" }).click();
    await expect(page.getByTestId("sprint22-hospital-live-monitor")).toContainText("6×2 MONITOR");
    await page.getByRole("button", { name: "Single" }).click();
    await page.getByRole("button", { name: "V5", exact: true }).click();
    await expect(page.getByTestId("sprint22-hospital-live-monitor")).toContainText(/LEAD FOCUS · V5|LEAD V5/i);
  });
});
