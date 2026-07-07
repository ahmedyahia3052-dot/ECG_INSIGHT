import type { DigitalEcgLead } from "@/services/ecgProcessing";

import { detectBeatMarkerIndices } from "../ecgMonitorBeatMarkers";
import { sampleIndexToMs } from "../ecgMonitorPath";

export type MonitorIntervalMetrics = {
  prMs: number | null;
  qrsMs: number | null;
  qtMs: number | null;
  qtcMs: number | null;
  rrMs: number | null;
};

export function computeMonitorIntervals(lead: DigitalEcgLead | null | undefined): MonitorIntervalMetrics {
  if (!lead?.samples.length) {
    return { prMs: null, qrsMs: null, qtMs: null, qtcMs: null, rrMs: null };
  }
  const peaks = detectBeatMarkerIndices(lead, 24);
  if (peaks.length < 2) {
    return { prMs: null, qrsMs: null, qtMs: null, qtcMs: null, rrMs: null };
  }
  const rrSamples = peaks[1]! - peaks[0]!;
  const rrMs = Math.round(sampleIndexToMs(lead, rrSamples));
  const qrsMs = Math.round((lead.samplingRate ?? 500) * 0.09);
  const qtMs = Math.round(rrMs * 0.42);
  const qtcMs = Math.round(qtMs / Math.sqrt(rrMs / 1000));
  const prMs = Math.round((lead.samplingRate ?? 500) * 0.16);
  return { prMs, qrsMs, qtMs, qtcMs, rrMs };
}

export function heartRateFromLead(lead: DigitalEcgLead | null | undefined, fallback?: number) {
  const intervals = computeMonitorIntervals(lead);
  if (intervals.rrMs && intervals.rrMs > 0) return Math.round(60000 / intervals.rrMs);
  return fallback;
}
