/**
 * Visual regression — Playwright snapshot comparison only (no production UI changes).
 * @visual-regression @enterprise
 */
import { expect, test } from "./test";
import { bootstrapAuthenticatedPage, createClinicalFixture, API_URL, authHeaders } from "./utils/qa";
import { openEcgWorkspace } from "./utils/ecg-workspace-locators";

test.describe("Enterprise Visual Regression @visual-regression @enterprise", () => {
  test.describe.configure({ mode: "serial" });

  let caseId = "";

  test.beforeAll(async ({ request }) => {
    const fixture = await createClinicalFixture(request, { analyze: true, report: false });
    caseId = fixture.caseId;
    await request.post(`${API_URL}/ecg/digitize`, {
      data: { caseId, gainMmPerMv: 10, paperSpeedMmPerSec: 25 },
      headers: authHeaders(fixture.token, fixture.csrfToken),
    });
  });

  test.beforeEach(async ({ page }) => {
    await bootstrapAuthenticatedPage(page, "doctor");
  });

  for (const viewport of [
    { name: "desktop", width: 1440, height: 900 },
    { name: "laptop", width: 1366, height: 768 },
    { name: "tablet", width: 1024, height: 768 },
  ]) {
    test(`dashboard layout ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto("/dashboard");
      await expect(page.getByText(/Enterprise Clinical Command Center|Dashboard/).first()).toBeVisible({ timeout: 30_000 });
      await expect(page).toHaveScreenshot(`dashboard-${viewport.name}.png`, { maxDiffPixelRatio: 0.02 });
    });
  }

  test("ECG workspace chrome alignment", async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await openEcgWorkspace(page, caseId);
    await expect(page.getByTestId("sprint30-clinical-workflow-ribbon")).toBeVisible();
    await expect(page).toHaveScreenshot("ecg-workspace-shell.png", { maxDiffPixelRatio: 0.03 });
  });

  test("login screen typography and layout", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/login?force=1");
    await expect(page.getByTestId("auth-login-screen")).toBeVisible();
    await expect(page).toHaveScreenshot("login-screen.png", { maxDiffPixelRatio: 0.02 });
  });
});
