/** Sprint 49 — professional bedside monitor HMI tokens */

export const HMI_LAYOUT = {
  bottomBarHeight: 44,
  canvasViewportRatio: 0.94,
  chromeCompact: 20,
  leftRailExpanded: 168,
  leftRailCollapsed: 36,
  rightRailExpanded: 200,
  rightRailCollapsed: 36,
  statusBarHeight: 32,
  ultraWideBreakpoint: 1600,
} as const;

export const HMI_COLORS = {
  panelBg: "rgba(1, 4, 9, 0.96)",
  panelBorder: "#14532D",
  railAccent: "#14DDE6",
  railMuted: "#64748B",
  railText: "#86EFAC",
} as const;
