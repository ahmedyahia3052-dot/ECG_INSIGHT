/** Sprint 53 Hotfix — reading station layout tokens (replaces nested flex/grid shell). */
export const ECG_READING_STATION = {
  headerMaxHeight: 72,
  leftCollapsedWidth: 64,
  leftExpandedWidth: 260,
  leftMaxWidth: 320,
  leftMinWidth: 220,
  rightCollapsedWidth: 40,
  rightExpandedWidth: 300,
  rightMaxWidth: 360,
  rightMinWidth: 240,
  statusBarHeight: 22,
  workflowMaxHeight: 36,
  workflowMinHeight: 28,
} as const;

export function clampLeftRailWidth(width: number) {
  return Math.min(ECG_READING_STATION.leftMaxWidth, Math.max(ECG_READING_STATION.leftExpandedWidth, width));
}

export function clampRightRailWidth(width: number) {
  return Math.min(ECG_READING_STATION.rightMaxWidth, Math.max(ECG_READING_STATION.rightMinWidth, width));
}
