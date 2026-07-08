import { expect, test } from "./test";
import { bootstrapAuthenticatedPage, createClinicalFixture, type ClinicalFixture } from "./utils/qa";
import {
  assertWorkspaceShell,
  clickViewControl,
  ecgClinicalRightPanel,
  ecgLeftRail,
  ecgStatusBar,
  ensureLeftPanelOpen,
  openEcgMonitor,
  openMeasurementsTab,
  paletteButton,
  toolbarButton,
} from "./utils/ecg-workspace-locators";

async function loginDoctorPage(page: import("@playwright/test").Page) {
  await bootstrapAuthenticatedPage(page, "doctor");
}

test.describe("Sprint 13 ECG Monitor Workspace @sprint13", () => {
  test.describe.configure({ mode: "serial" });

  let fixture: ClinicalFixture & { csrfToken?: string; token: string };

  test.beforeAll(async ({ request }) => {
    fixture = await createClinicalFixture(request, { analyze: false, report: false });
  });

  test.beforeEach(async ({ page }) => {
    await loginDoctorPage(page);
  });

  test("ecg monitor workspace renders viewer foundation with toolbar and dockable panels", async ({ page }) => {
    await openEcgMonitor(page, fixture.caseId);
    await assertWorkspaceShell(page);
    await ensureLeftPanelOpen(page);
    await expect(ecgLeftRail(page).first()).toBeVisible();
    await expect(page.getByTestId("sprint30-clinical-workflow-ribbon")).toBeVisible();
    await expect(ecgClinicalRightPanel(page)).toBeVisible();
    await openMeasurementsTab(page);
    await expect(page.getByTestId("sprint15-ecg-measurements-panel")).toBeVisible();
    await expect(ecgStatusBar(page)).toBeVisible();
  });

  test("viewer toolbar controls adjust zoom and grid without crash", async ({ page }) => {
    await openEcgMonitor(page, fixture.caseId);
    await clickViewControl(page, "Zoom In");
    await clickViewControl(page, "Fit Image");
    await clickViewControl(page, "Rotate");
    await clickViewControl(page, "Grid");
    await expect(page.getByText("Please reload the app to continue.")).toHaveCount(0);
  });

  test("ecg case detail exposes ECG workspace entry point", async ({ page }) => {
    await page.goto(`/ecg-cases/${fixture.caseId}`);
    const entry = page.getByRole("button", { name: /ECG Workspace|ECG Monitor|Open Workspace/i });
    await expect(entry.first()).toBeVisible({ timeout: 45_000 });
    await entry.first().click();
    await expect(page).toHaveURL(new RegExp(`/ecg-workspace\\?caseId=${fixture.caseId}|/ecg-monitor/${fixture.caseId}`));
    await expect(page.getByTestId("sprint13-ecg-monitor-loading").or(page.getByTestId("ecg-workspace-loading"))).toHaveCount(0, { timeout: 45_000 });
    await expect(page.getByTestId("ecg-enterprise-workspace-ready")).toBeVisible({ timeout: 45_000 });
    await expect(page.getByTestId("sprint13-ecg-monitor-ready")).toBeVisible({ timeout: 45_000 });
  });

  test("measurement workspace panel and tools are available in Phase 2", async ({ page }) => {
    await openEcgMonitor(page, fixture.caseId);
    await openMeasurementsTab(page);
    await toolbarButton(page, "Measurements").click();
    await paletteButton(page, "Caliper").click();
    await paletteButton(page, "Measure").click();
    await expect(page.getByTestId("sprint13-ecg-measurement-overlay")).toBeVisible();
    await expect(page.getByText("Please reload the app to continue.")).toHaveCount(0);
  });

  test("production viewer engine exposes pan, grid opacity, and clinical findings", async ({ page }) => {
    await openEcgMonitor(page, fixture.caseId);
    await expect(page.getByTestId("sprint13-ecg-pro-viewer-engine")).toBeVisible();
    await expect(page.getByTestId("sprint13-ecg-image-canvas")).toBeVisible();
    await expect(page.getByTestId("sprint52-ecg-workspace-ready")).toBeVisible();
    await paletteButton(page, "Pan").click();
    await clickViewControl(page, "Fit Image");
    await expect(ecgStatusBar(page)).toBeVisible();
  });
});
