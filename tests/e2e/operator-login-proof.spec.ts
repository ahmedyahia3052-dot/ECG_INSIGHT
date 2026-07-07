import { expect, test } from "./test";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { createClinicalFixture, API_URL, authHeaders } from "./utils/qa";
import { ecgViewMode, openEcgWorkspace } from "./utils/ecg-workspace-locators";

const screenshotDir = path.join(process.cwd(), "validation-screenshots", "operator-login-proof");

test.describe("Operator login proof @operator-proof @sprint50", () => {
  test.describe.configure({ mode: "serial" });

  let caseId = "";

  test.beforeAll(async ({ request }) => {
    mkdirSync(screenshotDir, { recursive: true });
    const fixture = await createClinicalFixture(request, { analyze: true, report: false });
    caseId = fixture.caseId;
    const digitize = await request.post(`${API_URL}/ecg/digitize`, {
      data: { caseId, gainMmPerMv: 10, paperSpeedMmPerSec: 25 },
      headers: authHeaders(fixture.token, fixture.csrfToken),
    });
    expect(digitize.ok(), `Digitize API should succeed: ${await digitize.text()}`).toBeTruthy();
  });

  test("operator UI login through live ECG monitor", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/login?force=1", { waitUntil: "domcontentloaded" });

    await expect(page.getByTestId("auth-login-screen")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("Server unavailable")).toHaveCount(0, { timeout: 30_000 });
    await page.screenshot({ path: path.join(screenshotDir, "01-login-ready.png"), fullPage: true });

    await page.getByPlaceholder(/name@organization\.com/i).fill("doctor@ecginsight.com");
    await page.getByPlaceholder(/password/i).fill("password");
    await page.getByTestId("auth-sign-in-button").click();

    await expect(page.getByText(/Enterprise Clinical Command Center|Good Morning|Good Afternoon|Good Evening/).first()).toBeVisible({
      timeout: 30_000,
    });
    await page.screenshot({ path: path.join(screenshotDir, "02-dashboard-after-login.png"), fullPage: true });

    await openEcgWorkspace(page, caseId);
    await ecgViewMode(page, "monitor").click();
    await expect(page.getByTestId("sprint22-hospital-live-monitor")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("sprint22-hospital-monitor-canvas")).toBeVisible({ timeout: 30_000 });
    await page.screenshot({ path: path.join(screenshotDir, "03-ecg-workspace-live-monitor.png"), fullPage: true });
  });
});
