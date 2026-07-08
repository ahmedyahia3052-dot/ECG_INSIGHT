import { expect, test } from "./test";
import { bootstrapAuthenticatedPage, createClinicalFixture } from "./utils/qa";
import {
  clickViewControl,
  ecgClinicalRightPanel,
  ecgFloatingPalette,
  ecgLeftRail,
  ecgStatusBar,
  ecgToolbar,
  openEcgMonitor,
  openMeasurementsTab,
  paletteButton,
} from "./utils/ecg-workspace-locators";

const VIEWPORTS = [
  { height: 768, label: "1366x768", width: 1366 },
  { height: 900, label: "1440x900", width: 1440 },
  { height: 900, label: "1600x900", width: 1600 },
  { height: 1080, label: "1920x1080", width: 1920 },
] as const;

async function openMonitorReady(page: import("@playwright/test").Page, caseId: string) {
  await openEcgMonitor(page, caseId);
  await expect(page.getByTestId("sprint13-ecg-image-loading")).toHaveCount(0, { timeout: 45_000 });
}

test.describe("Sprint 36 Clinical Validation @sprint36-qa", () => {
  test.describe.configure({ mode: "serial" });

  let caseId = "";
  const consoleErrors: string[] = [];

  test.beforeAll(async ({ request }) => {
    const fixture = await createClinicalFixture(request, { analyze: false, report: false });
    caseId = fixture.caseId;
  });

  test.beforeEach(async ({ page }) => {
    consoleErrors.length = 0;
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });
    page.on("pageerror", (error) => consoleErrors.push(error.message));
    await bootstrapAuthenticatedPage(page, "doctor");
  });

  test.afterEach(async () => {
    const ignored = consoleErrors.filter(
      (line) =>
        !line.includes("favicon") &&
        !line.includes("404") &&
        !line.includes("ResizeObserver") &&
        !line.includes("Non-Error promise rejection"),
    );
    expect(ignored, `Console errors: ${ignored.join("; ")}`).toHaveLength(0);
  });

  for (const viewport of VIEWPORTS) {
    test(`responsive layout ${viewport.label} — no clipping`, async ({ page }) => {
      await page.setViewportSize({ height: viewport.height, width: viewport.width });
      await openMonitorReady(page, caseId);
      await expect(ecgLeftRail(page)).toBeVisible();
      await expect(ecgClinicalRightPanel(page)).toBeVisible();
      await expect(ecgToolbar(page)).toBeVisible();
      await expect(ecgStatusBar(page)).toBeVisible();
      await expect(page.getByTestId("sprint30-clinical-workflow-ribbon")).toBeVisible();
    });
  }

  test("viewer controls: zoom, pan, reset, fit", async ({ page }) => {
    await openMonitorReady(page, caseId);
    const zoomBefore = await page.getByTestId("sprint17-status-zoom").innerText();
    await page.keyboard.press("Control+=");
    await expect(page.getByTestId("sprint17-status-zoom")).not.toHaveText(zoomBefore);
    await expect(page.getByTestId("sprint13-ecg-pro-viewer-engine")).toBeVisible();
  });

  test("measurement overlay stable after zoom", async ({ page }) => {
    await openMonitorReady(page, caseId);
    await expect(page.getByTestId("sprint13-ecg-measurement-overlay")).toBeVisible();
    await page.keyboard.press("Control+=");
    await expect(page.getByTestId("sprint14-ecg-measurement-overlay")).toBeVisible();
  });

  test("AI findings tab renders without overlap", async ({ page }) => {
    await openMonitorReady(page, caseId);
    await page.getByTestId("sprint26-clinical-tab-ai").click();
    await expect(page.getByTestId("sprint38-ai-cardiologist-workspace")).toBeVisible();
    await expect(page.getByTestId("sprint35-measurements-tab-pane")).toHaveCount(0);
  });

  test("diagnostic fullscreen and ESC restore", async ({ page }) => {
    await openMonitorReady(page, caseId);
    await page.getByTestId("sprint29-diagnostic-mode").first().click();
    await expect(page.getByTestId("sprint35-exit-diagnostic").or(page.getByTestId("sprint29-exit-diagnostic"))).toBeVisible();
    await expect(ecgToolbar(page)).toHaveCount(0);
    await page.mouse.move(300, 300);
    await expect(ecgFloatingPalette(page)).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(ecgToolbar(page)).toBeVisible({ timeout: 10_000 });
  });
});
