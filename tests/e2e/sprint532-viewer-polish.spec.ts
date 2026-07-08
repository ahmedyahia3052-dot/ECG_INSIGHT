import path from "node:path";
import { expect, test } from "./test";
import { bootstrapAuthenticatedPage, createClinicalFixture, API_URL, authHeaders } from "./utils/qa";
import { openEcgWorkspace } from "./utils/ecg-workspace-locators";

const LANDSCAPE = [
  { height: 768, width: 1366 },
  { height: 900, width: 1600 },
  { height: 1080, width: 1920 },
  { height: 1440, width: 2560 },
  { height: 2160, width: 3840 },
] as const;

const PORTRAIT = [
  { height: 1024, width: 768 },
  { height: 1920, width: 1080 },
] as const;

async function measureContainFill(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const canvas = document.querySelector('[data-testid="sprint13-ecg-pro-viewer-engine"]') as HTMLElement | null;
    const image = document.querySelector('[data-testid="sprint13-ecg-layer-image"]') as HTMLElement | null;
    const canvasRect = canvas?.getBoundingClientRect();
    const imageRect = image?.getBoundingClientRect();
    return {
      fillHeight: (imageRect?.height ?? 0) / Math.max(canvasRect?.height ?? 1, 1),
      fillWidth: (imageRect?.width ?? 0) / Math.max(canvasRect?.width ?? 1, 1),
      imageHeight: imageRect?.height ?? 0,
      imageWidth: imageRect?.width ?? 0,
    };
  });
}

test.describe("Sprint 53.2 ECG Viewer Professional Polish @sprint532 @viewer", () => {
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

  test("auto-fit on open keeps full ECG visible", async ({ page }) => {
    await page.waitForFunction(() => {
      const canvas = document.querySelector('[data-testid="sprint13-ecg-pro-viewer-engine"]') as HTMLElement | null;
      const image = document.querySelector('[data-testid="sprint13-ecg-layer-image"]') as HTMLElement | null;
      if (!canvas || !image) return false;
      const c = canvas.getBoundingClientRect();
      const i = image.getBoundingClientRect();
      return i.width > 0 && i.height > 0 && i.width <= c.width + 2 && i.height <= c.height + 2;
    }, undefined, { timeout: 15_000 });
    const metrics = await measureContainFill(page);
    expect(metrics.fillWidth).toBeGreaterThan(0.52);
    expect(metrics.fillHeight).toBeGreaterThan(0.45);
  });

  test("reading mode hides workflow chrome", async ({ page }) => {
    await page.getByTestId("sprint532-toolbar-reading").click();
    await expect(page.getByTestId("sprint532-reading-mode")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId("sprint532-reading-toolbar")).toBeVisible();
    await expect(page.getByTestId("sprint52-floating-tool-palette")).toHaveCount(0);
  });

  test("zoom controls in reading toolbar", async ({ page }) => {
    const before = await measureContainFill(page);
    await page.getByTestId("sprint532-toolbar-reading").click();
    await expect(page.getByTestId("sprint532-reading-toolbar")).toBeVisible();
    await page.getByTestId("sprint532-reading-zoom-in").click();
    await page.waitForTimeout(400);
    const after = await measureContainFill(page);
    expect(after.imageWidth).toBeGreaterThan(before.imageWidth);
  });

  test("overlay toggle in settings panel", async ({ page }) => {
    await page.getByTestId("sprint35-compact-toolbar").getByRole("button", { name: /Settings/i }).click();
    await expect(page.getByText("AI Overlay")).toBeVisible({ timeout: 10_000 });
    await page.getByRole("button", { name: /Overlay Off/i }).click();
    await expect(page.getByTestId("sprint13-ecg-layer-ai")).toHaveCount(0);
  });

  for (const viewport of LANDSCAPE) {
    test(`landscape ${viewport.width}x${viewport.height}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await openEcgWorkspace(page, caseId);
      await expect(page.getByTestId("sprint13-ecg-layer-image")).toBeVisible({ timeout: 20_000 });
      const metrics = await measureContainFill(page);
      await page.screenshot({
        path: path.join("validation-screenshots", "sprint532-polish", `landscape-${viewport.width}x${viewport.height}.png`),
      });
      expect(metrics.imageWidth).toBeGreaterThan(200);
      expect(metrics.fillWidth).toBeGreaterThan(0.4);
    });
  }

  for (const viewport of PORTRAIT) {
    test(`portrait ${viewport.width}x${viewport.height}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await openEcgWorkspace(page, caseId);
      await expect(page.getByTestId("sprint13-ecg-layer-image")).toBeVisible({ timeout: 20_000 });
      const metrics = await measureContainFill(page);
      await page.screenshot({
        path: path.join("validation-screenshots", "sprint532-polish", `portrait-${viewport.width}x${viewport.height}.png`),
      });
      expect(metrics.imageHeight).toBeGreaterThan(200);
      expect(metrics.fillHeight).toBeGreaterThan(0.32);
    });
  }
});
