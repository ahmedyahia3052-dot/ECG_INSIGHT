import { expect, test } from "./test";
import { bootstrapAuthenticatedPage, createClinicalFixture } from "./utils/qa";
import { clickViewControl, ecgViewMode, openAiTab, openEcgMonitor, toolbarButton } from "./utils/ecg-workspace-locators";

async function openMonitorReady(page: import("@playwright/test").Page, caseId: string) {
  await openEcgMonitor(page, caseId);
  await expect(page.getByTestId("sprint13-ecg-image-loading")).toHaveCount(0, { timeout: 45_000 });
}

test.describe("Sprint 14 AI Clinical Overlay @sprint14", () => {
  test.describe.configure({ mode: "serial" });

  let caseId = "";

  test.beforeAll(async ({ request }) => {
    const fixture = await createClinicalFixture(request, { analyze: false, report: false });
    caseId = fixture.caseId;
  });

  test.beforeEach(async ({ page }) => {
    await bootstrapAuthenticatedPage(page, "doctor");
  });

  test("ai overlay toolbar and inspector render on monitor workspace", async ({ page }) => {
    await openMonitorReady(page, caseId);
    await openAiTab(page);
    await ecgViewMode(page, "ai-review").click();
    await expect(page.getByTestId("sprint14-ecg-ai-annotation-inspector")).toBeVisible();
    await expect(toolbarButton(page, "Export PNG")).toBeVisible();
  });

  test("ai overlay layer activates after toggle with zoom-safe status", async ({ page }) => {
    await openMonitorReady(page, caseId);
    await ecgViewMode(page, "ai-review").click();
    await expect(page.getByTestId("sprint14-ecg-ai-clinical-overlay").or(page.getByTestId("sprint21-ai-review-view"))).toBeVisible({
      timeout: 20_000,
    });
    await ecgViewMode(page, "image").click();
    await clickViewControl(page, "Zoom In");
    await clickViewControl(page, "Fit Image");
    await expect(page.getByTestId("sprint14-ecg-ai-clinical-overlay").or(page.getByTestId("sprint21-ai-review-view"))).toBeVisible();
  });
});
