import { expect, test } from "./test";
import { bootstrapAuthenticatedPage, createClinicalFixture } from "./utils/qa";

async function openMonitorReady(page: import("@playwright/test").Page, caseId: string) {
  await page.goto(`/ecg-monitor/${caseId}`, { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("sprint13-ecg-monitor-loading")).toHaveCount(0, { timeout: 45_000 });
  await expect(page.getByTestId("sprint13-ecg-monitor-ready")).toBeVisible({ timeout: 45_000 });
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
    await expect(page.getByTestId("sprint14-ecg-ai-annotation-inspector")).toBeVisible();
    await page.getByRole("button", { name: /AI Overlay$/ }).click();
    await expect(page.getByRole("button", { name: "AI Overlay On" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Export Overlay" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Reset Overlay" })).toBeVisible();
    await expect(page.getByTestId("sprint13-ecg-viewer-status").getByText(/AI Overlay ON/)).toBeVisible();
  });

  test("ai overlay layer activates after toggle with zoom-safe status", async ({ page }) => {
    await openMonitorReady(page, caseId);
    await page.getByRole("button", { name: /AI Overlay$/ }).click();
    await expect(page.getByTestId("sprint14-ecg-ai-clinical-overlay")).toBeVisible();
    await page.getByRole("button", { name: "Zoom In" }).click();
    await page.getByRole("button", { name: "Fit Width" }).click();
    await expect(page.getByTestId("sprint14-ecg-ai-clinical-overlay")).toBeVisible();
    await expect(page.getByText("Please reload the app to continue.")).toHaveCount(0);
  });

  test("annotation labels and confidence controls are available", async ({ page }) => {
    await openMonitorReady(page, caseId);
    await page.getByRole("button", { name: /AI Overlay$/ }).click();
    await expect(page.getByRole("button", { name: "Labels On" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Confidence On" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Overlay \d+%/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Theme clinical|Theme dark|Theme light/ })).toBeVisible();
  });
});
