import type { ScreenContract } from "./common";

export type LiveMonitorScreenData = {
  activeLeads: string[];
  caseId?: string;
  fullscreen: boolean;
  heartRate?: number;
  transportState: "paused" | "playing" | "stopped";
};

export type LiveMonitorScreenActions = {
  onFullscreenToggle: () => void;
  onLeadSelect: (lead: string) => void;
  onTransportToggle: () => void;
};

export type LiveMonitorScreenContract = ScreenContract<LiveMonitorScreenData, LiveMonitorScreenActions>;
