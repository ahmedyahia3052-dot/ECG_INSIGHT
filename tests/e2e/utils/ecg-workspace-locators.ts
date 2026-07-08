import { expect, type Locator, type Page } from "@playwright/test";

export const ECG_WORKSPACE_READY = "ecg-enterprise-workspace-ready";

export function ecgToolbar(page: Page): Locator {
  return page
    .getByTestId("sprint52-grouped-toolbar")
    .or(page.getByTestId("sprint35-compact-toolbar"))
    .or(page.getByTestId("sprint29-zero-chrome-toolbar"));
}

export function ecgDiagnosticExit(page: Page): Locator {
  return page.getByTestId("sprint35-exit-diagnostic").or(page.getByTestId("sprint29-exit-diagnostic"));
}

export function ecgFloatingPalette(page: Page): Locator {
  return page
    .getByTestId("sprint53-left-tool-sections")
    .or(page.getByTestId("sprint52-floating-tool-palette"))
    .or(page.getByTestId("sprint35-floating-tool-palette"))
    .or(page.getByTestId("sprint335-floating-tool-palette"))
    .or(page.getByTestId("sprint33-floating-tool-palette"));
}

export function ecgClinicalRightPanel(page: Page): Locator {
  return page
    .getByTestId("sprint35-clinical-right-panel")
    .or(page.getByTestId("sprint335-clinical-right-panel"))
    .or(page.getByTestId("sprint33-clinical-right-panel"))
    .or(page.getByTestId("sprint32-clinical-right-panel"))
    .or(page.getByTestId("sprint30-clinical-right-panel"));
}

export function ecgLeftRail(page: Page): Locator {
  return page
    .getByTestId("sprint53-workspace-left-sidebar")
    .or(page.getByTestId("sprint35-clinical-summary-panel"))
    .or(page.getByTestId("sprint335-clinical-summary-panel"))
    .or(page.getByTestId("sprint33-clinical-summary-panel"))
    .or(page.getByTestId("sprint32-clinical-summary-panel"))
    .or(page.getByTestId("sprint25-clinical-left-rail"))
    .or(page.getByTestId("sprint24-workstation-left-nav"));
}

export function ecgLeftSidebarTools(page: Page): Locator {
  return page.getByTestId("sprint53-left-tool-sections");
}

export function ecgStatusBar(page: Page): Locator {
  return page
    .getByTestId("sprint52-enterprise-status-bar")
    .or(page.getByTestId("sprint35-enterprise-status-bar"))
    .or(page.getByTestId("sprint335-enterprise-status-bar"))
    .or(page.getByTestId("sprint32-enterprise-status-bar"))
    .or(page.getByTestId("sprint29-enterprise-status-bar"))
    .or(page.getByTestId("sprint28-enterprise-status-bar"));
}

/** Sprint 52 — live monitor is no longer a workspace view mode; open dedicated route. */
export async function openLiveMonitorFromWorkspace(page: Page, caseId?: string) {
  const liveMonitorBtn = page.getByTestId("sprint52-toolbar-live-monitor");
  if (await liveMonitorBtn.isVisible().catch(() => false)) {
    await liveMonitorBtn.click();
    await expect(page.getByTestId("sprint37-live-monitor-ready")).toBeVisible({ timeout: 30_000 });
    return;
  }
  if (caseId) {
    await openEcgLiveMonitor(page, caseId);
  }
}

export function ecgRightRail(page: Page): Locator {
  return ecgClinicalRightPanel(page);
}

export function ecgViewModeSwitcher(page: Page): Locator {
  return page.getByTestId("sprint29-view-mode-switcher").or(page.getByTestId("sprint26-view-mode-switcher"));
}

/** Legacy toolbar groups were removed in Sprint 33; map to the compact toolbar strip. */
export function ecgToolbarGroup(page: Page, _group?: string): Locator {
  return ecgToolbar(page);
}

export function ecgViewMode(page: Page, mode: string): Locator {
  if (mode === "monitor") {
    return page
      .getByTestId("sprint52-toolbar-live-monitor")
      .or(page.getByTestId("sprint21-view-mode-monitor"));
  }
  return page.getByTestId(`sprint21-view-mode-${mode}`);
}

export function ecgRenderEngine(page: Page): Locator {
  return page.getByTestId("sprint28-clinical-visualization-canvas");
}

export function ecgRenderMetrics(page: Page): Locator {
  return page.getByTestId("sprint28-clinical-render-metrics");
}

export function paletteButton(page: Page, name: string | RegExp): Locator {
  return ecgFloatingPalette(page).getByRole("button", { name });
}

export function toolbarButton(page: Page, name: string | RegExp): Locator {
  return ecgToolbar(page).getByRole("button", { name });
}

export async function expandToolbarGroup(_page: Page, _group?: string) {
  // Sprint 33 compact toolbar exposes primary actions inline.
}

const PALETTE_CONTROL_ALIASES: Record<string, string> = {
  "Fit Image": "Reset",
  "Reset View": "Reset",
  Fit: "Reset",
};

