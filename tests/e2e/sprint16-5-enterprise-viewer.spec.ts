import { expect, test } from "./test";
import { bootstrapAuthenticatedPage, createClinicalFixture, API_URL, authHeaders } from "./utils/qa";

async function openEnterpriseWorkspace(page: import("@playwright/test").Page, caseId: string) {
  await page.goto(`/ecg-monitor/${caseId}`, { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("sprint13-ecg-monitor-loading")).toHaveCount(0, { timeout: 45_000 });
  await expect(page.getByTestId("sprint13-ecg-monitor-ready")).toBeVisible({ timeout: 45_000 });
  await expect(page.getByTestId("sprint13-ecg-viewer-toolbar")).toBeVisible({ timeout: 20_000 });
}

test.describe("Sprint 16.5 Enterprise Clinical Workspace @sprint165", () => {
  test.describe.configure({ mode: "serial" });

  let caseId = "";
  let csrfToken = "";

  test.beforeAll(async ({ request }) => {
    const fixture = await createClinicalFixture(request, { analyze: false, report: false });
    caseId = fixture.caseId;
    csrfToken = fixture.csrfToken ?? "";
    const digitize = await request.post(`${API_URL}/ecg/digitize`, {
      data: { caseId, gainMmPerMv: 10, paperSpeedMmPerSec: 25 },
      headers: authHeaders(fixture.token, csrfToken),
    });
    expect(digitize.ok(), `Digitize API should succeed: ${await digitize.text()}`).toBeTruthy();
  });

  test.beforeEach(async ({ page }) => {
    await bootstrapAuthenticatedPage(page, "doctor");
  });

  test("enterprise workspace renders integrated rails, toolbar, and quality panel", async ({ page }) => {
    await openEnterpriseWorkspace(page, caseId);
    await expect(page.getByTestId("sprint165-ecg-left-rail")).toBeVisible();
    await expect(page.getByTestId("sprint165-ecg-right-rail")).toBeVisible();
    await expect(page.getByTestId("sprint165-digitization-quality-panel")).toBeVisible();
    await expect(page.getByTestId("sprint15-ecg-measurements-panel")).toBeVisible();
    await expect(page.getByTestId("sprint13-ecg-pro-viewer-engine")).toBeVisible();
  });

  test("compare mode, waveform toggle, and settings remain stable after zoom", async ({ page }) => {
    await openEnterpriseWorkspace(page, caseId);
    await page.getByRole("button", { name: "Compare", exact: true }).click();
    await expect(page.getByTestId("sprint165-ecg-compare-viewer")).toBeVisible();
    await page.getByRole("button", { name: /Wave On|Wave Off/ }).click();
    await page.getByRole("button", { name: "Settings", exact: true }).click();
    await expect(page.getByText("Viewer Settings")).toBeVisible();
    await page.getByRole("button", { name: "Close", exact: true }).click();
    await page.getByRole("button", { name: /Zoom \d+x/ }).click();
    await page.getByRole("button", { name: "Fit Width" }).click();
    await expect(page.getByTestId("sprint165-ecg-compare-viewer")).toBeVisible();
  });

  test("rhythm strip and digitized overlay render after lead change", async ({ page }) => {
    await openEnterpriseWorkspace(page, caseId);
    await page.getByRole("button", { name: "V1", exact: true }).first().click();
    await expect(page.getByTestId("sprint13-ecg-rhythm-strip-panel")).toBeVisible();
    await expect(page.getByTestId("sprint165-rhythm-strip-waveform")).toHaveCount(1, { timeout: 20_000 });
    await expect(page.getByTestId("sprint13-ecg-layer-digitized")).toHaveCount(1, { timeout: 20_000 });
  });
});
