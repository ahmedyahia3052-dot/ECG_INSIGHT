/** Sprint 28 — Clinical Visualization Engine types */

export type EcgGridPreset = "classic-paper" | "hospital-black" | "dark-blue" | "dark-gray";

export type EcgClinicalRenderMode = "svg" | "canvas2d" | "webgl" | "phosphor";

export type EcgClinicalVisualizationSettings = {
  beatGlow: boolean;
  crtSimulation: boolean;
  gridPreset: EcgGridPreset;
  highContrast: boolean;
  leadFocusEnabled: boolean;
  phosphorEffect: boolean;
  renderMode: EcgClinicalRenderMode;
  showAiHeatmap: boolean;
  showCrosshair: boolean;
  showMiniNavigator: boolean;
  showSignalQuality: boolean;
  showSweepLine: boolean;
  showTimeline: boolean;
  waveformBrightness: number;
  waveformOpacity: number;
  waveformThickness: number;
};

export type EcgCrosshairTelemetry = {
  beatMs: number | null;
  lead: string | null;
  milliseconds: number;
  sampleIndex: number;
  timeLabel: string;
  voltageLabel: string;
  x: number;
  y: number;
};

export type EcgSignalQualityFlag = {
  color: string;
  label: string;
  severity: "critical" | "info" | "warning";
  type: "artifact" | "baseline" | "lead-off" | "noise" | "powerline" | "poor-signal";
};

export type EcgClinicalLayerId =
  | "grid"
  | "waveform"
  | "beat"
  | "measurement"
  | "annotation"
  | "ai"
  | "heatmap"
  | "doctor"
  | "selection"
  | "cursor"
  | "tooltip";

export const CLINICAL_LAYER_Z: Record<EcgClinicalLayerId, number> = {
  ai: 45,
  annotation: 50,
  beat: 25,
  cursor: 75,
  doctor: 55,
  grid: 10,
  heatmap: 42,
  measurement: 35,
  selection: 65,
  tooltip: 80,
  waveform: 20,
};

export const DEFAULT_CLINICAL_SETTINGS: EcgClinicalVisualizationSettings = {
  beatGlow: true,
  crtSimulation: false,
  gridPreset: "classic-paper",
  highContrast: false,
  leadFocusEnabled: false,
  phosphorEffect: false,
  renderMode: "svg",
  showAiHeatmap: true,
  showCrosshair: true,
  showMiniNavigator: true,
  showSignalQuality: true,
  showSweepLine: false,
  showTimeline: true,
  waveformBrightness: 1,
  waveformOpacity: 1,
  waveformThickness: 1.8,
};
