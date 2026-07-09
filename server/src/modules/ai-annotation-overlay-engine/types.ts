export const AI_ANNOTATION_OVERLAY_ENGINE_VERSION = "sprint97-ai-overlay-v1" as const;
export const AI_OVERLAY_EXPORT_FORMAT = "ecg-ai-overlay-v1" as const;

export const AI_OVERLAY_LAYER_ORDER = [
  "p_wave_markers",
  "qrs_markers",
  "t_wave_markers",
  "st_markers",
  "qt_interval_overlay",
  "measurement_labels",
  "confidence_badges",
  "abnormality_highlights",
  "physician_notes",
] as const;

export type AiOverlayLayerKey = (typeof AI_OVERLAY_LAYER_ORDER)[number];

export const ABNORMALITY_COLORS = {
  critical: "#EF4444",
  high: "#F97316",
  low: "#22C55E",
  moderate: "#EAB308",
  normal: "#94A3B8",
} as const;
