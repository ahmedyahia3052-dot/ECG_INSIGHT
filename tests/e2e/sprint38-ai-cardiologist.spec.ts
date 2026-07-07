import { expect, test } from "./test";
import { bootstrapAuthenticatedPage, createClinicalFixture, API_URL, authHeaders } from "./utils/qa";
import { openEcgWorkspace } from "./utils/ecg-workspace-locators";

test.describe("Sprint 38 AI Cardiologist Workspace @sprint38 @enterprise", () => {
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

  test("structured cardiologist workspace renders in AI tab", async ({ page }) => {
    await openEcgWorkspace(page, caseId);
    await page.getByTestId("sprint26-clinical-tab-ai").click();
    await expect(page.getByTestId("sprint38-ai-cardiologist-workspace")).toBeVisible({ timeout: 45_000 });
    await expect(page.getByTestId("sprint30-ai-review-panel")).toBeVisible();
    await expect(page.getByTestId("sprint38-section-rhythm")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("sprint38-section-intervals")).toBeVisible();
    await expect(page.getByTestId("sprint38-section-impression")).toBeVisible();
  });

  test("diagnosis focus highlights leads", async ({ page }) => {
    await openEcgWorkspace(page, caseId);
    await page.getByTestId("sprint26-clinical-tab-ai").click();
    await expect(page.getByTestId("sprint38-ai-cardiologist-workspace")).toBeVisible({ timeout: 45_000 });
    const finding = page.getByTestId(/^sprint38-finding-/).first();
    if (await finding.isVisible().catch(() => false)) {
      await finding.click();
      await expect(page.getByTestId("sprint38-ai-cardiologist-workspace")).toBeVisible();
      await expect(page.getByText("Lead focus active")).toBeVisible({ timeout: 15_000 });
    }
  });

  test("Sprint 37 live monitor remains independent", async ({ page }) => {
    await page.goto(`/ecg-live-monitor/${caseId}`, { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("sprint37-live-monitor-ready")).toBeVisible({ timeout: 45_000 });
    await expect(page.getByTestId("sprint38-ai-cardiologist-workspace")).toHaveCount(0);
  });
});
