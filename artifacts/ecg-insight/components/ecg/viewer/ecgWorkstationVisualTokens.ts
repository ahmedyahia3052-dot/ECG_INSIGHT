/** Sprint 99 — ECG paper occupies ~75–80% of workspace; narrower clinical rails. */
export const ECG_WORKSTATION_VISUAL = {
  leftCollapsedWidth: 36,
  leftExpandedWidth: 240,
  leftPanelMaxWidth: 280,
  leftPanelMinWidth: 200,
  miniNavigatorHeight: 28,
  monitorBorderRadius: 2,
  panelAutoHideDelayMs: 2400,
  panelBorderRadius: 2,
  rightCollapsedWidth: 36,
  rightExpandedWidth: 260,
  rightPanelMaxWidth: 300,
  rightPanelMinWidth: 200,
  statusBarHeight: 20,
  statusBarMinHeight: 20,
  statusBarUpdateIntervalMs: 500,
  toolbarButtonSize: 20,
  toolbarMaxHeight: 36,
  toolbarGroupGap: 1,
  floatingToolSize: 22,
  transitionMs: 150,
  viewportTargetMin: 0.75,
  viewportTargetMax: 0.8,
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
