import type { AIExplainability } from "@/services/ai";

export type AiVisualRegion = {
  color: string;
  confidence: number;
  endMs: number;
  glow: string;
  label: string;
  lead: string;
  startMs: number;
};

export function buildAiVisualRegions(
  explainability: AIExplainability | null | undefined,
  durationMs: number,
): AiVisualRegion[] {
  if (!explainability?.leadHighlights?.length) return [];
  const span = Math.max(durationMs * 0.15, 400);
  return explainability.leadHighlights.map((item, index) => {
    const confidence = item.confidence ?? 0.5;
    const center = ((index + 1) / (explainability.leadHighlights.length + 1)) * durationMs;
    const startMs = Math.max(0, center - span / 2);
    const endMs = Math.min(durationMs, center + span / 2);
    const alpha = Math.min(0.85, 0.35 + confidence * 0.5);
    return {
      color: `rgba(250, 204, 21, ${alpha})`,
      confidence,
      endMs,
      glow: `rgba(250, 204, 21, ${alpha * 0.6})`,
      label: item.finding ?? item.reason ?? "AI Finding",
      lead: item.lead ?? "II",
      startMs,
    };
  });
}

export function aiRegionRect(
  region: AiVisualRegion,
  regionX: number,
  regionY: number,
  regionWidth: number,
  regionHeight: number,
  durationMs: number,
) {
  if (durationMs <= 0) return null;
  const left = regionX + (region.startMs / durationMs) * regionWidth;
  const width = Math.max(4, ((region.endMs - region.startMs) / durationMs) * regionWidth);
  return { height: regionHeight, width, x: left, y: regionY };
}

export function confidenceBarWidth(confidence: number, maxWidth: number) {
  return Math.max(4, confidence * maxWidth);
}
