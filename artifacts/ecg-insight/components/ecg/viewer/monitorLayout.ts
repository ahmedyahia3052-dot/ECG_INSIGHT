import { buildTwelveLeadRegions } from "./rendering-engine/twelveLeadLayout";
import type { EcgLeadId } from "./types";
import type { EcgTwelveLeadRegion } from "./rendering-engine/types";

export type MonitorLayoutMode = "single" | "3-lead" | "5-lead" | "12-lead";

export const MONITOR_3_LEAD: EcgLeadId[] = ["II", "V1", "V5"];
export const MONITOR_5_LEAD: EcgLeadId[] = ["I", "II", "III", "aVR", "V1"];

export function buildMonitorLayoutRegions(
  containerWidth: number,
  containerHeight: number,
  mode: MonitorLayoutMode,
  activeLead: EcgLeadId = "II",
): EcgTwelveLeadRegion[] {
  if (mode === "12-lead") {
    return buildTwelveLeadRegions(containerWidth, containerHeight, "12-lead");
  }
  if (mode === "single") {
    return buildTwelveLeadRegions(containerWidth, containerHeight, "single", activeLead);
  }

  const leads = mode === "3-lead" ? MONITOR_3_LEAD : MONITOR_5_LEAD;
  const rowH = containerHeight / leads.length;
  return leads.map((lead, index) => ({
    height: rowH,
    lead,
    width: containerWidth,
    x: 0,
    y: index * rowH,
  }));
}