export async function clickViewControl(page: Page, label: "Zoom In" | "Zoom Out" | "Fit Image" | "Reset View" | "Reset" | "Pan" | "Rotate" | "Grid") {
  await page.mouse.move(480, 360);
  await expect(ecgFloatingPalette(page)).toBeVisible({ timeout: 15_000 });
  const resolved = PALETTE_CONTROL_ALIASES[label] ?? label;
  await paletteButton(page, resolved).click();
}

export async function enableDeveloperMetrics(page: Page) {
  const toggle = page
    .getByTestId("sprint335-dev-mode-toggle")
    .or(page.getByTestId("sprint32-dev-mode-toggle"));
  if (await toggle.first().isVisible().catch(() => false)) {
    await toggle.first().click();
  }
}

export async function ensureLeftPanelOpen(page: Page) {
  const leftPanel = ecgLeftRail(page);
  if (!(await leftPanel.first().isVisible().catch(() => false))) {
    const toggle = paletteButton(page, "Left Panel");
    if (await toggle.isVisible().catch(() => false)) {
      await toggle.click();
    } else {
      const legacyToggle = page.getByTestId("sprint22-toggle-left-panel");
      if (await legacyToggle.isVisible().catch(() => false)) {
        await legacyToggle.click();
      }
    }
  }
  await expect(leftPanel.first()).toBeVisible({ timeout: 15_000 });
}

/** Expand a collapsible section in the unified clinical left panel (e.g. "Workflow"). */
export async function expandLeftPanelSection(page: Page, title: string) {
  await ensureLeftPanelOpen(page);
  await ecgLeftRail(page).getByText(title, { exact: true }).click();
}

export async function ensureRightPanelOpen(page: Page) {
  if (!(await ecgClinicalRightPanel(page).isVisible().catch(() => false))) {
    const toggle = paletteButton(page, "Right Panel");
    if (await toggle.isVisible().catch(() => false)) {
      await toggle.click();
    } else {
      const legacyToggle = page.getByTestId("sprint22-toggle-right-panel");
      if (await legacyToggle.isVisible().catch(() => false)) {
        await legacyToggle.click();
      }
    }
  }
  await expect(ecgClinicalRightPanel(page)).toBeVisible({ timeout: 15_000 });
}

export async function openMeasurementsTab(page: Page) {
  await ensureRightPanelOpen(page);
  await page.getByTestId("sprint26-clinical-tab-measurements").click();
  await expect(page.getByTestId("sprint15-ecg-measurements-panel")).toBeVisible({ timeout: 15_000 });
}

export async function openAiTab(page: Page) {
  await ensureRightPanelOpen(page);
  await page.getByTestId("sprint26-clinical-tab-ai").click();
  await expect(page.getByTestId("sprint14-ecg-ai-annotation-inspector")).toBeVisible({ timeout: 15_000 });
}

export async function activateMonitorView(page: Page) {
  await ecgViewMode(page, "monitor").click();
  await expect(page.getByTestId("sprint37-live-monitor-ready")).toBeVisible({ timeout: 30_000 });
}

export async function openEcgWorkspace(page: Page, caseId?: string) {
  const url = caseId ? `/ecg-workspace?caseId=${caseId}` : "/ecg-workspace";
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("ecg-workspace-loading").or(page.getByTestId("ecg-workspace-resolving"))).toHaveCount(0, {
    timeout: 45_000,
  });
  await expect(
    page.getByTestId(ECG_WORKSPACE_READY)
      .or(page.getByTestId("ecg-examination-empty-state"))
      .or(page.getByTestId("ecg-examination-selector")),
  ).toBeVisible({ timeout: 60_000 });
  if (await page.getByTestId(ECG_WORKSPACE_READY).isVisible()) {
    await expect(page.getByTestId("sprint13-ecg-monitor-ready")).toBeVisible({ timeout: 20_000 });
    await expect(ecgToolbar(page)).toBeVisible({ timeout: 20_000 });
  }
}

export async function openEcgLiveMonitor(page: Page, caseId: string) {
  await page.goto(`/ecg-live-monitor/${caseId}`, { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("sprint37-live-monitor-loading")).toHaveCount(0, { timeout: 45_000 });
  await expect(page.getByTestId("sprint37-live-monitor-workspace-ready")).toBeVisible({ timeout: 45_000 });
  await expect(page.getByTestId("sprint37-live-monitor-ready")).toBeVisible({ timeout: 20_000 });
}

export async function openEcgMonitor(page: Page, caseId: string) {
  await page.goto(`/ecg-monitor/${caseId}`, { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("sprint13-ecg-monitor-loading")).toHaveCount(0, { timeout: 45_000 });
  await expect(page.getByTestId("sprint13-ecg-monitor-ready")).toBeVisible({ timeout: 45_000 });
  await expect(ecgToolbar(page)).toBeVisible({ timeout: 20_000 });
}

export async function assertWorkspaceShell(page: Page) {
  await expect(page.getByTestId("sprint30-clinical-workflow-ribbon")).toBeVisible({ timeout: 20_000 });
  await expect(ecgToolbar(page)).toBeVisible();
  await expect(ecgClinicalRightPanel(page)).toBeVisible();
}
