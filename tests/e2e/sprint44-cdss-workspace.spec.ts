import { expect, test } from "./test";
import { bootstrapAuthenticatedPage, createClinicalFixture } from "./utils/qa";
import { openEcgMonitor } from "./utils/ecg-workspace-locators";

async function openMonitorReady(page: import("@playwright/test").Page, caseId: string) {
  await openEcgMonitor(page, caseId);
  await expect(page.getByTestId("sprint13-ecg-image-loading")).toHaveCount(0, { timeout: 45_000 });
}

async function openCdssTab(page: import("@playwright/test").Page) {
  await page.getByTestId("sprint26-clinical-tab-cdss").click();
  await expect(page.getByTestId("sprint44-cdss-tab-pane")).toBeVisible({ timeout: 20_000 });
}

test.describe("Sprint 44 Clinical Decision Support @sprint44 @enterprise", () => {
  test.describe.configure({ mode: "serial" });

  let caseId = "";

  test.beforeAll(async ({ request }) => {
    const fixture = await createClinicalFixture(request, { analyze: true, report: true });
    caseId = fixture.caseId;
  });

  test.beforeEach(async ({ page }) => {
    await bootstrapAuthenticatedPage(page, "doctor");
    await openMonitorReady(page, caseId);
    await openCdssTab(page);
  });

  test("CDSS workspace renders triage badge and clinical summary", async ({ page }) => {
    const workspace = page.getByTestId("sprint44-cdss-workspace");
    await expect(workspace).toBeVisible({ timeout: 30_000 });
    await expect(workspace.getByRole("heading", { name: "Clinical Summary" })).toBeVisible();
    await expect(workspace.getByRole("heading", { name: "Diagnosis" })).toBeVisible();
    await expect(page.getByTestId("sprint44-cdss-triage-badge")).toBeVisible();
  });

  test("CDSS panels include differential evidence recommendations guidelines risk", async ({ page }) => {
    const workspace = page.getByTestId("sprint44-cdss-workspace");
    await expect(workspace.getByRole("heading", { name: "Differential" })).toBeVisible();
    await expect(workspace.getByRole("heading", { name: "Evidence" })).toBeVisible();
    await expect(workspace.getByRole("heading", { name: "Recommendations" })).toBeVisible();
    await expect(workspace.getByRole("heading", { name: "Guidelines" })).toBeVisible();
    await expect(workspace.getByRole("heading", { name: "Risk" })).toBeVisible();
    await expect(workspace.getByRole("heading", { name: "Finding Relationship Graph" })).toBeVisible();
  });

  test("report view includes clinical decision support section", async ({ page }) => {
    const reportMode = page.getByTestId("sprint21-view-mode-report");
    if (await reportMode.isVisible().catch(() => false)) {
      await reportMode.click();
    } else {
      await page.getByRole("button", { name: /Report Preview|Report/i }).first().click();
    }
    await expect(page.getByTestId("sprint43-enterprise-clinical-report")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("sprint44-report-clinical-decision")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Clinical Decision Support" })).toBeVisible();
  });

  test("Sprint 43 report engine sections remain present", async ({ page }) => {
    const reportMode = page.getByTestId("sprint21-view-mode-report");
    if (await reportMode.isVisible().catch(() => false)) {
      await reportMode.click();
    } else {
      await page.getByRole("button", { name: /Report Preview|Report/i }).first().click();
    }
    const report = page.getByTestId("sprint43-enterprise-clinical-report");
    await expect(report).toBeVisible({ timeout: 30_000 });
    await expect(report.getByRole("heading", { name: "Patient Header" })).toBeVisible();
    await expect(report.getByRole("heading", { name: "AI Findings" })).toBeVisible();
    await expect(report.getByRole("heading", { name: "Doctor Review" })).toBeVisible();
  });
});
