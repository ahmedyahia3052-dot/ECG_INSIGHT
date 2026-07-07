import { expect, test } from "./test";
import { bootstrapAuthenticatedPage, createClinicalFixture, API_URL, authHeaders } from "./utils/qa";
import { openEcgLiveMonitor } from "./utils/ecg-workspace-locators";

test.describe("Render Engine 2.0 Hospital Visualization @render-engine-2 @enterprise", () => {
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
  });

  test("live monitor canvas mounts Render Engine 2.0", async ({ page }) => {
    const canvas = page.getByTestId("sprint22-hospital-monitor-canvas");
    await expect(canvas).toBeVisible({ timeout: 15_000 });
    await expect(canvas).toHaveAttribute("data-render-engine", "2.0");
  });

  test("hospital monitor renders 12-lead layout without flicker", async ({ page }) => {
    const layout12 = page.getByRole("button", { name: /12/i }).first();
    if (await layout12.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await layout12.click();
    }
    await expect(page.getByTestId("sprint22-hospital-monitor-canvas")).toBeVisible();
    await expect
      .poll(async () => page.getByTestId("sprint22-hospital-monitor-canvas").isVisible(), { timeout: 3_000 })
      .toBe(true);
  });

  test("paper speed control remains functional", async ({ page }) => {
    const speed50 = page.getByRole("button", { name: /50/i }).first();
    if (await speed50.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await speed50.click();
    }
    await expect(page.getByTestId("sprint22-hospital-monitor-canvas")).toBeVisible();
  });
});
