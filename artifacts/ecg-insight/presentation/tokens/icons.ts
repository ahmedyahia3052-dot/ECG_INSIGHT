/**
 * Sprint 78 — Icon registry (Feather + medical semantic aliases).
 */

import type { Feather } from "@expo/vector-icons";

export type FeatherIconName = keyof typeof Feather.glyphMap;

export type MedicalIconAlias =
  | "ecg-waveform"
  | "heart-rate"
  | "lead-grid"
  | "calipers"
  | "alarm-critical"
  | "alarm-warning"
  | "patient"
  | "report"
  | "copilot"
  | "monitor-live";

/** Maps semantic medical icon names to Feather glyphs used in production today. */
export const medicalIconRegistry: Record<MedicalIconAlias, FeatherIconName> = {
  "alarm-critical": "alert-octagon",
  "alarm-warning": "alert-triangle",
  calipers: "maximize-2",
  copilot: "message-square",
  "ecg-waveform": "activity",
  "heart-rate": "heart",
  "lead-grid": "grid",
  "monitor-live": "monitor",
  patient: "user",
  report: "file-text",
};

export const navigationIconRegistry = {
  dashboard: "grid",
  workspace: "image",
  liveMonitor: "monitor",
  patients: "users",
  reports: "file-text",
  copilot: "message-square",
  settings: "settings",
} as const satisfies Record<string, FeatherIconName>;

export function resolveMedicalIcon(alias: MedicalIconAlias): FeatherIconName {
  return medicalIconRegistry[alias];
}
