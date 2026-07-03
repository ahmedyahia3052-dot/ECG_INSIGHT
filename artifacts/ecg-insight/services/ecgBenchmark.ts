import { apiRequest } from "./api";

export type BenchmarkDatasetId = "cpsc" | "custom" | "physionet" | "ptb-xl";

export interface MisclassifiedSummary {
  confidence: number;
  externalId: string;
  groundTruth: string;
  prediction: string;
}

export interface BenchmarkMetrics {
  accuracy: number;
  auroc: number | null;
  calibration: Array<{ actualAccuracy: number; avgConfidence: number; count: number; max: number; min: number }>;
  confusionMatrix: Array<{ actual: string; count: number; predicted: string }>;
  f1: number;
  falseNegatives: MisclassifiedSummary[];
  falsePositives: MisclassifiedSummary[];
  misclassified: MisclassifiedSummary[];
  perClass: Array<{ f1: number; label: string; precision: number; recall: number; support: number; specificity: number }>;
  precision: number;
  recall: number;
  sensitivity: number;
  specificity: number;
}

export interface BenchmarkRunSummary {
  completedAt: string | null;
  dataset: BenchmarkDatasetId;
  datasetLabel: string;
  id: string;
  metrics: BenchmarkMetrics;
  mode: "benchmark";
  sampleCount: number;
  startedAt: string;
  status: "completed" | "failed" | "running";
}

export interface BenchmarkDashboard {
  latestRun: BenchmarkRunSummary | null;
  overallAccuracy: number;
  perClassAccuracy: Array<{ accuracy: number; label: string; samples: number }>;
  recentRuns: BenchmarkRunSummary[];
  totals: {
    falseNegatives: number;
    falsePositives: number;
    misclassified: number;
    runs: number;
    samples: number;
  };
}

export async function getEcgBenchmarkDashboard(accessToken: string) {
  return apiRequest<{ dashboard: BenchmarkDashboard }>("/ecg/benchmark/dashboard", { accessToken });
}

export async function runEcgBenchmark(accessToken: string, input: { dataset: BenchmarkDatasetId; maxSamples?: number }) {
  return apiRequest<{ benchmark: BenchmarkRunSummary; casesProcessed: number; markdownReport: string; mode: "benchmark" }>("/ecg/benchmark/run", {
    accessToken,
    body: JSON.stringify(input),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
}

export async function getEcgBenchmarkRun(accessToken: string, runId: string) {
  return apiRequest<{ cases: unknown[]; run: BenchmarkRunSummary }>(`/ecg/benchmark/runs/${runId}`, { accessToken });
}

export function benchmarkExportUrl(runId: string, format: "csv" | "markdown" | "pdf") {
  return `/api/ecg/benchmark/runs/${runId}/export/${format}`;
}
