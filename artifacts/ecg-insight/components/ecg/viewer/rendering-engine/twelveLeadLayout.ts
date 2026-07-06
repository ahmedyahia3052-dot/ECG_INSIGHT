import { STANDARD_ECG_LEADS } from "../types";
import type { EcgTwelveLeadRegion } from "./types";

/** 12-lead layout with shared synchronized timeline */

export function buildTwelveLeadRegions(
  containerWidth: number,
  containerHeight: number,
  layout: "12-lead" | "rhythm" | "single" = "12-lead",
  activeLead?: string,
): EcgTwelveLeadRegion[] {
  if (layout === "single" && activeLead) {
    return [{ height: containerHeight, lead: activeLead, width: containerWidth, x: 0, y: 0 }];
  }
  if (layout === "rhythm") {
    const rhythmLeads = ["I", "II", "III", "aVR", "aVL", "aVF"] as const;
    const rowH = containerHeight / rhythmLeads.length;
    return rhythmLeads.map((lead, index) => ({
      height: rowH,
      lead,
      width: containerWidth,
      x: 0,
      y: index * rowH,
    }));
  }

  const cols = 4;
  const rows = 3;
  const cellW = containerWidth / cols;
  const cellH = containerHeight / rows;
  const order: string[] = [
    "I", "aVR", "V1", "V4",
    "II", "aVL", "V2", "V5",
    "III", "aVF", "V3", "V6",
  ];
  return order.map((lead, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    return { height: cellH, lead, width: cellW, x: col * cellW, y: row * cellH };
  });
}

export function sharedTimelineMs(sampleIndex: number, samplingRate: number) {
  if (samplingRate <= 0) return 0;
  return (sampleIndex / samplingRate) * 1000;
}

export function sampleIndexAtMs(ms: number, samplingRate: number, sampleCount: number) {
  if (samplingRate <= 0 || sampleCount <= 0) return 0;
  const index = Math.round((ms / 1000) * samplingRate);
  return Math.max(0, Math.min(sampleCount - 1, index));
}

export function allStandardLeads() {
  return [...STANDARD_ECG_LEADS];
}
