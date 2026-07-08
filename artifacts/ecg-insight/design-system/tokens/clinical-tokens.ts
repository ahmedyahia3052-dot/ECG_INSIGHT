/** Clinical / workstation token barrels — values unchanged from viewer modules. */

export { ECG_COCKPIT_COLORS } from "@/components/ecg/viewer/ecgCockpitColors";
export { ECG_ENTERPRISE_DESIGN } from "@/components/ecg/viewer/ecgEnterpriseDesignTokens";
export { ECG_LIVE_MONITOR } from "@/components/ecg/viewer/ecgLiveMonitorTokens";
export { ECG_SPACING } from "@/components/ecg/viewer/ecgSpacingTokens";
export {
  clampLeftPanelWidth,
  clampRightPanelWidth,
  ECG_WORKSTATION_VISUAL,
  responsiveLeftPanelWidth,
} from "@/components/ecg/viewer/ecgWorkstationVisualTokens";
export { ECG_READING_STATION } from "@/components/ecg/viewer/ecgReadingStationTokens";
export { HMI_COLORS, HMI_LAYOUT, LIVE_MONITOR_LAYOUT } from "@/components/ecg/viewer/live-monitor-hmi/ecgLiveMonitorHmiTokens";

export const clinicalTokenModules = [
  "ecgCockpitColors",
  "ecgEnterpriseDesignTokens",
  "ecgLiveMonitorTokens",
  "ecgSpacingTokens",
  "ecgWorkstationVisualTokens",
  "ecgReadingStationTokens",
  "live-monitor-hmi/ecgLiveMonitorHmiTokens",
] as const;
