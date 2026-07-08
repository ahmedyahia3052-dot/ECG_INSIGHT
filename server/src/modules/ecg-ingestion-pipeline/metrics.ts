import type { EcgIngestionStageName, IngestionProcessingMetrics } from "./types";

export function createEmptyIngestionMetrics(): IngestionProcessingMetrics {
  return {
    retryCount: 0,
    stageDurationsMs: {},
  };
}

export function parseIngestionMetrics(value: unknown): IngestionProcessingMetrics {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return createEmptyIngestionMetrics();
  }
  return value as IngestionProcessingMetrics;
}

export function recordStageDuration(
  metrics: IngestionProcessingMetrics,
  stage: EcgIngestionStageName,
  durationMs: number,
): IngestionProcessingMetrics {
  return {
    ...metrics,
    stageDurationsMs: {
      ...metrics.stageDurationsMs,
      [stage]: durationMs,
    },
  };
}

export function finalizeIngestionMetrics(
  metrics: IngestionProcessingMetrics,
  startedAt?: Date | null,
  completedAt?: Date | null,
): IngestionProcessingMetrics {
  if (!startedAt || !completedAt) return metrics;
  return {
    ...metrics,
    totalDurationMs: Math.max(0, completedAt.getTime() - startedAt.getTime()),
  };
}

export type IngestionAggregateMetrics = {
  completed: number;
  deadLetter: number;
  duplicate: number;
  failed: number;
  inFlight: number;
  queued: number;
};

export function summarizeIngestionMetrics(counts: {
  completed: number;
  deadLetter: number;
  duplicate: number;
  failed: number;
  inFlight: number;
  queued: number;
}): IngestionAggregateMetrics {
  return counts;
}
