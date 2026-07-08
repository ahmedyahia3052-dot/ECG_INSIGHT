import { abnormalMeasurementKeys } from "../adapter";
import { DIAGNOSTIC_ENGINE_VERSION } from "../types";
import type {
  DiagnosticPipelineResult,
  MeasurementComparisonResult,
  MeasurementExportPayload,
  MeasurementStudioSnapshot,
  MeasurementTrendPoint,
} from "../types";

const studioStore = new Map<string, MeasurementStudioSnapshot[]>();

export function recordMeasurementSnapshot(
  caseId: string,
  pipeline: DiagnosticPipelineResult,
): MeasurementStudioSnapshot {
  const snapshot: MeasurementStudioSnapshot = {
    abnormalKeys: abnormalMeasurementKeys(pipeline.measurements),
    capturedAt: new Date().toISOString(),
    caseId,
    confidence: pipeline.confidence.overall,
    measurements: pipeline.measurements,
  };
  const history = studioStore.get(caseId) ?? [];
  history.push(snapshot);
  studioStore.set(caseId, history.slice(-100));
  return snapshot;
}

export function getMeasurementHistory(caseId: string): MeasurementStudioSnapshot[] {
  return studioStore.get(caseId) ?? [];
}

export function getLiveMeasurementSnapshot(caseId: string): MeasurementStudioSnapshot | null {
  const history = studioStore.get(caseId);
  return history?.[history.length - 1] ?? null;
}

export function exportMeasurementPayload(
  caseId: string,
  pipeline: DiagnosticPipelineResult,
): MeasurementExportPayload {
  return {
    caseId,
    clinicalFindings: pipeline.clinicalFindings,
    confidence: pipeline.confidence,
    exportedAt: new Date().toISOString(),
    measurements: pipeline.measurements,
    morphology: pipeline.morphology,
    rhythm: pipeline.rhythm,
    version: DIAGNOSTIC_ENGINE_VERSION,
  };
}

export function compareMeasurements(
  caseId: string,
  baselineIndex = 0,
): MeasurementComparisonResult | null {
  const history = studioStore.get(caseId);
  if (!history || history.length < 2) return null;
  const baseline = history[baselineIndex] ?? history[0];
  const current = history[history.length - 1];
  const numericKeys = [
    "heartRateBpm",
    "rrIntervalMs",
    "prIntervalMs",
    "qrsDurationMs",
    "qtIntervalMs",
    "qtcBazettMs",
    "stDeviationMm",
  ] as const;

  const deltas: Record<string, number> = {};
  const trendDirection: Record<string, "up" | "down" | "stable"> = {};
  for (const key of numericKeys) {
    const delta = Number((current.measurements[key] - baseline.measurements[key]).toFixed(3));
    deltas[key] = delta;
    trendDirection[key] = Math.abs(delta) < 0.01 ? "stable" : delta > 0 ? "up" : "down";
  }

  return { baseline, current, deltas, trendDirection };
}

export function computeMeasurementTrend(
  caseId: string,
  metric: keyof MeasurementStudioSnapshot["measurements"],
): MeasurementTrendPoint[] {
  const history = studioStore.get(caseId) ?? [];
  return history.map((snapshot) => ({
    abnormal: snapshot.abnormalKeys.includes(String(metric)),
    timestamp: snapshot.capturedAt,
    value: Number(snapshot.measurements[metric]),
  }));
}

export function clearMeasurementStudioStore(caseId?: string): void {
  if (caseId) studioStore.delete(caseId);
  else studioStore.clear();
}
