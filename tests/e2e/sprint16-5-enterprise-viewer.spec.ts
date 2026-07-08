import { expect, test } from "./test";
import { bootstrapAuthenticatedPage, createClinicalFixture, API_URL, authHeaders } from "./utils/qa";
import {
  clickViewControl,
  ecgClinicalRightPanel,
  ecgLeftRail,
  ecgToolbar,
  ecgViewMode,
  ensureLeftPanelOpen,
  openEcgWorkspace,
  openMeasurementsTab,
  paletteButton,
  toolbarButton, activateMonitorView } from "./utils/ecg-workspace-locators";

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
    await openEcgWorkspace(page, caseId);
    await ensureLeftPanelOpen(page);
    await expect(ecgLeftRail(page)).toBeVisible();
    await expect(ecgClinicalRightPanel(page)).toBeVisible();
    await expect(ecgToolbar(page)).toBeVisible();
    await openMeasurementsTab(page);
    await expect(page.getByTestId("sprint15-ecg-measurements-panel")).toBeVisible();
    await expect(page.getByTestId("sprint13-ecg-pro-viewer-engine")).toBeVisible();
  });

  test("compare mode, waveform toggle, and settings remain stable after zoom", async ({ page }) => {
    await openEcgWorkspace(page, caseId);
    await ecgViewMode(page, "compare").click();
    await expect(page.getByTestId("sprint165-ecg-compare-viewer").or(page.getByTestId("sprint18-ecg-compare-overlay"))).toBeVisible();
    await page.getByRole("button", { name: "Settings", exact: true }).first().click();
    await expect(page.getByText("Viewer Settings")).toBeVisible();
    await page.getByRole("button", { name: "Close", exact: true }).click();
    await clickViewControl(page, "Zoom In");
    await clickViewControl(page, "Fit Image");
    await expect(page.getByTestId("sprint165-ecg-compare-viewer").or(page.getByTestId("sprint18-ecg-compare-overlay"))).toBeVisible();
  });

  test("rhythm strip and digitized overlay render after lead change", async ({ page }) => {
    await openEcgWorkspace(page, caseId);
    await activateMonitorView(page);
    await expect(page.getByTestId("sprint22-hospital-live-monitor").or(page.getByTestId("sprint18-live-monitor"))).toBeVisible();
    await page.getByRole("button", { name: "V1", exact: true }).first().click();
    await ecgViewMode(page, "waveform").click();
    await expect(page.getByTestId("sprint18-waveform-view")).toBeVisible({ timeout: 20_000 });
  });
});
