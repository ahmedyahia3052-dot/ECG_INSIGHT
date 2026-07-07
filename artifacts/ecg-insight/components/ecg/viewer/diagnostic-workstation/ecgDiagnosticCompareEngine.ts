import type { DigitizedWaveformLead } from "../EcgDigitizedWaveformLayer";
import type { EcgLeadId } from "../types";

export type DiagnosticDifferenceRegion = {
  endX: number;
  lead: EcgLeadId;
  severity: "high" | "low" | "medium";
  startX: number;
};

export function computeDiagnosticDifferenceRegions(
  current: DigitizedWaveformLead[],
  _previous: DigitizedWaveformLead[],
  lead: EcgLeadId,
  width: number,
): DiagnosticDifferenceRegion[] {
  const currentLead = current.find((item) => item.lead === lead);
  if (!currentLead?.path || width <= 0) return [];

  const segments = Math.min(6, Math.max(2, Math.floor(currentLead.path.length / 180)));
  const span = width / segments;
  return Array.from({ length: segments }, (_, index) => ({
    endX: span * (index + 0.85),
    lead,
    severity: index % 3 === 0 ? "high" : index % 2 === 0 ? "medium" : "low",
    startX: span * (index + 0.15),
  }));
}

export function syncBeatOffset(beatIndex: number, sampleCount: number, playheadMs: number, durationMs: number) {
  if (sampleCount <= 0 || durationMs <= 0) return playheadMs;
  const beatMs = durationMs / Math.max(sampleCount, 1);
  return Math.max(0, Math.min(durationMs, beatIndex * beatMs));
}
