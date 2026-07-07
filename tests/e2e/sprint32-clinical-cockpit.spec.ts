import { expect, test } from "./test";
import { bootstrapAuthenticatedPage, createClinicalFixture } from "./utils/qa";
import { ecgClinicalRightPanel, ecgStatusBar, ecgToolbar, openEcgWorkspace } from "./utils/ecg-workspace-locators";

test.describe("Sprint 32 Clinical Cockpit @sprint32", () => {
  test.describe.configure({ mode: "serial" });

  let caseId = "";

  test.beforeAll(async ({ request }) => {
    const fixture = await createClinicalFixture(request, { analyze: true });
    caseId = fixture.caseId;
  });

  test.beforeEach(async ({ page }) => {
    await bootstrapAuthenticatedPage(page, "doctor");
  });

  test("clinical summary panel, compact toolbar, and tabbed right panel", async ({ page }) => {
    await openEcgWorkspace(page, caseId);
    await expect(page.getByTestId("sprint33-clinical-summary-panel").or(page.getByTestId("sprint32-clinical-summary-panel"))).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("sprint32-lead-selector-grid")).toBeVisible();
    await expect(ecgToolbar(page)).toBeVisible();
    await expect(ecgClinicalRightPanel(page)).toBeVisible();
    await expect(page.getByTestId("sprint33-clinical-tabs").or(page.getByTestId("sprint32-clinical-tabs"))).toBeVisible();
    await page.getByTestId("sprint26-clinical-tab-ai").click();
    await expect(page.getByTestId("sprint30-ai-review-panel")).toBeVisible();
    await page.screenshot({ fullPage: false, path: "test-results/screenshots/sprint32-clinical-cockpit.png" });
  });

  test("doctor mode hides developer metrics until toggled", async ({ page }) => {
    await openEcgWorkspace(page, caseId);
    await expect(page.getByTestId("sprint32-enterprise-status-bar")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("sprint17-status-fps")).toHaveCount(0);
    await page.getByTestId("sprint32-dev-mode-toggle").click();
    await expect(page.getByTestId("sprint17-status-fps")).toBeVisible({ timeout: 10_000 });
  });

  test("diagnostic fullscreen hides chrome and restores on ESC", async ({ page }) => {
    await openEcgWorkspace(page, caseId);
    await page.getByTestId("sprint29-diagnostic-mode").first().click();
    await expect(page.getByTestId("sprint29-exit-diagnostic")).toBeVisible();
    await expect(ecgStatusBar(page)).toHaveCount(0);
    await page.keyboard.press("Escape");
    await expect(ecgStatusBar(page)).toBeVisible({ timeout: 10_000 });
    await expect(ecgToolbar(page)).toBeVisible();
  });
});
