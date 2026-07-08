import { expect, test } from "./test";
import fs from "node:fs/promises";
import path from "node:path";
import { bootstrapAuthenticatedPage, createClinicalFixture, API_URL, authHeaders } from "./utils/qa";
import { openEcgLiveMonitor } from "./utils/ecg-workspace-locators";

const VIEWPORTS = [
  { height: 768, label: "1366x768", width: 1366 },
  { height: 900, label: "1600x900", width: 1600 },
  { height: 1080, label: "1920x1080", width: 1920 },
  { height: 1440, label: "2560x1440", width: 2560 },
  { height: 2160, label: "3840x2160", width: 3840 },
] as const;

const SCREENSHOT_DIR = path.resolve(process.cwd(), "validation-screenshots", "live-monitor-layout-hotfix");

test.describe("Live Monitor Layout Hotfix @live-monitor-layout @enterprise", () => {
  test.describe.configure({ mode: "serial" });

  let caseId = "";

  test.beforeAll(async ({ request }) => {
    await fs.mkdir(SCREENSHOT_DIR, { recursive: true });
    const fixture = await createClinicalFixture(request, { analyze: true, report: false });
    caseId = fixture.caseId;
    const digitize = await request.post(`${API_URL}/ecg/digitize`, {
      data: { caseId, gainMmPerMv: 10, paperSpeedMmPerSec: 25 },
      headers: authHeaders(fixture.token, fixture.csrfToken),
    });
    expect(digitize.ok(), `Digitize API should succeed: ${await digitize.text()}`).toBeTruthy();
  });

  for (const viewport of VIEWPORTS) {
    test(`sidebar layout is stable at ${viewport.label}`, async ({ page }) => {
      test.setTimeout(viewport.width >= 3840 ? 240_000 : 120_000);
      await page.setViewportSize({ height: viewport.height, width: viewport.width });
      await bootstrapAuthenticatedPage(page, "doctor");
      await openEcgLiveMonitor(page, caseId);
      await expect(page.getByTestId("sprint37-live-monitor-ready")).toBeVisible({ timeout: 20_000 });
      await expect(page.getByTestId("sprint49-hmi-left-rail")).toBeVisible();
      await expect(page.getByTestId("sprint22-hospital-monitor-canvas")).toBeVisible({ timeout: 15_000 });
      await page.getByTestId("live-monitor-sidebar-reset-view").scrollIntoViewIfNeeded();
      await page.getByTestId("live-monitor-sidebar-export-png").scrollIntoViewIfNeeded();
      await page.getByTestId("sprint41-live-monitor-toolbar-calipers").scrollIntoViewIfNeeded();
      await expect(page.getByTestId("live-monitor-sidebar-reset-view")).toBeVisible();
      await expect(page.getByTestId("live-monitor-sidebar-export-png")).toBeVisible();
      await expect(page.getByTestId("sprint41-live-monitor-toolbar-calipers")).toBeVisible();

      const layout = await page.evaluate(() => {
        const leftRail = document.querySelector('[data-testid="sprint49-hmi-left-rail"]') as HTMLElement | null;
        const canvas = document.querySelector('[data-testid="sprint22-hospital-monitor-canvas"]') as HTMLElement | null;
        const leftRailRect = leftRail?.getBoundingClientRect();
        const canvasRect = canvas?.getBoundingClientRect();
        const sidebarWidth = leftRailRect?.width ?? 0;
        const buttons = Array.from(
          document.querySelectorAll('[data-testid="sprint49-hmi-left-rail"] [role="button"]'),
        ) as HTMLElement[];
        const clippedButtons = buttons.filter((button) => {
          const rect = button.getBoundingClientRect();
          if (rect.width <= 0 || rect.height <= 0) return true;
          if (!leftRailRect) return false;
          const horizontallyClipped = rect.right > leftRailRect.right + 1 || rect.left < leftRailRect.left - 1;
          const label = (button.textContent ?? "").trim();
          const labelOverflow = label.length > 0 && rect.width < 48;
          return horizontallyClipped || labelOverflow;
        }).length;
        return {
          canvasVisible: (canvasRect?.width ?? 0) > 200 && (canvasRect?.height ?? 0) > 200,
          clippedButtons,
          sidebarInRange: sidebarWidth >= 300 && sidebarWidth <= 340,
          sidebarWidth,
        };
      });

      expect(layout.sidebarInRange, `sidebar width ${layout.sidebarWidth}px`).toBeTruthy();
      expect(layout.canvasVisible).toBeTruthy();
      expect(layout.clippedButtons).toBe(0);

      await page.screenshot({
        fullPage: false,
        path: path.join(SCREENSHOT_DIR, `live-monitor-${viewport.label}.png`),
      });
    });
  }

  test("right clinical panel visible on ultra-wide layout", async ({ page }) => {
    await page.setViewportSize({ height: 1080, width: 1920 });
    await bootstrapAuthenticatedPage(page, "doctor");
    await openEcgLiveMonitor(page, caseId);
    await expect(page.getByTestId("sprint49-hmi-right-rail")).toBeVisible();
  });
});
