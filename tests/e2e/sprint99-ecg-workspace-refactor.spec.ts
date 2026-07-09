import { expect, test } from "./test";
import { bootstrapAuthenticatedPage, createClinicalFixture } from "./utils/qa";
import {
  ecgClinicalRightPanel,
  ecgToolbar,
  openEcgLiveMonitor,
  openEcgWorkspace,
  openLiveMonitorFromWorkspace,
} from "./utils/ecg-workspace-locators";

test.describe("Sprint 99 ECG Workspace Refactor @sprint99 @enterprise", () => {
  test.describe.configure({ mode: "serial" });

  let caseId = "";

  test.beforeAll(async ({ request }) => {
    const fixture = await createClinicalFixture(request, { analyze: true, report: true });
    caseId = fixture.caseId;
  });

  test("workspace has no embedded live monitor view mode", async ({ page }) => {
    await bootstrapAuthenticatedPage(page, "doctor");
    await openEcgWorkspace(page, caseId);
    await expect(page.getByTestId("sprint52-ecg-workspace-ready")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("sprint21-view-mode-monitor")).toHaveCount(0);
    await expect(page.getByTestId("sprint22-hospital-live-monitor")).toHaveCount(0);
  });

  test("right panel uses collapsible clinical sections", async ({ page }) => {
    await bootstrapAuthenticatedPage(page, "doctor");
    await openEcgWorkspace(page, caseId);
    await expect(ecgClinicalRightPanel(page)).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("sprint99-clinical-section-ai-findings")).toBeVisible();
    await expect(page.getByTestId("sprint99-clinical-section-measurements")).toBeVisible();
    await expect(page.getByTestId("sprint99-clinical-section-previous-ecg")).toBeVisible();
  });

  test("live monitor opens only on dedicated route", async ({ page }) => {
    await bootstrapAuthenticatedPage(page, "doctor");
    await openEcgWorkspace(page, caseId);
    await openLiveMonitorFromWorkspace(page, caseId);
    await expect(page.getByTestId("sprint37-live-monitor-ready")).toBeVisible({ timeout: 30_000 });
    await openEcgLiveMonitor(page, caseId);
    await expect(page.getByTestId("sprint22-hospital-monitor-canvas")).toBeVisible({ timeout: 20_000 });
  });

  test("fit width control remains available on workspace toolbar", async ({ page }) => {
    await bootstrapAuthenticatedPage(page, "doctor");
    await openEcgWorkspace(page, caseId);
    await expect(ecgToolbar(page)).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("sprint52-fit-width")).toBeVisible();
  });
});
