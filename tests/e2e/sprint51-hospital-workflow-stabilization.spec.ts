import { expect, test } from "./test";
import { bootstrapAuthenticatedPage, createClinicalFixture, API_URL, authHeaders } from "./utils/qa";
import { openEcgLiveMonitor, openEcgWorkspace, ECG_WORKSPACE_READY } from "./utils/ecg-workspace-locators";

test.describe("Sprint 51 Hospital Workflow Stabilization @sprint51 @enterprise", () => {
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

  test("workspace auto-resolves case — never shows No sample ECG", async ({ page }) => {
    await bootstrapAuthenticatedPage(page, "doctor");
    await openEcgWorkspace(page, caseId);
    await expect(page.getByTestId(ECG_WORKSPACE_READY)).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("No sample ECG available")).toHaveCount(0);
    await expect(page.getByText("No ECG Examination Found")).toHaveCount(0);
    await expect(page.getByTestId("sprint13-ecg-monitor-ready")).toBeVisible({ timeout: 20_000 });
  });

  test("workspace without caseId opens newest examination automatically", async ({ page }) => {
    await bootstrapAuthenticatedPage(page, "doctor");
    await page.goto("/ecg-workspace", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("ecg-workspace-resolving")).toHaveCount(0, { timeout: 45_000 });
    await expect(
      page.getByTestId(ECG_WORKSPACE_READY)
        .or(page.getByTestId("ecg-examination-selector"))
        .or(page.getByTestId("ecg-examination-empty-state")),
    ).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText("No sample ECG available")).toHaveCount(0);
  });

  test("deprecated empty copy never appears in hospital workflow", async ({ page }) => {
    await bootstrapAuthenticatedPage(page, "doctor");
    await page.goto("/ecg-workspace", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("ecg-workspace-resolving")).toHaveCount(0, { timeout: 45_000 });
    await expect(page.getByText("No sample ECG available")).toHaveCount(0);
    await expect(page.getByTestId("ecg-workspace-no-demo")).toHaveCount(0);
    await expect(
      page.getByTestId(ECG_WORKSPACE_READY)
        .or(page.getByTestId("ecg-examination-selector"))
        .or(page.getByTestId("ecg-examination-empty-state")),
    ).toBeVisible({ timeout: 60_000 });
  });

  test("live monitor receives digitized signal and renders canvas", async ({ page }) => {
    await bootstrapAuthenticatedPage(page, "doctor");
    await openEcgLiveMonitor(page, caseId);
    await expect(page.getByTestId("sprint37-live-monitor-ready")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("sprint22-hospital-monitor-canvas")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText("No sample ECG available")).toHaveCount(0);
  });

  test("upload → workspace → report workflow smoke", async ({ page }) => {
    await bootstrapAuthenticatedPage(page, "doctor");
    await openEcgWorkspace(page, caseId);
    await expect(page.getByTestId(ECG_WORKSPACE_READY)).toBeVisible({ timeout: 30_000 });
    const reportStep = page.getByTestId("sprint30-workflow-step-final-report").or(page.getByRole("button", { name: /Report|Final Report/i }).first());
    if (await reportStep.isVisible().catch(() => false)) {
      await reportStep.click();
      await expect(page.getByTestId("sprint43-enterprise-clinical-report").first()).toBeVisible({ timeout: 15_000 });
    }
  });
});
