import type { AiClinicalAnnotationDto } from "../ai-overlay/ai-overlay.contracts";
import type { AiOverlayLayerConfigDto, AiOverlayMultiLayerDto, AiOverlayRenderedItemDto } from "./dto";
import { ABNORMALITY_COLORS, AI_ANNOTATION_OVERLAY_ENGINE_VERSION, AI_OVERLAY_LAYER_ORDER, type AiOverlayLayerKey } from "./types";
import { confidencePercent } from "./overlay-builder";

const LAYER_LABELS: Record<AiOverlayLayerKey, string> = {
  abnormality_highlights: "Abnormality Highlights", confidence_badges: "Confidence Badges",
  measurement_labels: "Measurement Labels", physician_notes: "Physician Notes",
  p_wave_markers: "P Wave Markers", qrs_markers: "QRS Markers", qt_interval_overlay: "QT Interval Overlay",
  st_markers: "ST Markers", t_wave_markers: "T Wave Markers",
};
const TYPE_TO_LAYER: Record<string, AiOverlayLayerKey> = {
  conduction_delay: "abnormality_highlights", custom: "abnormality_highlights", heart_rate: "measurement_labels",
  p_wave: "p_wave_markers", physician_note: "physician_notes", pr_interval: "p_wave_markers",
  qrs_complex: "qrs_markers", qt_interval: "qt_interval_overlay", qtc_interval: "qt_interval_overlay",
  rhythm: "abnormality_highlights", st_segment: "st_markers", t_wave: "t_wave_markers",
};

function colorForAnnotation(annotation: AiClinicalAnnotationDto) {
  const confidence = confidencePercent(annotation.confidence);
  if (annotation.type === "st_segment" && annotation.measurement) {
    const deviation = Number(annotation.measurement);
    if (Math.abs(deviation) >= 2) return ABNORMALITY_COLORS.critical;
    if (Math.abs(deviation) >= 1) return ABNORMALITY_COLORS.high;
  }
  if (confidence >= 95) return ABNORMALITY_COLORS.low;
  if (confidence >= 70) return ABNORMALITY_COLORS.moderate;
  if (confidence >= 50) return ABNORMALITY_COLORS.high;
  return ABNORMALITY_COLORS.critical;
}

function toRenderedItem(annotation: AiClinicalAnnotationDto, layerKey: AiOverlayLayerKey): AiOverlayRenderedItemDto {
  const confidence = confidencePercent(annotation.confidence);
  return {
    annotationId: annotation.id, color: colorForAnnotation(annotation), confidence,
    confidenceBadge: layerKey === "confidence_badges" ? `${confidence}%` : undefined,
    coordinates: annotation.coordinates,
    label: annotation.measurement && annotation.units ? `${annotation.type} ${annotation.measurement}${annotation.units}` : (annotation.clinicalMeaning ?? annotation.type),
    lead: annotation.lead, measurement: annotation.measurement, type: annotation.type, units: annotation.units, visible: annotation.visible,
  };
}

export function renderMultiLayerOverlay(input: {
  annotations: AiClinicalAnnotationDto[]; caseId: string; layerConfig: AiOverlayLayerConfigDto;
}): AiOverlayMultiLayerDto {
  const layerToggleMap = new Map(input.layerConfig.layers.map((layer) => [layer.key, layer]));
  const buckets = new Map<AiOverlayLayerKey, AiOverlayRenderedItemDto[]>(AI_OVERLAY_LAYER_ORDER.map((key) => [key, []]));
  for (const annotation of input.annotations) {
    if (!annotation.visible || annotation.rejected) continue;
    const primaryLayer = TYPE_TO_LAYER[annotation.type] ?? "abnormality_highlights";
    buckets.get(primaryLayer)?.push(toRenderedItem(annotation, primaryLayer));
    if (input.layerConfig.layers.find((layer) => layer.key === "confidence_badges")?.enabled) {
      buckets.get("confidence_badges")?.push(toRenderedItem(annotation, "confidence_badges"));
    }
    if (["st_segment", "conduction_delay", "rhythm"].includes(annotation.type)) {
      buckets.get("abnormality_highlights")?.push(toRenderedItem(annotation, "abnormality_highlights"));
    }
  }
  return {
    caseId: input.caseId, engineVersion: AI_ANNOTATION_OVERLAY_ENGINE_VERSION,
    layers: AI_OVERLAY_LAYER_ORDER.map((key) => ({
      enabled: input.layerConfig.enabled && (layerToggleMap.get(key)?.enabled ?? true),
      items: buckets.get(key) ?? [], key, label: LAYER_LABELS[key],
    })).filter((layer) => layer.items.length > 0 || layer.key === "measurement_labels"),
    renderedAt: new Date().toISOString(),
    totalAnnotations: input.annotations.filter((item) => item.visible && !item.rejected).length,
  };
}
