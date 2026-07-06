import type { EcgClinicalVisualizationSettings, EcgGridPreset } from "./types";

export type ClinicalWaveformStyle = {
  dimOpacity: number;
  glowBlur: number;
  glowColor: string;
  highlightColor: string;
  hoverColor: string;
  sweepColor: string;
  traceColor: string;
  traceWidth: number;
  traceWidthHighlight: number;
};

export function resolveWaveformStyle(
  settings: EcgClinicalVisualizationSettings,
  gridPreset: EcgGridPreset,
  highlighted: boolean,
  hovered: boolean,
): ClinicalWaveformStyle {
  const isMonitor = gridPreset === "hospital-black" || settings.phosphorEffect;
  const traceColor = isMonitor ? "#22C55E" : settings.highContrast ? "#047857" : "#1D4ED8";
  const glowColor = isMonitor ? "rgba(34,197,94,0.75)" : "rgba(29,78,216,0.45)";
  const baseWidth = settings.waveformThickness * settings.waveformBrightness;
  return {
    dimOpacity: 0.28,
    glowBlur: settings.beatGlow ? (highlighted ? 14 : 8) : 0,
    glowColor,
    highlightColor: "#FACC15",
    hoverColor: "#FDE047",
    sweepColor: isMonitor ? "rgba(220,252,231,0.92)" : "rgba(220,38,38,0.65)",
    traceColor: highlighted ? "#FACC15" : hovered ? "#FDE047" : traceColor,
    traceWidth: highlighted ? baseWidth + 0.6 : baseWidth,
    traceWidthHighlight: baseWidth + 1.2,
  };
}

export function waveformOpacity(settings: EcgClinicalVisualizationSettings, dimmed: boolean) {
  if (dimmed) return settings.waveformOpacity * 0.28;
  return settings.waveformOpacity;
}
