import { buildTwelveLeadRegions } from "./rendering-engine/twelveLeadLayout";
import type { EcgLeadId } from "./types";
import type { EcgTwelveLeadRegion } from "./rendering-engine/types";

export type MonitorLayoutMode = "single" | "3-lead" | "5-lead" | "6-lead" | "12-lead" | "custom";

export const MONITOR_3_LEAD: EcgLeadId[] = ["II", "V1", "V5"];
export const MONITOR_5_LEAD: EcgLeadId[] = ["I", "II", "III", "aVR", "V1"];
export const MONITOR_6_LEAD: EcgLeadId[] = ["II", "V1", "V2", "V3", "V4", "V5"];
export const MONITOR_CUSTOM_DEFAULT: EcgLeadId[] = ["I", "II", "III", "aVR"];

export function buildMonitorLayoutRegions(
  containerWidth: number,
  containerHeight: number,
  mode: MonitorLayoutMode,
  activeLead: EcgLeadId = "II",
  customLeads: EcgLeadId[] = MONITOR_CUSTOM_DEFAULT,
): EcgTwelveLeadRegion[] {
  if (mode === "12-lead") {
    return buildTwelveLeadRegions(containerWidth, containerHeight, "12-lead");
  }
  if (mode === "single") {
    return buildTwelveLeadRegions(containerWidth, containerHeight, "single", activeLead);
  }

  const leads =
    mode === "3-lead"
      ? MONITOR_3_LEAD
      : mode === "5-lead"
        ? MONITOR_5_LEAD
        : mode === "6-lead"
          ? MONITOR_6_LEAD
          : customLeads.length >= 2
            ? customLeads
            : MONITOR_CUSTOM_DEFAULT;

  const rowH = containerHeight / leads.length;
  return leads.map((lead, index) => ({
    height: rowH,
    lead,
    width: containerWidth,
    x: 0,
    y: index * rowH,
  }));
}

export function layoutModeLabel(mode: MonitorLayoutMode, selectedLead: EcgLeadId, rhythmStrip: boolean, rhythmLead: string): string {
  if (rhythmStrip) return `RHYTHM STRIP · LEAD ${rhythmLead}`;
  if (mode === "single") return `LEAD ${selectedLead}`;
  if (mode === "3-lead") return "3-LEAD MONITOR";
  if (mode === "5-lead") return "5-LEAD MONITOR";
  if (mode === "6-lead") return "6-LEAD MONITOR";
  if (mode === "custom") return "CUSTOM MONITOR";
  return "12-LEAD MONITOR";
}
