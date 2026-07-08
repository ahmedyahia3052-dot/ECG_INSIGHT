import { expect, test } from "./test";
import { bootstrapAuthenticatedPage, createClinicalFixture, API_URL, authHeaders } from "./utils/qa";
import {
  assertWorkspaceShell,
  ecgClinicalRightPanel,
  ecgStatusBar,
  ecgToolbarGroup,
  ecgViewMode,
  openEcgWorkspace, activateMonitorView } from "./utils/ecg-workspace-locators";

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
    await assertWorkspaceShell(page);
    await expect(ecgToolbarGroup(page, "file")).toBeVisible();
    await expect(ecgToolbarGroup(page, "export")).toBeVisible();
    await expect(ecgClinicalRightPanel(page)).toBeVisible();
    await expect(ecgClinicalRightPanel(page).getByText("Patient", { exact: true })).toBeVisible();
    await expect(ecgStatusBar(page)).toBeVisible();
    await page.screenshot({ fullPage: true, path: "test-results/screenshots/sprint21-workstation-shell.png" });
  });

  test("clinical modes and enterprise status metrics", async ({ page }) => {
    await openEcgWorkspace(page, caseId);
    await ecgViewMode(page, "image").click();
    await page.screenshot({ path: "test-results/screenshots/sprint21-mode-original.png" });
    await ecgViewMode(page, "processed").click();
    await page.screenshot({ path: "test-results/screenshots/sprint21-mode-processed.png" });
    await ecgViewMode(page, "waveform").click();
    await expect(page.getByTestId("sprint18-waveform-view")).toBeVisible();
    await page.screenshot({ path: "test-results/screenshots/sprint21-mode-waveform.png" });
    await activateMonitorView(page);
    await expect(page.getByTestId("sprint22-hospital-monitor-canvas").or(page.getByTestId("sprint19-monitor-canvas"))).toBeVisible();
    await expect(page.getByTestId("sprint28-status-memory").or(page.getByTestId("sprint21-status-memory"))).toBeVisible();
    await page.screenshot({ path: "test-results/screenshots/sprint21-mode-monitor.png" });
    await ecgViewMode(page, "ai-review").click();
    await expect(page.getByTestId("sprint21-ai-review-view")).toBeVisible();
    await page.screenshot({ path: "test-results/screenshots/sprint21-mode-ai-review.png" });
    await ecgViewMode(page, "compare").click();
    await expect(page.getByTestId("sprint165-ecg-compare-viewer").or(page.getByTestId("sprint18-ecg-compare-overlay"))).toBeVisible();
    await page.screenshot({ path: "test-results/screenshots/sprint21-mode-compare.png" });
  });
});
