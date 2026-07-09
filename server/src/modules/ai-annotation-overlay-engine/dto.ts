import type { AiClinicalAnnotationDto, AiOverlaySettingsDto, AiOverlayWorkspaceDto } from "../ai-overlay/ai-overlay.contracts";
import type { AiOverlayLayerKey } from "./types";
import { AI_ANNOTATION_OVERLAY_ENGINE_VERSION, AI_OVERLAY_EXPORT_FORMAT } from "./types";

export type AiOverlayLayerToggle = { enabled: boolean; key: AiOverlayLayerKey; label: string; opacity: number };
export type AiOverlayLayerConfigDto = { enabled: boolean; layers: AiOverlayLayerToggle[]; version: 1 };
export type AiOverlayRenderedItemDto = {
  annotationId: string; color: string; confidence: number; confidenceBadge?: string;
  coordinates: { height: number; width: number; x: number; y: number }; label: string; lead: string;
  measurement?: string; type: string; units?: string; visible: boolean;
};
export type AiOverlayRenderedLayerDto = { enabled: boolean; items: AiOverlayRenderedItemDto[]; key: AiOverlayLayerKey; label: string };
export type AiOverlayMultiLayerDto = {
  caseId: string; engineVersion: typeof AI_ANNOTATION_OVERLAY_ENGINE_VERSION; layers: AiOverlayRenderedLayerDto[];
  renderedAt: string; totalAnnotations: number;
};
export type AiOverlayReportExportDto = {
  annotations: AiClinicalAnnotationDto[]; caseId: string; enabled: boolean;
  engineVersion: typeof AI_ANNOTATION_OVERLAY_ENGINE_VERSION; exportedAt: string; format: typeof AI_OVERLAY_EXPORT_FORMAT;
  layerConfig: AiOverlayLayerConfigDto; multiLayer: AiOverlayMultiLayerDto; settings: AiOverlaySettingsDto;
};
export type AiOverlayExportBundleDto = AiOverlayReportExportDto;

export const DEFAULT_AI_OVERLAY_LAYER_CONFIG: AiOverlayLayerConfigDto = {
  enabled: true,
  layers: [
    { enabled: true, key: "p_wave_markers", label: "P Wave Markers", opacity: 1 },
    { enabled: true, key: "qrs_markers", label: "QRS Markers", opacity: 1 },
    { enabled: true, key: "t_wave_markers", label: "T Wave Markers", opacity: 1 },
    { enabled: true, key: "st_markers", label: "ST Markers", opacity: 1 },
    { enabled: true, key: "qt_interval_overlay", label: "QT Interval Overlay", opacity: 1 },
    { enabled: true, key: "measurement_labels", label: "Measurement Labels", opacity: 1 },
    { enabled: true, key: "confidence_badges", label: "Confidence Badges", opacity: 0.95 },
    { enabled: true, key: "abnormality_highlights", label: "Abnormality Highlights", opacity: 0.85 },
    { enabled: true, key: "physician_notes", label: "Physician Notes", opacity: 1 },
  ],
  version: 1,
};

export const DEFAULT_AI_OVERLAY_SETTINGS: AiOverlaySettingsDto = {
  enabled: true, fontScale: 1, opacity: 0.92, showAnnotations: true, showConfidence: true,
  showHeatmap: false, showLabels: true, theme: "clinical",
};

export function emptyWorkspace(): AiOverlayWorkspaceDto {
  return { annotations: [], selectedAnnotationIds: [], settings: DEFAULT_AI_OVERLAY_SETTINGS, version: 1 };
}

export type PersistedAiOverlayWorkspaceDto = {
  caseId: string; enabled: boolean; layerConfig: AiOverlayLayerConfigDto; updatedAt: string;
  updatedById: string; version: number; workspace: AiOverlayWorkspaceDto;
};
