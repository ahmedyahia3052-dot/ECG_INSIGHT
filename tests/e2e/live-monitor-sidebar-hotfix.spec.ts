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

const SCREENSHOT_DIR = path.resolve(process.cwd(), "validation-screenshots", "live-monitor-sidebar-hotfix");

test.describe("Live Monitor Sidebar Hotfix @live-monitor-sidebar @enterprise", () => {
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
    test(`sidebar controls are full-width and unduplicated at ${viewport.label}`, async ({ page }) => {
      test.setTimeout(viewport.width >= 3840 ? 240_000 : 120_000);
      await page.setViewportSize({ height: viewport.height, width: viewport.width });
      await bootstrapAuthenticatedPage(page, "doctor");
      await openEcgLiveMonitor(page, caseId);
      await expect(page.getByTestId("sprint49-hmi-left-rail")).toBeVisible({ timeout: 20_000 });
      await expect(page.getByTestId("sprint49-hmi-workspace-ready")).toBeVisible({ timeout: 20_000 });

      await page.getByTestId("live-monitor-sidebar-reset-view").scrollIntoViewIfNeeded();
      await page.getByTestId("live-monitor-sidebar-export-png").scrollIntoViewIfNeeded();
      await page.getByTestId("sprint41-live-monitor-toolbar-calipers").scrollIntoViewIfNeeded();

      await expect(page.getByTestId("live-monitor-sidebar-reset-view")).toHaveText("Reset View");
      await expect(page.getByTestId("live-monitor-sidebar-export-png")).toHaveText("Export PNG");
      await expect(page.getByTestId("sprint41-live-monitor-toolbar-calipers")).toHaveText(/Calipers/);

      const audit = await page.evaluate(() => {
        const sidebar = document.querySelector('[data-testid="sprint49-hmi-left-rail"]') as HTMLElement | null;
        const sidebarRect = sidebar?.getBoundingClientRect();
        const buttons = Array.from(document.querySelectorAll('[data-testid="sprint49-hmi-left-rail"] [role="button"]')) as HTMLElement[];
        const labels = buttons.map((node) => (node.textContent ?? "").trim()).filter(Boolean);
        const resetView = labels.filter((label) => label === "Reset View").length;
        const exportPng = labels.filter((label) => label === "Export PNG").length;
        const calipers = labels.filter((label) => label.startsWith("Calipers")).length;
        const measure = labels.filter((label) => label === "Measure").length;
        const capture = labels.filter((label) => label === "Capture").length;
        const clipped = buttons.filter((button) => {
          const rect = button.getBoundingClientRect();
          if (rect.width <= 0 || rect.height <= 0) return true;
          if (!sidebarRect) return false;
          return rect.right > sidebarRect.right + 1 || rect.left < sidebarRect.left - 1;
        }).length;
        const sectionTitles = ["Acquisition", "View", "Measurement", "Capture", "Actions"].filter((title) =>
          (sidebar?.textContent ?? "").includes(title),
        );
        return {
          calipers,
          capture,
          clipped,
          exportPng,
          measure,
          resetView,
          sectionTitles,
          sidebarWidth: sidebarRect?.width ?? 0,
        };
      });

      expect(audit.sidebarWidth).toBeGreaterThanOrEqual(300);
      expect(audit.sidebarWidth).toBeLessThanOrEqual(340);
      expect(audit.resetView).toBe(1);
      expect(audit.exportPng).toBe(1);
      expect(audit.calipers).toBe(1);
      expect(audit.measure).toBe(0);
      expect(audit.capture).toBe(0);
      expect(audit.clipped).toBe(0);
      expect(audit.sectionTitles).toEqual(["Acquisition", "View", "Measurement", "Capture", "Actions"]);

      await page.screenshot({
        fullPage: false,
        path: path.join(SCREENSHOT_DIR, `sidebar-after-${viewport.label}.png`),
      });
    });
  }
});
