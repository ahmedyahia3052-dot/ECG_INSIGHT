import { expect, test } from "./test";
import { bootstrapAuthenticatedPage, createClinicalFixture, API_URL, authHeaders } from "./utils/qa";

async function openEcgWorkspace(page: import("@playwright/test").Page, caseId: string) {
  await page.goto(`/ecg-workspace?caseId=${caseId}`, { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("ecg-workspace-loading")).toHaveCount(0, { timeout: 45_000 });
  await expect(page.getByTestId("ecg-enterprise-workspace-ready")).toBeVisible({ timeout: 45_000 });
  await expect(page.getByTestId("sprint23-visual-inspector-toolbar").or(page.getByTestId("sprint21-ecg-workstation-toolbar"))).toBeVisible({ timeout: 20_000 });
}

test.describe("Sprint 21 ECG Workstation UX Revolution @sprint21", () => {
  test.describe.configure({ mode: "serial" });

  let caseId = "";

  test.beforeAll(async ({ request }) => {
    const fixture = await createClinicalFixture(request, { analyze: true, report: false });
    caseId = fixture.caseId;
    const digitize = await request.post(`${API_URL}/ecg/digitize`, {
      data: { caseId, gainMmPerMv: 10, paperSpeedMmPerSec: 25 },
      headers: authHeaders(fixture.token, fixture.csrfToken),
    });
    expect(digitize.ok()).toBeTruthy();
  });

  test.beforeEach(async ({ page }) => {
    await bootstrapAuthenticatedPage(page, "doctor");
  });

  test("enterprise shell, toolbar groups, and clinical sidebar", async ({ page }) => {
    await openEcgWorkspace(page, caseId);
    await expect(page.getByText("Hospital ECG Workstation").or(page.getByText("ECG Insight Enterprise Workstation"))).toBeVisible();
    await expect(page.getByTestId("sprint21-toolbar-group-file")).toBeVisible();
    await expect(page.getByTestId("sprint21-toolbar-group-export")).toBeVisible();
    await expect(page.getByTestId("sprint21-clinical-right-panel").or(page.getByTestId("sprint22-clinical-right-panel"))).toBeVisible();
    await expect(page.getByTestId("sprint21-clinical-right-panel").or(page.getByTestId("sprint22-clinical-right-panel")).getByText("Patient", { exact: true })).toBeVisible();
    await expect(page.getByTestId("sprint21-enterprise-status-bar")).toBeVisible();
    await page.screenshot({ fullPage: true, path: "test-results/screenshots/sprint21-workstation-shell.png" });
  });

  test("clinical modes and enterprise status metrics", async ({ page }) => {
    await openEcgWorkspace(page, caseId);
    await page.getByTestId("sprint21-view-mode-image").click();
    await page.screenshot({ path: "test-results/screenshots/sprint21-mode-original.png" });
    await page.getByTestId("sprint21-view-mode-processed").click();
    await page.screenshot({ path: "test-results/screenshots/sprint21-mode-processed.png" });
    await page.getByTestId("sprint21-view-mode-waveform").click();
    await expect(page.getByTestId("sprint18-waveform-view")).toBeVisible();
    await page.screenshot({ path: "test-results/screenshots/sprint21-mode-waveform.png" });
    await page.getByTestId("sprint21-view-mode-monitor").click();
    await expect(page.getByTestId("sprint22-hospital-monitor-canvas").or(page.getByTestId("sprint19-monitor-canvas"))).toBeVisible();
    await expect(page.getByTestId("sprint21-status-memory")).toBeVisible();
    await page.screenshot({ path: "test-results/screenshots/sprint21-mode-monitor.png" });
    await page.getByTestId("sprint21-view-mode-ai-review").click();
    await expect(page.getByTestId("sprint21-ai-review-view")).toBeVisible();
    await page.screenshot({ path: "test-results/screenshots/sprint21-mode-ai-review.png" });
    await page.getByTestId("sprint21-view-mode-compare").click();
    await expect(page.getByTestId("sprint165-ecg-compare-viewer").or(page.getByTestId("sprint18-ecg-compare-overlay"))).toBeVisible();
    await page.screenshot({ path: "test-results/screenshots/sprint21-mode-compare.png" });
  });
});
