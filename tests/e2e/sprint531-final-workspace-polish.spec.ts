import path from "node:path";
import { expect, test } from "./test";
import { bootstrapAuthenticatedPage, createClinicalFixture, API_URL, authHeaders } from "./utils/qa";
import { openEcgWorkspace } from "./utils/ecg-workspace-locators";

const VIEWPORTS = [
  { height: 768, width: 1366 },
  { height: 900, width: 1600 },
  { height: 1080, width: 1920 },
  { height: 1440, width: 2560 },
  { height: 2160, width: 3840 },
] as const;

async function measureFill(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const host = document.querySelector('[data-testid="sprint53-ecg-viewer-host"]') as HTMLElement | null;
    const image = document.querySelector('[data-testid="sprint13-ecg-layer-image"]') as HTMLElement | null;
    const hostRect = host?.getBoundingClientRect();
    const imageRect = image?.getBoundingClientRect();
    return {
      fillWidth: (imageRect?.width ?? 0) / Math.max(hostRect?.width ?? 1, 1),
      hostWidth: hostRect?.width ?? 0,
      imageWidth: imageRect?.width ?? 0,
    };
  });
}

test.describe("Sprint 53.1 Final Workspace Polish @sprint531 @polish", () => {
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
    await expect(page.getByTestId("sprint13-ecg-layer-image")).toBeVisible({ timeout: 20_000 });
  });

  test("reading mode hides chrome and shows clinical toolbar", async ({ page }) => {
    await page.getByTestId("sprint531-toolbar-reading").click();
    await expect(page.getByTestId("sprint531-reading-mode")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId("sprint531-reading-toolbar")).toBeVisible();
    await expect(page.getByTestId("sprint53-reading-station-workflow")).toHaveCount(0);
    await expect(page.getByTestId("sprint52-grouped-toolbar")).toHaveCount(0);
  });

  test("reading mode ECG fill >= 95%", async ({ page }) => {
    await page.getByTestId("sprint531-toolbar-reading").click();
    await expect(page.getByTestId("sprint531-reading-mode")).toBeVisible({ timeout: 10_000 });
    await page.waitForFunction(() => {
      const host = document.querySelector('[data-testid="sprint53-ecg-viewer-host"]') as HTMLElement | null;
      const image = document.querySelector('[data-testid="sprint13-ecg-layer-image"]') as HTMLElement | null;
      const fill = (image?.getBoundingClientRect().width ?? 0) / Math.max(host?.getBoundingClientRect().width ?? 1, 1);
      return fill >= 0.92;
    }, undefined, { timeout: 15_000 });
    const metrics = await measureFill(page);
    expect(metrics.fillWidth).toBeGreaterThan(0.92);
    await page.screenshot({
      path: path.join("validation-screenshots", "sprint531-polish", "reading-mode-1920.png"),
    });
  });

  test("advanced toolbar overflow exists", async ({ page }) => {
    await expect(page.getByTestId("sprint531-toolbar-more")).toBeVisible();
    await page.getByTestId("sprint531-toolbar-more").click();
    await expect(page.getByTestId("sprint52-zoom-100")).toBeVisible();
  });

  for (const viewport of VIEWPORTS) {
    test(`responsive polish ${viewport.width}x${viewport.height}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await openEcgWorkspace(page, caseId);
      await expect(page.getByTestId("sprint13-ecg-layer-image")).toBeVisible({ timeout: 20_000 });
      const metrics = await measureFill(page);
      await page.screenshot({
        path: path.join("validation-screenshots", "sprint531-polish", `workspace-${viewport.width}x${viewport.height}.png`),
      });
      expect(metrics.fillWidth).toBeGreaterThan(0.88);
    });
  }
});
