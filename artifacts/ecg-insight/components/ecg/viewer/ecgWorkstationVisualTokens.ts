/** Sprint 53 — enterprise workstation layout tokens. */
export const ECG_WORKSTATION_VISUAL = {
  leftCollapsedWidth: 36,
  leftExpandedWidth: 288,
  leftPanelMaxWidth: 360,
  leftPanelMinWidth: 260,
  miniNavigatorHeight: 28,
  monitorBorderRadius: 2,
  panelAutoHideDelayMs: 2400,
  panelBorderRadius: 2,
  rightCollapsedWidth: 36,
  rightExpandedWidth: 300,
  rightPanelMaxWidth: 340,
  rightPanelMinWidth: 220,
  statusBarHeight: 20,
  statusBarMinHeight: 20,
  statusBarUpdateIntervalMs: 500,
  toolbarButtonSize: 20,
  toolbarMaxHeight: 36,
  toolbarGroupGap: 1,
  floatingToolSize: 22,
  transitionMs: 150,
  viewportTargetMin: 0.9,
  viewportTargetMax: 0.98,
  workspaceGap: 2,
  workspacePadding: 0,
  workspaceSafePaddingLeft: 0,
  toolbarButtonHeight: 20,
  toolbarButtonMinWidth: 20,
} as const;

export function clampLeftPanelWidth(width: number) {
  return Math.min(ECG_WORKSTATION_VISUAL.leftPanelMaxWidth, Math.max(ECG_WORKSTATION_VISUAL.leftPanelMinWidth, width));
}

export function clampRightPanelWidth(width: number) {
  return Math.min(ECG_WORKSTATION_VISUAL.rightPanelMaxWidth, Math.max(ECG_WORKSTATION_VISUAL.rightPanelMinWidth, width));
}

export function responsiveLeftPanelWidth(viewportWidth: number) {
  if (viewportWidth >= 2560) return 360;
  if (viewportWidth >= 1920) return 320;
  if (viewportWidth >= 1440) return 300;
  return ECG_WORKSTATION_VISUAL.leftPanelMinWidth;
}
