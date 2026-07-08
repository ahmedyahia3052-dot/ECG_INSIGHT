import { expect, test } from "./test";
import { bootstrapAuthenticatedPage, createClinicalFixture, API_URL, authHeaders } from "./utils/qa";
import { openEcgWorkspace } from "./utils/ecg-workspace-locators";
import path from "node:path";

const VIEWPORTS = [
  { height: 768, width: 1366 },
  { height: 900, width: 1440 },
  { height: 900, width: 1600 },
  { height: 1080, width: 1920 },
  { height: 1440, width: 2560 },
  { height: 2160, width: 3840 },
] as const;

async function measureEcgFill(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const host =
      (document.querySelector('[data-testid="sprint53-ecg-viewer-host"]') as HTMLElement | null) ??
      (document.querySelector('[data-testid="sprint53-canvas-region"]') as HTMLElement | null);
    const image = document.querySelector('[data-testid="sprint13-ecg-layer-image"]') as HTMLElement | null;
    const hostRect = host?.getBoundingClientRect();
    const imageRect = image?.getBoundingClientRect();
    return {
      fillHeight: (imageRect?.height ?? 0) / Math.max(hostRect?.height ?? 1, 1),
      fillWidth: (imageRect?.width ?? 0) / Math.max(hostRect?.width ?? 1, 1),
      hostHeight: hostRect?.height ?? 0,
      hostWidth: hostRect?.width ?? 0,
      imageHeight: imageRect?.height ?? 0,
      imageWidth: imageRect?.width ?? 0,
      leftRailVisible: !!document.querySelector('[data-testid="sprint53-left-rail"]'),
      rightRailVisible: !!document.querySelector('[data-testid="sprint53-right-rail"]'),
    };
  });
}

test.describe("Sprint 53 Hotfix — ECG reading station layout @sprint53 @hotfix @visual", () => {
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
    await expect(page.getByTestId("sprint53-reading-station")).toBeVisible();
    await expect(page.getByTestId("sprint13-ecg-layer-image")).toBeVisible({ timeout: 20_000 });
  });

  test("four-region layout with side rails hidden by default", async ({ page }) => {
    await expect(page.getByTestId("sprint53-reading-station-header")).toBeVisible();
    await expect(page.getByTestId("sprint53-reading-station-workflow")).toBeVisible();
    await expect(page.getByTestId("sprint53-reading-station-viewer")).toBeVisible();
    await expect(page.getByTestId("sprint53-reading-station-status")).toBeVisible();
    await expect(page.getByTestId("sprint53-left-rail")).toHaveCount(0);
    await expect(page.getByTestId("sprint53-right-rail")).toHaveCount(0);
  });

  test("ECG image fills at least 90% of reading width at default viewport", async ({ page }) => {
    const metrics = await measureEcgFill(page);
    expect(metrics.hostWidth).toBeGreaterThan(600);
    expect(metrics.fillWidth).toBeGreaterThan(0.9);
  });

  test("right rail opens for measurement mode only", async ({ page }) => {
    await expect(page.getByTestId("sprint53-right-rail")).toHaveCount(0);
    await page.getByTestId("sprint52-toolbar-measurements").click();
    await expect(page.getByTestId("sprint53-right-rail")).toBeVisible({ timeout: 10_000 });
  });

  for (const viewport of VIEWPORTS) {
    test(`responsive fill ratio ${viewport.width}x${viewport.height}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await openEcgWorkspace(page, caseId);
      await expect(page.getByTestId("sprint13-ecg-layer-image")).toBeVisible({ timeout: 20_000 });
      await expect(page.getByTestId("sprint53-right-rail")).toHaveCount(0);

      await page.waitForFunction(() => {
        const host =
          (document.querySelector('[data-testid="sprint53-ecg-viewer-host"]') as HTMLElement | null) ??
          (document.querySelector('[data-testid="sprint53-canvas-region"]') as HTMLElement | null);
        const image = document.querySelector('[data-testid="sprint13-ecg-layer-image"]') as HTMLElement | null;
        const hostRect = host?.getBoundingClientRect();
        const imageRect = image?.getBoundingClientRect();
        const fillWidth = (imageRect?.width ?? 0) / Math.max(hostRect?.width ?? 1, 1);
        return fillWidth >= 0.88;
      }, undefined, { timeout: 15_000 });

      const metrics = await measureEcgFill(page);
      const screenshotDir = path.join("validation-screenshots", "sprint53-hotfix-layout");
      await page.screenshot({
        fullPage: false,
        path: path.join(screenshotDir, `workspace-${viewport.width}x${viewport.height}.png`),
      });

      expect(metrics.fillWidth, `ECG width fill at ${viewport.width}x${viewport.height}`).toBeGreaterThan(0.88);
      expect(metrics.hostHeight / Math.max(viewport.height, 1)).toBeGreaterThan(0.55);
    });
  }
});
