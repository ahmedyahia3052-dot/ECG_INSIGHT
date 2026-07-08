/**
 * Sprint 74 — Canonical viewer foundation contracts.
 * Single import surface for leads, grid, layout, monitor, and rendering settings.
 */

import type { RenderEngine2GridSettings } from "./render-engine-2/types";
import type { EcgRenderGridSettings } from "./rendering-engine/types";
import type {
  EcgCompareLayoutMode,
  EcgGridGain,
  EcgLeadId,
  EcgLeadLayoutMode,
  EcgPaperSpeed,
  EcgViewerGridSettings,
  EcgWorkstationTheme,
  EcgWorkstationViewMode,
  EcgWorkspaceLayoutMode,
} from "./types";
import {
  DEFAULT_ADJUSTMENTS,
  DEFAULT_GRID,
  DEFAULT_TRANSFORM,
  STANDARD_ECG_LEADS,
} from "./types";
import type {
  MonitorComparisonPreset,
  MonitorDisplayPreset,
  MonitorLayoutMode,
  RhythmStripWindow,
} from "./monitorLayout";

// ─── Canonical lead definitions (single source: ./types) ───────────────────

export { DEFAULT_ADJUSTMENTS, DEFAULT_GRID, DEFAULT_TRANSFORM, STANDARD_ECG_LEADS };
export type { EcgGridGain, EcgLeadId, EcgPaperSpeed };

// ─── Viewer / workspace view contracts ─────────────────────────────────────

export type {
  EcgCompareLayoutMode,
  EcgLeadLayoutMode,
  EcgViewerGridSettings,
  EcgWorkstationTheme,
  EcgWorkstationViewMode,
  EcgWorkspaceLayoutMode,
};

// ─── Live monitor contracts ──────────────────────────────────────────────────

export type { MonitorComparisonPreset, MonitorDisplayPreset, MonitorLayoutMode, RhythmStripWindow };

/** Layout modes shared between workstation lead layout and hospital monitor. */
export type SharedLeadLayoutMode = Extract<EcgLeadLayoutMode, "12-lead" | "3x4" | "6x2" | "single">;

/** Monitor-only layouts (not used in static workstation viewer). */
export type MonitorExclusiveLayoutMode = Exclude<MonitorLayoutMode, SharedLeadLayoutMode>;

// ─── Rendering engine grid contracts ─────────────────────────────────────────

export type ClinicalRenderGridSettings = EcgRenderGridSettings;
export type HospitalRenderGridSettings = RenderEngine2GridSettings;

export function toClinicalRenderGrid(grid: EcgViewerGridSettings): EcgRenderGridSettings {
  return {
    gain: grid.gain,
    opacity: grid.opacity,
    speed: grid.speed,
    visible: grid.visible,
  };
}

export function toHospitalRenderGrid(grid: EcgViewerGridSettings, zoom = 1): RenderEngine2GridSettings {
  return {
    gain: grid.gain,
    paperSpeed: grid.speed,
    visible: grid.visible,
    zoom,
  };
}

export function fromClinicalRenderGrid(grid: EcgRenderGridSettings, base: EcgViewerGridSettings = DEFAULT_GRID): EcgViewerGridSettings {
  return {
    ...base,
    gain: grid.gain,
    opacity: grid.opacity,
    speed: grid.speed,
    visible: grid.visible,
  };
}

// ─── Layout bridges ───────────────────────────────────────────────────────────

const SHARED_LAYOUT_SET = new Set<string>(["12-lead", "3x4", "6x2", "single"]);

export function isSharedLeadLayoutMode(mode: string): mode is SharedLeadLayoutMode {
  return SHARED_LAYOUT_SET.has(mode);
}

export function monitorLayoutToLeadLayout(mode: MonitorLayoutMode): EcgLeadLayoutMode | null {
  return isSharedLeadLayoutMode(mode) ? mode : null;
}

export function leadLayoutToMonitorLayout(mode: EcgLeadLayoutMode): MonitorLayoutMode | null {
  return isSharedLeadLayoutMode(mode) ? mode : null;
}

/** Default rhythm / monitor lead per enterprise convention. */
export const DEFAULT_MONITOR_LEAD: EcgLeadId = "II";

export const VIEWER_FOUNDATION_CONTRACT_VERSION = "sprint74-v1";
