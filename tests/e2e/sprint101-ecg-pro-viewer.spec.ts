import { expect, test } from "./test";
import { bootstrapAuthenticatedPage, createClinicalFixture, FRONTEND_URL } from "./utils/qa";

test.describe("Sprint 101 ECG Pro Viewer Clinical Polish @sprint101", () => {
  test.describe.configure({ mode: "serial" });

  let caseId = "";

  test.beforeAll(async ({ request }) => {
    const fixture = await createClinicalFixture(request, { analyze: false, report: false });
    caseId = fixture.caseId;
  });

  test.beforeEach(async ({ page }) => {
    await bootstrapAuthenticatedPage(page, "doctor");
  });

  test("pro viewer exposes sprint 101 clinical polish controls", async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/ecg-viewer?caseId=${encodeURIComponent(caseId)}`);
    await expect(page.getByTestId("sprint101-ecg-pro-viewer-root")).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId("sprint101-ecg-pro-viewer-toolbar")).toBeVisible();
    await expect(page.getByTestId("sprint101-clinical-measurements-panel")).toBeVisible();
    await expect(page.getByTestId("sprint101-fit-width")).toBeVisible();
    await expect(page.getByTestId("sprint101-lead-selector")).toBeVisible();
    await expect(page.getByTestId("sprint101-overlay-toggle")).toBeVisible();
    await expect(page.getByTestId("sprint101-ai-findings")).toBeVisible();
    await expect(page.getByTestId("sprint101-snapshot")).toBeVisible();
    await expect(page.getByTestId("sprint101-export-json")).toBeVisible();
  });

  test("clinical measurement cards and compare mode render", async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/ecg-viewer?caseId=${encodeURIComponent(caseId)}`);
    await expect(page.getByTestId("sprint101-clinical-measurements-panel")).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId("sprint101-clinical-measurements-panel").getByText("Heart Rate")).toBeVisible();
    await expect(page.getByTestId("sprint101-clinical-measurements-panel").getByText("QTc")).toBeVisible();
    await page.getByTestId("sprint101-compare-toggle").click();
    await expect(page.getByTestId("sprint101-compare-layout")).toBeVisible();
    await page.getByTestId("sprint101-ai-findings").click();
    await expect(page.getByTestId("sprint101-ai-findings-sidebar")).toBeVisible();
  });
});
