import { expect, test } from "./test";
import { bootstrapAuthenticatedPage, createClinicalFixture } from "./utils/qa";
import { openEcgMonitor } from "./utils/ecg-workspace-locators";

async function openMonitorReady(page: import("@playwright/test").Page, caseId: string) {
  await openEcgMonitor(page, caseId);
  await expect(page.getByTestId("sprint13-ecg-image-loading")).toHaveCount(0, { timeout: 45_000 });
}

async function openReportView(page: import("@playwright/test").Page) {
  const reportMode = page.getByTestId("sprint21-view-mode-report");
  if (await reportMode.isVisible().catch(() => false)) {
    await reportMode.click();
  } else {
    await page.getByRole("button", { name: /Report Preview|Report/i }).first().click();
  }
  await expect(page.getByText("Clinical Report Preview").first()).toBeVisible({ timeout: 20_000 });
}

test.describe("Sprint 43 Clinical Report Engine @sprint43 @enterprise", () => {
  test.describe.configure({ mode: "serial" });

  let caseId = "";

  test.beforeAll(async ({ request }) => {
    const fixture = await createClinicalFixture(request, { analyze: true, report: true });
    caseId = fixture.caseId;
  });

  test.beforeEach(async ({ page }) => {
    await bootstrapAuthenticatedPage(page, "doctor");
    await openMonitorReady(page, caseId);
    await openReportView(page);
  });

  test("enterprise report panel renders with report types and themes", async ({ page }) => {
    await expect(page.getByTestId("sprint43-enterprise-report-host")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("sprint43-clinical-report-panel")).toBeVisible();
    const report = page.getByTestId("sprint43-enterprise-clinical-report");
    await expect(report).toBeVisible();
    await page.getByRole("button", { name: "Hospital PDF", exact: true }).click();
    await page.getByRole("button", { name: "Dark", exact: true }).click();
    await page.getByRole("button", { name: "Landscape", exact: true }).click();
    await expect(report.getByRole("heading", { name: "Patient Header" })).toBeVisible();
    await expect(report.getByRole("heading", { name: "ECG Parameters" })).toBeVisible();
    await expect(report.getByRole("heading", { name: "AI Findings" })).toBeVisible();
    await expect(report.getByRole("heading", { name: "Clinical Impression" })).toBeVisible();
  });

  test("report sections include measurements differential and confidence", async ({ page }) => {
    const report = page.getByTestId("sprint43-enterprise-clinical-report");
    await expect(report).toBeVisible({ timeout: 30_000 });
    await expect(report.getByRole("heading", { name: "Differential Diagnosis" })).toBeVisible();
    await expect(report.getByRole("heading", { name: "Clinical Recommendations" })).toBeVisible();
    await expect(report.getByRole("heading", { name: "Confidence Summary" })).toBeVisible();
    await expect(report.getByRole("heading", { name: "Lead Summary" })).toBeVisible();
    await expect(report.getByRole("heading", { name: "Doctor Review" })).toBeVisible();
  });

  test("export preview controls and JSON export button", async ({ page }) => {
    await expect(page.getByTestId("sprint43-clinical-report-panel")).toBeVisible({ timeout: 30_000 });
    await page.getByRole("button", { name: "Export Preview", exact: true }).click();
    await expect(page.getByTestId("sprint43-report-export-json")).toBeVisible();
    await expect(page.getByTestId("sprint43-report-export-fhir")).toBeVisible();
    await expect(page.getByTestId("sprint43-report-print")).toBeVisible();
  });

  test("generate report workflow preserves legacy preview", async ({ page }) => {
    await expect(page.getByRole("button", { name: /Generate Report|Generate Clinical Report/i }).first()).toBeVisible();
    await expect(page.getByText("Clinical Report Preview").first()).toBeVisible();
  });
});
