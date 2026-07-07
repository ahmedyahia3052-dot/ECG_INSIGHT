import { expect, test } from "./test";
import { bootstrapAuthenticatedPage, createClinicalFixture, API_URL, authHeaders } from "./utils/qa";
import { ecgToolbar, openEcgWorkspace } from "./utils/ecg-workspace-locators";

test.describe("Sprint 53 ECG Workspace Enterprise Master Rebuild @sprint53 @enterprise", () => {
  test.describe.configure({ mode: "serial" });

  let caseId = "";

  test.beforeAll(async ({ request }) => {
    const fixture = await createClinicalFixture(request, { analyze: true, report: false });
    caseId = fixture.caseId;
    const digitize = await request.post(`${API_URL}/ecg/digitize`, {
      data: { caseId, gainMmPerMv: 10, paperSpeedMmPerSec: 25 },
      headers: authHeaders(fixture.token, fixture.csrfToken),
    });
    expect(digitize.ok()).toBeTruthy();
  });

  test.beforeEach(async ({ page }) => {
    await bootstrapAuthenticatedPage(page, "doctor");
    await openEcgWorkspace(page, caseId);
  });

  test("workspace grid and canvas dominate viewport", async ({ page }) => {
    await expect(page.getByTestId("sprint53-workspace-grid")).toBeVisible();
    await expect(page.getByTestId("sprint53-canvas-region")).toBeVisible();
    await expect(page.getByTestId("sprint13-ecg-image-canvas").first()).toBeVisible();

    const metrics = await page.evaluate(() => {
      const grid = document.querySelector('[data-testid="sprint53-workspace-grid"]') as HTMLElement | null;
      const canvas = document.querySelector('[data-testid="sprint53-canvas-region"]') as HTMLElement | null;
      const gridRect = grid?.getBoundingClientRect();
      const canvasRect = canvas?.getBoundingClientRect();
      return {
        canvasHeight: canvasRect?.height ?? 0,
        canvasWidth: canvasRect?.width ?? 0,
        gridHeight: gridRect?.height ?? 0,
        gridWidth: gridRect?.width ?? 0,
      };
    });

    expect(metrics.gridHeight).toBeGreaterThan(400);
    expect(metrics.canvasHeight / Math.max(metrics.gridHeight, 1)).toBeGreaterThan(0.72);
    expect(metrics.canvasWidth / Math.max(metrics.gridWidth, 1)).toBeGreaterThan(0.55);
  });

  test("live monitor removed from workspace toolbar", async ({ page }) => {
    await expect(page.getByTestId("sprint52-toolbar-live-monitor")).toHaveCount(0);
    await expect(ecgToolbar(page)).toBeVisible();
  });

  test("layout modes switch without clipping left sidebar", async ({ page }) => {
    await expect(page.getByTestId("sprint53-workspace-layout-switcher")).toBeVisible();
    await page.getByTestId("sprint53-layout-classic").click();
    await expect(page.getByTestId("sprint53-left-sidebar-scroll")).toBeVisible();
    await page.getByTestId("sprint53-layout-dual").click();
    await expect(page.getByTestId("sprint35-clinical-right-panel")).toBeVisible();
    await page.getByTestId("sprint53-layout-teaching").click();
    await page.getByTestId("sprint21-view-mode-waveform").click();
    await expect(page.getByTestId("sprint28-clinical-visualization-canvas")).toBeVisible({ timeout: 20_000 });
  });

  test("12-lead digitized view renders all standard leads", async ({ page }) => {
    await page.getByTestId("sprint21-view-mode-waveform").click();
    const canvas = page.getByTestId("sprint28-clinical-visualization-canvas");
    await expect(canvas).toBeVisible({ timeout: 20_000 });

    const leadLabels = await page.evaluate(() => {
      const svg = document.querySelector('[data-testid="sprint28-clinical-render-svg"]');
      if (!svg) return [] as string[];
      return Array.from(svg.querySelectorAll("text")).map((node) => node.textContent?.trim() ?? "");
    });

    for (const lead of ["I", "II", "III", "aVR", "aVL", "aVF", "V1", "V2", "V3", "V4", "V5", "V6"]) {
      expect(leadLabels.some((label) => label.includes(lead)), `Lead ${lead} should be visible`).toBeTruthy();
    }
  });
});
