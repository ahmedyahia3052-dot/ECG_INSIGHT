import type { AiDiagnosisLabel } from "../ecg-ai-diagnosis/diagnosis-codes";
import type { EcgAiDiagnosisResult } from "../ecg-ai-diagnosis/types";
import type { EcgClinicalInterpretation } from "../ecg-interpretation/types";
import type { EcgClinicalMeasurementResult } from "../ecg-measurement/types";
import type { DigitizationPipelineResult } from "../ecg-digitization/types";

export type BenchmarkDatasetId = "cpsc" | "physionet" | "ptb-xl" | "custom";

export type BenchmarkSampleProfile =
  | "afib"
  | "bradycardia"
  | "lbbb"
  | "normal"
  | "rbbb"
  | "stemi"
  | "tachycardia";

export interface BenchmarkSample {
  externalId: string;
  groundTruthLabels: AiDiagnosisLabel[];
  imagePath?: string;
  profile: BenchmarkSampleProfile;
  source: BenchmarkDatasetId;
}

export interface BenchmarkCasePipelineResult {
  aiDiagnosis: EcgAiDiagnosisResult;
  digitization: DigitizationPipelineResult;
  durationMs: number;
  externalId: string;
  groundTruthLabels: AiDiagnosisLabel[];
  interpretation: EcgClinicalInterpretation;
  measurement: EcgClinicalMeasurementResult;
  predictedLabels: AiDiagnosisLabel[];
  primaryGroundTruth: AiDiagnosisLabel;
  primaryPrediction: AiDiagnosisLabel;
  correct: boolean;
}

export interface ConfusionMatrixEntry {
  actual: AiDiagnosisLabel;
  count: number;
  predicted: AiDiagnosisLabel;
}

export interface PerClassMetrics {
  f1: number;
  label: AiDiagnosisLabel;
  precision: number;
  recall: number;
  support: number;
  specificity: number;
}

export interface CalibrationBucket {
  actualAccuracy: number;
  avgConfidence: number;
  count: number;
  max: number;
  min: number;
}

export interface MisclassifiedSummary {
  confidence: number;
  externalId: string;
  groundTruth: string;
  prediction: string;
}

export interface BenchmarkMetrics {
  accuracy: number;
  auroc: number | null;
  calibration: CalibrationBucket[];
  confusionMatrix: ConfusionMatrixEntry[];
  f1: number;
  falseNegatives: MisclassifiedSummary[];
  falsePositives: MisclassifiedSummary[];
  misclassified: MisclassifiedSummary[];
  perClass: PerClassMetrics[];
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
  initiatedById: string;
  metrics: BenchmarkMetrics;
  mode: "benchmark";
  sampleCount: number;
  startedAt: string;
  status: "completed" | "failed" | "running";
}

export interface BenchmarkDashboard {
  latestRun: BenchmarkRunSummary | null;
  overallAccuracy: number;
  perClassAccuracy: Array<{ accuracy: number; label: AiDiagnosisLabel; samples: number }>;
  recentRuns: BenchmarkRunSummary[];
  totals: {
    falseNegatives: number;
    falsePositives: number;
    misclassified: number;
    runs: number;
    samples: number;
  };
}
