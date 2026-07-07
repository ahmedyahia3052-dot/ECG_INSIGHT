import { expect, test } from "./test";
import { bootstrapAuthenticatedPage, createClinicalFixture, API_URL, authHeaders } from "./utils/qa";
import { openEcgWorkspace } from "./utils/ecg-workspace-locators";

test.describe("Sprint 47 ECG Acquisition & Digitization @sprint47 @enterprise", () => {
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
    await openEcgWorkspace(page, caseId);
    await expect(page.getByTestId("sprint35-clinical-right-panel")).toBeVisible({ timeout: 25_000 });
  });

  test("acquisition tab renders capture and overlay studio", async ({ page }) => {
    await page.getByTestId("sprint26-clinical-tab-acquisition").click();
    await expect(page.getByTestId("sprint47-acquisition-tab-pane")).toBeVisible();
    await expect(page.getByTestId("sprint47-acquisition-capture")).toBeVisible();
    await expect(page.getByTestId("sprint47-digitization-overlay")).toBeVisible();
    await expect(page.getByTestId("sprint165-digitization-quality-panel")).toBeVisible();
  });

  test("digitization quality panel shows tier or score", async ({ page }) => {
    await page.getByTestId("sprint26-clinical-tab-acquisition").click();
    await expect(page.getByTestId("sprint165-digitization-quality-panel")).toContainText(/Quality|Excellent|Good|Fair|Poor/i);
  });

  test("background digitization job API accepts request", async ({ request }) => {
    const fixture = await createClinicalFixture(request, { analyze: false, report: false });
    const digitize = await request.post(`${API_URL}/ecg/digitize`, {
      data: { caseId: fixture.caseId },
      headers: authHeaders(fixture.token, fixture.csrfToken),
    });
    expect(digitize.ok()).toBeTruthy();
    const jobRes = await request.post(`${API_URL}/ecg/digitization/jobs`, {
      data: { caseId: fixture.caseId },
      headers: authHeaders(fixture.token, fixture.csrfToken),
    });
    expect(jobRes.status()).toBe(202);
    const body = await jobRes.json();
    expect(body.job?.id).toBeTruthy();
  });

  test("Sprint 16 digitization regression still passes", async ({ page }) => {
    await expect(page.getByTestId("sprint35-clinical-right-panel")).toBeVisible();
    await page.getByTestId("sprint26-clinical-tab-acquisition").click();
    await expect(page.getByTestId("sprint47-acquisition-panel")).toBeVisible();
  });
});
