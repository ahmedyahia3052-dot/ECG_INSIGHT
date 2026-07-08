import { buildTwelveLeadRegions } from "./rendering-engine/twelveLeadLayout";
import type { EcgLeadLayoutMode } from "./types";
import type { EcgLeadId } from "./types";
import type { EcgTwelveLeadRegion } from "./rendering-engine/types";

/** Layout modes shared with workstation {@link EcgLeadLayoutMode}. */
export type MonitorSharedLeadLayoutMode = Extract<EcgLeadLayoutMode, "12-lead" | "3x4" | "6x2" | "single">;

/** Monitor-only layouts (dual, quad, N-lead bundles, custom). */
export type MonitorExclusiveLayoutMode = "dual" | "quad" | "3-lead" | "5-lead" | "6-lead" | "custom";

/** Sprint 50 — hospital-grade layout modes (backward compatible with Sprint 45). */
export type MonitorLayoutMode = MonitorSharedLeadLayoutMode | MonitorExclusiveLayoutMode;

export type MonitorDisplayPreset = "bedside" | "central-station" | "diagnostic" | null;

/** Hospital view presets map to canonical multi-lead layouts. */
export const DISPLAY_PRESET_LAYOUT: Record<Exclude<MonitorDisplayPreset, null>, MonitorLayoutMode> = {
  bedside: "dual",
  "central-station": "6x2",
  diagnostic: "12-lead",
};

export function displayPresetLabel(preset: MonitorDisplayPreset): string | null {
  if (!preset) return null;
  if (preset === "bedside") return "BEDSIDE MONITOR";
  if (preset === "central-station") return "CENTRAL STATION";
  return "DIAGNOSTIC MONITOR";
}

export type MonitorComparisonPreset = "anterior" | "custom" | "II-V5" | "inferior" | "lateral" | null;

export type RhythmStripWindow = 0 | 10 | 20 | 30;

export const MONITOR_3_LEAD: EcgLeadId[] = ["II", "V1", "V5"];
export const MONITOR_5_LEAD: EcgLeadId[] = ["I", "II", "III", "aVR", "V1"];
export const MONITOR_6_LEAD: EcgLeadId[] = ["II", "V1", "V2", "V3", "V4", "V5"];
export const MONITOR_DUAL: EcgLeadId[] = ["II", "V5"];
export const MONITOR_QUAD: EcgLeadId[] = ["I", "II", "V1", "V5"];
export const MONITOR_CUSTOM_DEFAULT: EcgLeadId[] = ["I", "II", "III", "aVR"];

export const COMPARISON_PRESETS: Record<Exclude<MonitorComparisonPreset, null | "custom">, EcgLeadId[]> = {
  "II-V5": ["II", "V5"],
  anterior: ["V1", "V2", "V3", "V4"],
  inferior: ["II", "III", "aVF"],
  lateral: ["I", "aVL", "V5", "V6"],
};

function stackRegions(containerWidth: number, containerHeight: number, leads: EcgLeadId[]): EcgTwelveLeadRegion[] {
  const rowH = containerHeight / leads.length;
  return leads.map((lead, index) => ({
    height: rowH,
    lead,
    width: containerWidth,
    x: 0,
    y: index * rowH,
  }));
}

function gridRegions(containerWidth: number, containerHeight: number, leads: EcgLeadId[], cols: number): EcgTwelveLeadRegion[] {
  const rows = Math.ceil(leads.length / cols);
  const cellW = containerWidth / cols;
  const cellH = containerHeight / rows;
  return leads.map((lead, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    return { height: cellH, lead, width: cellW, x: col * cellW, y: row * cellH };
  });
}

const SIX_BY_TWO_ORDER: EcgLeadId[] = ["I", "II", "III", "aVR", "aVL", "aVF", "V1", "V2", "V3", "V4", "V5", "V6"];

export function buildMonitorLayoutRegions(
  containerWidth: number,
  containerHeight: number,
  mode: MonitorLayoutMode,
  activeLead: EcgLeadId = "II",
  customLeads: EcgLeadId[] = MONITOR_CUSTOM_DEFAULT,
): EcgTwelveLeadRegion[] {
  if (mode === "12-lead" || mode === "3x4") {
    return buildTwelveLeadRegions(containerWidth, containerHeight, "12-lead");
  }
  if (mode === "6x2") {
    return gridRegions(containerWidth, containerHeight, SIX_BY_TWO_ORDER, 2);
  }
  if (mode === "single") {
    return buildTwelveLeadRegions(containerWidth, containerHeight, "single", activeLead);
  }
  if (mode === "dual") {
    return stackRegions(containerWidth, containerHeight, MONITOR_DUAL);
  }
  if (mode === "quad") {
    return gridRegions(containerWidth, containerHeight, MONITOR_QUAD, 2);
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

  return stackRegions(containerWidth, containerHeight, leads);
}

export function layoutModeLabel(
  mode: MonitorLayoutMode,
  selectedLead: EcgLeadId,
  rhythmStrip: boolean,
  rhythmLead: string,
  focusLead?: EcgLeadId | null,
  displayPreset?: MonitorDisplayPreset | null,
): string {
  const presetLabel = displayPresetLabel(displayPreset ?? null);
  if (presetLabel) return presetLabel;
  if (focusLead) return `LEAD FOCUS · ${focusLead}`;
  if (rhythmStrip) return `RHYTHM STRIP · LEAD ${rhythmLead}`;
  if (mode === "single") return `LEAD ${selectedLead}`;
  if (mode === "dual") return "DUAL LEAD MONITOR";
  if (mode === "quad") return "QUAD LEAD MONITOR";
  if (mode === "6x2") return "6×2 MONITOR";
  if (mode === "3x4") return "3×4 MONITOR";
  if (mode === "3-lead") return "3-LEAD MONITOR";
  if (mode === "5-lead") return "5-LEAD MONITOR";
  if (mode === "6-lead") return "6-LEAD MONITOR";
  if (mode === "custom") return "CUSTOM MONITOR";
  return "12-LEAD MONITOR";
}

/** True when the monitor should render multiple leads simultaneously (not lead-focus). */
export function isMultiLeadLayoutMode(mode: MonitorLayoutMode) {
  return (
    mode === "12-lead"
    || mode === "6x2"
    || mode === "3x4"
    || mode === "6-lead"
    || mode === "5-lead"
    || mode === "3-lead"
    || mode === "dual"
    || mode === "quad"
    || mode === "custom"
  );
}

export function comparisonPresetLabel(preset: MonitorComparisonPreset) {
  if (!preset) return null;
  if (preset === "II-V5") return "Lead II vs V5";
  if (preset === "inferior") return "Inferior Leads";
  if (preset === "anterior") return "Anterior Leads";
  if (preset === "lateral") return "Lateral Leads";
  return "Custom Comparison";
}
