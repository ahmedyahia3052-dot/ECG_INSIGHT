/** Sprint 49 — professional bedside monitor HMI tokens */

export const HMI_LAYOUT = {
  audioControlsHeight: 28,
  bottomBarHeight: 44,
  canvasViewportRatio: 0.94,
  chromeCompact: 20,
  diagnosticViewportRatio: 0.95,
  leftRailExpanded: 168,
  leftRailCollapsed: 36,
  proHudHeight: 26,
  rightRailExpanded: 200,
  rightRailCollapsed: 36,
  statusBarHeight: 32,
  ultraWideBreakpoint: 1600,
} as const;

/** Sprint 53 hotfix grid shell compatibility alias. */
export const LIVE_MONITOR_LAYOUT = {
  bottomBarHeight: HMI_LAYOUT.bottomBarHeight,
  gridGap: 8,
  rightPanelMinWidth: HMI_LAYOUT.rightRailCollapsed,
  rightPanelWidth: HMI_LAYOUT.rightRailExpanded,
  sidebarMinWidth: HMI_LAYOUT.leftRailCollapsed,
  sidebarWidth: HMI_LAYOUT.leftRailExpanded,
  statusBarHeight: HMI_LAYOUT.statusBarHeight,
} as const;

export const HMI_COLORS = {
  panelBg: "rgba(1, 4, 9, 0.96)",
  panelBorder: "#14532D",
  railAccent: "#14DDE6",
  railMuted: "#64748B",
  railText: "#86EFAC",
} as const;
