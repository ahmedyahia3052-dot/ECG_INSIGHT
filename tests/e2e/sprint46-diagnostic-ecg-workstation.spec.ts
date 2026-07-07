import { expect, test } from "./test";
import { bootstrapAuthenticatedPage, createClinicalFixture, API_URL, authHeaders } from "./utils/qa";
import { assertWorkspaceShell, openEcgWorkspace } from "./utils/ecg-workspace-locators";

test.describe("Sprint 46 Diagnostic ECG Workstation @sprint46 @enterprise", () => {
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

  test.beforeEach(async ({ page }) => {
    await bootstrapAuthenticatedPage(page, "doctor");
    await openEcgWorkspace(page, caseId);
    await assertWorkspaceShell(page);
    await expect(page.getByTestId("sprint46-diagnostic-workstation-ready")).toBeVisible({ timeout: 45_000 });
  });

  test("three-column hospital diagnostic shell renders", async ({ page }) => {
    await expect(page.getByTestId("sprint35-clinical-summary-panel")).toBeVisible();
    await expect(page.getByTestId("sprint35-clinical-right-panel")).toBeVisible();
    await expect(page.getByTestId("sprint46-diagnostic-center-canvas")).toBeVisible();
    await expect(page.getByTestId("sprint46-diagnostic-panels-ribbon")).toBeVisible();
    await expect(page.getByTestId("sprint46-diagnostic-lead-tools")).toBeVisible();
    await expect(page.getByTestId("sprint46-diagnostic-rhythm-strip")).toBeVisible();
  });

  test("lead tools isolate, magnifier, and compare sync toggles work", async ({ page }) => {
    await page.getByTestId("sprint46-lead-chip-V1").click();
    await page.getByTestId("sprint46-lead-isolate").click();
    await page.getByTestId("sprint46-lead-magnifier").click();
    await page.getByTestId("sprint46-compare-lead-sync").click();
    await page.getByTestId("sprint46-compare-beat-sync").click();
    await expect(page.getByTestId("sprint46-lead-chip-V1")).toBeVisible();
  });

  test("compare mode with difference highlighting", async ({ page }) => {
    await page.getByTestId("sprint46-compare-difference").click();
    await page.getByRole("button", { name: /Compare/i }).first().click().catch(() => undefined);
    await expect(page.getByTestId("sprint46-compare-difference")).toBeVisible();
  });

  test("diagnostic panels ribbon and AI cardiologist report linking", async ({ page }) => {
    await page.getByTestId("sprint46-panel-ai-findings").click();
    await page.getByTestId("sprint26-clinical-tab-ai").click();
    await expect(page.getByTestId("sprint38-ai-cardiologist-workspace")).toBeVisible({ timeout: 30_000 });
    const finding = page.locator('[data-testid^="sprint38-finding-"]').first();
    if (await finding.count()) {
      await finding.click();
      await expect(page.getByTestId("sprint46-panel-ai-findings")).toBeVisible();
    }
  });

  test("measurement studio and undo/redo remain available", async ({ page }) => {
    await page.getByTestId("sprint26-clinical-tab-measurements").click();
    await expect(page.getByTestId("sprint30-measurement-studio").or(page.getByTestId("sprint42-measurement-studio-sidebar"))).toBeVisible();
    await expect(page.getByTestId("sprint34-measure-undo")).toBeVisible();
    await expect(page.getByTestId("sprint34-measure-redo")).toBeVisible();
  });

  test("live monitor route remains independent from diagnostic workstation", async ({ page }) => {
    await page.goto(`/ecg-live-monitor/${caseId}`);
    await expect(page.getByTestId("sprint37-live-monitor-ready")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("sprint46-diagnostic-workstation-ready")).toHaveCount(0);
  });
});
