import { expect, test } from "./test";
import { bootstrapAuthenticatedPage, createClinicalFixture, API_URL, authHeaders } from "./utils/qa";
import { openEcgWorkspace } from "./utils/ecg-workspace-locators";

test.describe("Sprint 48 Hospital ECG Examination Workflow @sprint48 @enterprise", () => {
  test.describe.configure({ mode: "serial" });

  let caseId = "";
  let token = "";
  let csrfToken = "";

  test.beforeAll(async ({ request }) => {
    const fixture = await createClinicalFixture(request, { analyze: true, report: false });
    caseId = fixture.caseId;
    token = fixture.token;
    csrfToken = fixture.csrfToken;
    const digitize = await request.post(`${API_URL}/ecg/digitize`, {
      data: { caseId, gainMmPerMv: 10, paperSpeedMmPerSec: 25 },
      headers: authHeaders(token, csrfToken),
    });
    expect(digitize.ok(), `Digitize API should succeed: ${await digitize.text()}`).toBeTruthy();
  });

  test.beforeEach(async ({ page }) => {
    await bootstrapAuthenticatedPage(page, "doctor");
    await openEcgWorkspace(page, caseId);
    await expect(page.getByTestId("sprint35-clinical-right-panel")).toBeVisible({ timeout: 25_000 });
  });

  test("examination tab renders workflow session manager", async ({ page }) => {
    await page.getByTestId("sprint26-clinical-tab-examination").click();
    await expect(page.getByTestId("sprint48-examination-tab-pane")).toBeVisible();
    await expect(page.getByTestId("sprint48-examination-workflow-ready")).toBeVisible();
    await expect(page.getByTestId("sprint48-lifecycle-status")).toBeVisible();
    await expect(page.getByTestId("sprint48-examination-timeline")).toBeVisible();
  });

  test("quality control and doctor review panels render", async ({ page }) => {
    await page.getByTestId("sprint26-clinical-tab-examination").click();
    await expect(page.getByTestId("sprint48-examination-quality-control")).toBeVisible();
    await expect(page.getByTestId("sprint48-examination-doctor-review")).toBeVisible();
    await page.getByTestId("sprint48-refresh-quality").click();
    await expect(page.getByTestId("sprint48-examination-quality-control")).toContainText(/Quality|Signal|Lead|Noise|Baseline/i);
  });

  test("examination session API supports lifecycle", async ({ request }) => {
    const sessionRes = await request.get(`${API_URL}/cases/${caseId}/examination/session`, {
      headers: authHeaders(token, csrfToken),
    });
    expect(sessionRes.ok()).toBeTruthy();
    const body = await sessionRes.json();
    expect(body.session?.lifecycleStatus).toBeTruthy();
    expect(body.session?.timeline?.length).toBeGreaterThan(0);

    const advanceRes = await request.post(`${API_URL}/cases/${caseId}/examination/advance`, {
      data: {},
      headers: authHeaders(token, csrfToken),
    });
    expect(advanceRes.ok()).toBeTruthy();
  });

  test("Sprint 47 acquisition tab regression still passes", async ({ page }) => {
    await page.getByTestId("sprint26-clinical-tab-acquisition").click();
    await expect(page.getByTestId("sprint47-acquisition-tab-pane")).toBeVisible();
    await expect(page.getByTestId("sprint47-acquisition-panel")).toBeVisible();
  });
});
