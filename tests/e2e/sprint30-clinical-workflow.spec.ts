import { expect, test } from "./test";
import { bootstrapAuthenticatedPage, createClinicalFixture, API_URL, authHeaders } from "./utils/qa";

async function openEcgWorkspace(page: import("@playwright/test").Page, caseId: string) {
  await page.goto(`/ecg-workspace?caseId=${caseId}`, { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("ecg-workspace-loading")).toHaveCount(0, { timeout: 45_000 });
  await expect(page.getByTestId("ecg-enterprise-workspace-ready")).toBeVisible({ timeout: 45_000 });
}

test.describe("Sprint 30 Clinical Decision Workspace @sprint30 @enterprise", () => {
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

  test("16-stage workflow ribbon renders", async ({ page }) => {
    await openEcgWorkspace(page, caseId);
    await expect(page.getByTestId("sprint30-clinical-workflow-ribbon")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("sprint30-workflow-progress")).toBeVisible();
    for (const step of ["patient", "upload", "image-quality", "digitization", "measurements", "ai-review", "final-report", "export"]) {
      await expect(page.getByTestId(`sprint30-workflow-step-${step}`)).toBeVisible();
    }
  });

  test("workflow navigation and clinical alerts", async ({ page }) => {
    await openEcgWorkspace(page, caseId);
    await expect(page.getByTestId("sprint30-clinical-alerts")).toBeVisible({ timeout: 15_000 });
    await page.getByTestId("sprint30-workflow-step-digitization").click();
    await expect(page.getByTestId("sprint18-waveform-view")).toBeVisible({ timeout: 20_000 });
    await page.getByTestId("sprint30-workflow-step-ai-review").click();
    await expect(page.getByTestId("sprint21-ai-review-view")).toBeVisible({ timeout: 15_000 });
    await page.getByTestId("sprint30-workflow-step-final-report").click();
    await expect(page.getByTestId("sprint19-report-preview-panel")).toBeVisible({ timeout: 15_000 });
  });

  test("clinical workspace panels", async ({ page }) => {
    await openEcgWorkspace(page, caseId);
    await expect(page.getByTestId("sprint33-clinical-right-panel").or(page.getByTestId("sprint30-clinical-right-panel"))).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("sprint30-patient-workspace")).toBeVisible();
    await page.getByTestId("sprint26-clinical-tab-measurements").click();
    await expect(page.getByTestId("sprint30-measurement-studio")).toBeVisible({ timeout: 15_000 });
    await page.getByTestId("sprint26-clinical-tab-ai").click();
    await expect(page.getByTestId("sprint30-ai-review-panel")).toBeVisible({ timeout: 15_000 });
    await page.getByTestId("sprint26-clinical-tab-history").click();
    await expect(page.getByTestId("sprint30-history-engine")).toBeVisible({ timeout: 15_000 });
    await page.screenshot({ fullPage: true, path: "test-results/screenshots/sprint30-clinical-workflow.png" });
  });
});
