import { expect, test } from "./test";
import { bootstrapAuthenticatedPage, createClinicalFixture, API_URL, authHeaders } from "./utils/qa";

async function openEcgWorkspace(page: import("@playwright/test").Page, caseId: string) {
  await page.goto(`/ecg-workspace?caseId=${caseId}`, { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("ecg-workspace-loading")).toHaveCount(0, { timeout: 45_000 });
  await expect(page.getByTestId("ecg-enterprise-workspace-ready")).toBeVisible({ timeout: 45_000 });
  await expect(page.getByTestId("sprint24-hospital-workstation-ready").or(page.getByTestId("sprint23-visual-inspector-ready"))).toBeVisible({ timeout: 20_000 });
}

test.describe("Sprint 23 Visual Inspector AI @sprint23", () => {
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
  });

  test("visual inspector readiness and hospital shell", async ({ page }) => {
    await openEcgWorkspace(page, caseId);
    await expect(page.getByText("Hospital ECG Workstation")).toBeVisible();
    await expect(page.getByTestId("sprint24-hospital-ribbon-toolbar").or(page.getByTestId("sprint23-visual-inspector-toolbar"))).toBeVisible();
    await expect(page.getByTestId("sprint24-clinical-right-panel").or(page.getByTestId("sprint22-clinical-right-panel"))).toBeVisible();
    await page.screenshot({ fullPage: false, path: "test-results/screenshots/sprint23-inspector-shell.png" });
  });

  test("DOM visual audit score >= 98%", async ({ page }) => {
    await openEcgWorkspace(page, caseId);
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.getByTestId("sprint21-view-mode-monitor").click();
    await page.waitForTimeout(800);

    const audit = await page.evaluate(() => {
      const issues: Array<{ severity: string; type: string }> = [];
      const viewport = { h: window.innerHeight, w: window.innerWidth };

      const toolbar = document.querySelector('[data-testid="sprint24-hospital-ribbon-toolbar"], [data-testid="sprint23-visual-inspector-toolbar"]');
      if (!toolbar) issues.push({ severity: "critical", type: "missing_toolbar" });

      const panel = document.querySelector('[data-testid="sprint24-clinical-right-panel"], [data-testid="sprint22-clinical-right-panel"]');
      if (!panel) issues.push({ severity: "critical", type: "missing_panel" });

      const status = document.querySelector('[data-testid="sprint24-hospital-status-bar"], [data-testid="sprint21-enterprise-status-bar"]');
      if (!status) issues.push({ severity: "high", type: "missing_status" });

      const canvas = document.querySelector('[data-testid="sprint22-hospital-monitor-canvas"]');
      if (canvas) {
        const r = canvas.getBoundingClientRect();
        if (r.height < 200) issues.push({ severity: "high", type: "monitor_clipped" });
      }

      const titleOk = document.body.innerText.includes("Hospital ECG Workstation");
      if (!titleOk) issues.push({ severity: "low", type: "title_missing" });

      let score = 100;
      for (const issue of issues) {
        if (issue.severity === "critical") score -= 25;
        else if (issue.severity === "high") score -= 12;
        else score -= 2;
      }
      return { issues, score: Math.max(0, score), viewport };
    });

    expect(audit.score).toBeGreaterThanOrEqual(98);
    expect(audit.issues.filter((i) => i.severity === "critical" || i.severity === "high")).toHaveLength(0);
    await page.screenshot({ path: "test-results/screenshots/sprint23-inspector-monitor.png" });
  });

  test("multi-mode visual capture for inspector baseline", async ({ page }) => {
    await openEcgWorkspace(page, caseId);
    for (const mode of ["image", "processed", "waveform", "monitor"] as const) {
      await page.getByTestId(`sprint21-view-mode-${mode}`).click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: `test-results/screenshots/sprint23-mode-${mode}.png` });
    }
  });
});
