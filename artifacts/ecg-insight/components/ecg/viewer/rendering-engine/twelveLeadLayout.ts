import { STANDARD_ECG_LEADS } from "../types";
import type { EcgTwelveLeadRegion } from "./types";
export type TwelveLeadLayoutPreset =
  | "12-lead"
  | "3x4"
  | "6x2"
  | "rhythm"
  | "sequential"
  | "single"
  | "stacked";

const HOSPITAL_GRID_ORDER: string[] = [
  "I", "aVR", "V1", "V4",
  "II", "aVL", "V2", "V5",
  "III", "aVF", "V3", "V6",
];

const SEQUENTIAL_ORDER: string[] = [...STANDARD_ECG_LEADS];

function gridRegions(
  containerWidth: number,
  containerHeight: number,
  leads: string[],
  cols: number,
): EcgTwelveLeadRegion[] {
  const rows = Math.ceil(leads.length / cols);
  const cellW = containerWidth / cols;
  const cellH = containerHeight / rows;
  return leads.map((lead, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    return { height: cellH, lead, width: cellW, x: col * cellW, y: row * cellH };
  });
}

function stackRegions(containerWidth: number, containerHeight: number, leads: string[]): EcgTwelveLeadRegion[] {
  const rowH = containerHeight / leads.length;
  return leads.map((lead, index) => ({
    height: rowH,
    lead,
    width: containerWidth,
    x: 0,
    y: index * rowH,
  }));
}

export function buildTwelveLeadRegions(
  containerWidth: number,
  containerHeight: number,
  layout: TwelveLeadLayoutPreset = "12-lead",
  activeLead?: string,
): EcgTwelveLeadRegion[] {
  if (layout === "single" && activeLead) {
    return [{ height: containerHeight, lead: activeLead, width: containerWidth, x: 0, y: 0 }];
  }
  if (layout === "6x2") {
    return gridRegions(containerWidth, containerHeight, SEQUENTIAL_ORDER, 2);
  }
  if (layout === "3x4") {
    return gridRegions(containerWidth, containerHeight, SEQUENTIAL_ORDER, 4);
  }
  if (layout === "sequential" || layout === "stacked") {
    return stackRegions(containerWidth, containerHeight, SEQUENTIAL_ORDER);
  }
  if (layout === "rhythm") {
    return [
      ...stackRegions(containerWidth, containerHeight * 0.82, SEQUENTIAL_ORDER),
      {
        height: containerHeight * 0.18,
        lead: "II",
        rhythmStrip: true,
        width: containerWidth,
        x: 0,
        y: containerHeight * 0.82,
      },
    ];
  }

  const cols = 4;
  const rows = 3;
  const rhythmHeight = containerHeight * 0.16;
  const mainHeight = containerHeight - rhythmHeight;
  const cellW = containerWidth / cols;
  const cellH = mainHeight / rows;
  const leadRegions: EcgTwelveLeadRegion[] = HOSPITAL_GRID_ORDER.map((lead, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    return { height: cellH, lead, width: cellW, x: col * cellW, y: row * cellH };
  });
  leadRegions.push({
    height: rhythmHeight,
    lead: "II",
    rhythmStrip: true,
    width: containerWidth,
    x: 0,
    y: mainHeight,
  });
  return leadRegions;
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
