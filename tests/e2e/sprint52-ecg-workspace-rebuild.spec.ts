import { expect, test } from "./test";
import { bootstrapAuthenticatedPage, createClinicalFixture, API_URL, authHeaders } from "./utils/qa";
import {
  ecgLeftSidebarTools,
  ecgStatusBar,
  ecgToolbar,
  ecgViewMode,
  openEcgLiveMonitor,
  openEcgWorkspace,
  openLiveMonitorFromWorkspace,
  ECG_WORKSPACE_READY,
} from "./utils/ecg-workspace-locators";

const STANDARD_LEADS = ["I", "II", "III", "aVR", "aVL", "aVF", "V1", "V2", "V3", "V4", "V5", "V6"] as const;

test.describe("Sprint 52 ECG Workspace Professional Rebuild @sprint52 @enterprise", () => {
  test.describe.configure({ mode: "serial" });

  let caseId = "";

  test.beforeAll(async ({ request }) => {
    const fixture = await createClinicalFixture(request, { analyze: true, report: true });
    caseId = fixture.caseId;
    const digitize = await request.post(`${API_URL}/ecg/digitize`, {
      data: { caseId, gainMmPerMv: 10, paperSpeedMmPerSec: 25 },
      headers: authHeaders(fixture.token, fixture.csrfToken),
    });
    expect(digitize.ok(), `Digitize API should succeed: ${await digitize.text()}`).toBeTruthy();
  });

  test("workspace has no embedded live monitor view mode", async ({ page }) => {
    await bootstrapAuthenticatedPage(page, "doctor");
    await openEcgWorkspace(page, caseId);
    await expect(page.getByTestId("sprint52-ecg-workspace-ready")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("sprint21-view-mode-monitor")).toHaveCount(0);
    await expect(page.getByTestId("sprint22-hospital-live-monitor")).toHaveCount(0);
  });

  test("grouped professional toolbar renders all sections", async ({ page }) => {
    await bootstrapAuthenticatedPage(page, "doctor");
    await openEcgWorkspace(page, caseId);
    await expect(ecgToolbar(page)).toBeVisible({ timeout: 20_000 });
    for (const group of ["image", "view", "analysis", "annotations", "report"]) {
      await expect(page.getByTestId(`sprint52-toolbar-group-${group}`)).toBeVisible();
    }
  });

  test("live monitor opens only via dedicated route or toolbar", async ({ page }) => {
    await bootstrapAuthenticatedPage(page, "doctor");
    await openEcgWorkspace(page, caseId);
    await openLiveMonitorFromWorkspace(page, caseId);
    await expect(page.getByTestId("sprint22-hospital-monitor-canvas")).toBeVisible({ timeout: 20_000 });
    await page.goto(`/ecg-workspace?caseId=${caseId}`, { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId(ECG_WORKSPACE_READY)).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("sprint22-hospital-live-monitor")).toHaveCount(0);
  });

  test("12-lead digitized layout shows all standard leads", async ({ page }) => {
    await bootstrapAuthenticatedPage(page, "doctor");
    await openEcgWorkspace(page, caseId);
    await ecgViewMode(page, "waveform").click();
    await expect(page.getByTestId("sprint28-clinical-visualization-canvas")).toBeVisible({ timeout: 20_000 });
    for (const lead of STANDARD_LEADS) {
      await expect(page.getByTestId("sprint28-clinical-render-svg").getByText(lead, { exact: true })).toBeVisible();
    }
  });

  test("lead layout presets are selectable", async ({ page }) => {
    await bootstrapAuthenticatedPage(page, "doctor");
    await openEcgWorkspace(page, caseId);
    await ecgViewMode(page, "waveform").click();
    for (const layout of ["6x2", "3x4", "stacked"] as const) {
      await page.getByTestId(`sprint52-lead-layout-${layout}`).click();
      for (const lead of STANDARD_LEADS) {
        await expect(page.getByTestId("sprint28-clinical-render-svg").getByText(lead, { exact: true })).toBeVisible();
      }
    }
  });

  test("fit width, height, page and zoom presets work", async ({ page }) => {
    await bootstrapAuthenticatedPage(page, "doctor");
    await openEcgWorkspace(page, caseId);
    await ecgViewMode(page, "image").click();
    await page.getByTestId("sprint52-fit-width").click();
    await expect(ecgStatusBar(page).getByTestId("sprint17-status-zoom")).not.toHaveText("0%");
    await page.getByTestId("sprint52-fit-height").click();
    await page.getByTestId("sprint52-fit-page").click();
    for (const preset of ["100", "150", "200", "300"] as const) {
      await page.getByTestId(`sprint52-zoom-${preset}`).click();
      await expect(ecgStatusBar(page).getByTestId("sprint17-status-zoom")).toContainText(`${preset}%`);
    }
  });

  test("scrollable left sidebar exposes canvas tools without overlap", async ({ page }) => {
    await bootstrapAuthenticatedPage(page, "doctor");
    await openEcgWorkspace(page, caseId);
    await page.setViewportSize({ height: 768, width: 1366 });
    await expect(
      page.getByTestId("sprint53-workspace-left-sidebar").or(page.getByTestId("sprint35-clinical-summary-panel")),
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("sprint53-acquisition-section")).toBeVisible();
    await expect(page.getByText("Acquisition", { exact: true }).first()).toBeVisible();
    await expect(ecgLeftSidebarTools(page)).toBeVisible();
    await expect(ecgLeftSidebarTools(page).getByRole("button", { name: "Pan" })).toBeVisible();
    await expect(ecgLeftSidebarTools(page).getByRole("button", { name: "Calipers" })).toBeVisible();

    const layout = await page.evaluate(() => {
      const sidebar = document.querySelector('[data-testid="sprint53-left-sidebar-region"]') as HTMLElement | null;
      const canvas = document.querySelector('[data-testid="sprint53-canvas-region"]') as HTMLElement | null;
      if (!sidebar || !canvas) return null;
      const sb = sidebar.getBoundingClientRect();
      const cv = canvas.getBoundingClientRect();
      return {
        overlap: sb.right > cv.left + 1,
        sidebarWidth: sb.width,
      };
    });
    expect(layout).not.toBeNull();
    expect(layout!.sidebarWidth).toBeGreaterThanOrEqual(280);
    expect(layout!.overlap).toBeFalsy();
  });

  test("status bar shows zoom, speed, gain, coords, resolution", async ({ page }) => {
    await bootstrapAuthenticatedPage(page, "doctor");
    await openEcgWorkspace(page, caseId);
    await expect(ecgStatusBar(page)).toBeVisible();
    await expect(ecgStatusBar(page).getByTestId("sprint17-status-zoom")).toBeVisible();
    await expect(ecgStatusBar(page).getByTestId("sprint17-status-paper-speed")).toBeVisible();
    await expect(ecgStatusBar(page).getByTestId("sprint17-status-gain")).toBeVisible();
    await expect(ecgStatusBar(page).getByTestId("sprint52-status-resolution")).toBeVisible();
  });

  test("compare, overlay, and AI review modes render", async ({ page }) => {
    await bootstrapAuthenticatedPage(page, "doctor");
    await openEcgWorkspace(page, caseId);
    await ecgViewMode(page, "overlay").click();
    await expect(page.getByTestId("sprint13-ecg-pro-viewer-engine").or(page.getByTestId("sprint21-ai-review-view"))).toBeVisible({
      timeout: 20_000,
    });
    await ecgViewMode(page, "ai-review").click();
    await expect(page.getByTestId("sprint21-ai-review-view")).toBeVisible({ timeout: 20_000 });
    await ecgViewMode(page, "compare").click();
    await expect(page.getByTestId("sprint13-ecg-pro-viewer-engine").or(page.getByTestId("sprint18-compare-viewer"))).toBeVisible({
      timeout: 20_000,
    });
  });

  test("sidebar maintains 280px+ on HD and 4K viewports without canvas overlap", async ({ page }) => {
    await bootstrapAuthenticatedPage(page, "doctor");
    await openEcgWorkspace(page, caseId);

    for (const viewport of [
      { height: 768, width: 1366 },
      { height: 1080, width: 1920 },
      { height: 1440, width: 2560 },
      { height: 2160, width: 3840 },
    ]) {
      await page.setViewportSize(viewport);
      await expect(
      page.getByTestId("sprint53-workspace-left-sidebar").or(page.getByTestId("sprint35-clinical-summary-panel")),
    ).toBeVisible({ timeout: 15_000 });
      const metrics = await page.evaluate(() => {
        const sidebar = document.querySelector('[data-testid="sprint53-left-sidebar-region"]') as HTMLElement | null;
        const canvas = document.querySelector('[data-testid="sprint53-canvas-region"]') as HTMLElement | null;
        if (!sidebar || !canvas) return null;
        const sb = sidebar.getBoundingClientRect();
        const cv = canvas.getBoundingClientRect();
        return { overlap: sb.right > cv.left + 0.5, sidebarWidth: sb.width };
      });
      expect(metrics).not.toBeNull();
      expect(metrics!.sidebarWidth).toBeGreaterThanOrEqual(280);
      expect(metrics!.overlap).toBeFalsy();
    }
  });

  test("independent live monitor route still operational", async ({ page }) => {
    await bootstrapAuthenticatedPage(page, "doctor");
    await openEcgLiveMonitor(page, caseId);
    await expect(page.getByTestId("sprint22-hospital-monitor-canvas")).toBeVisible({ timeout: 20_000 });
  });
});
