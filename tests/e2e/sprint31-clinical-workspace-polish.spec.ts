import { expect, test } from "./test";
import { bootstrapAuthenticatedPage, createClinicalFixture } from "./utils/qa";
import { ecgClinicalRightPanel, ecgLeftRail, ecgStatusBar, ecgToolbar, openEcgWorkspace, toolbarButton } from "./utils/ecg-workspace-locators";

test.describe("Sprint 31 Clinical Workspace Polish @sprint31", () => {
  test.describe.configure({ mode: "serial" });

  let caseId = "";

  test.beforeAll(async ({ request }) => {
    const fixture = await createClinicalFixture(request, { analyze: true });
    caseId = fixture.caseId;
  });

  test.beforeEach(async ({ page }) => {
    await bootstrapAuthenticatedPage(page, "doctor");
  });

  test("unified clinical panel, compact toolbar, and pipeline chips", async ({ page }) => {
    await openEcgWorkspace(page, caseId);
    await expect(ecgLeftRail(page).first()).toBeVisible({ timeout: 20_000 });
    await expect(ecgToolbar(page)).toBeVisible();
    await expect(page.getByTestId("sprint30-clinical-workflow-ribbon")).toBeVisible();
    await expect(page.getByTestId("sprint33-pipeline-1").or(page.getByTestId("sprint32-pipeline-1")).or(page.getByTestId("sprint31-pipeline-1"))).toBeVisible();
    await expect(ecgClinicalRightPanel(page)).toBeVisible();
    await page.screenshot({ fullPage: false, path: "test-results/screenshots/sprint31-workspace-polish.png" });
  });

  test("diagnostic fullscreen hides chrome and restores on ESC", async ({ page }) => {
    await openEcgWorkspace(page, caseId);
    await toolbarButton(page, "Fullscreen").click();
    await expect(page.getByTestId("sprint29-exit-diagnostic")).toBeVisible();
    await expect(ecgStatusBar(page)).toHaveCount(0);
    await page.keyboard.press("Escape");
    await expect(ecgStatusBar(page)).toBeVisible({ timeout: 10_000 });
    await expect(ecgToolbar(page)).toBeVisible();
  });
});
