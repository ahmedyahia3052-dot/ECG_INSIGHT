import { AI_DIAGNOSIS_LABELS, type AiDiagnosisLabel } from "../ecg-ai-diagnosis/diagnosis-codes";
import type { BenchmarkCasePipelineResult, BenchmarkMetrics, CalibrationBucket, ConfusionMatrixEntry, PerClassMetrics } from "./types";

function primaryLabel(labels: AiDiagnosisLabel[]) {
  return labels[0] ?? "Normal ECG";
}

function labelVector(labels: AiDiagnosisLabel[], active: AiDiagnosisLabel[]) {
  return labels.map((label) => (active.includes(label) ? 1 : 0));
}

function aurocBinary(yTrue: number[], yScore: number[]): number | null {
  const pairs = yTrue.map((value, index) => ({ label: value, score: yScore[index] ?? 0 }));
  const positives = pairs.filter((item) => item.label === 1);
  const negatives = pairs.filter((item) => item.label === 0);
  if (!positives.length || !negatives.length) return null;
  const order = [...pairs].sort((a, b) => a.score - b.score);
  let rank = 1;
  const ranks = new Map<number, number>();
  for (const item of order) {
    ranks.set(item.score, rank);
    rank += 1;
  }
  const rankSum = positives.reduce((sum, item) => sum + (ranks.get(item.score) ?? 0), 0);
  const positiveCount = positives.length;
  const negativeCount = negatives.length;
  return (rankSum - (positiveCount * (positiveCount + 1)) / 2) / (positiveCount * negativeCount);
}

function macroAuroc(cases: BenchmarkCasePipelineResult[], labels: readonly AiDiagnosisLabel[]) {
  const scores = labels.map((label) => {
    const yTrue = cases.map((item) => (item.groundTruthLabels.includes(label) ? 1 : 0));
    const yScore = cases.map((item) => item.aiDiagnosis.topDiagnoses.find((row) => row.label === label)?.probability ?? 0);
    return aurocBinary(yTrue, yScore);
  }).filter((value): value is number => value !== null);
  if (!scores.length) return null;
  return Number((scores.reduce((sum, value) => sum + value, 0) / scores.length).toFixed(4));
}

function buildConfusionMatrix(cases: BenchmarkCasePipelineResult[]): ConfusionMatrixEntry[] {
  const counts = new Map<string, number>();
  for (const item of cases) {
    const key = `${primaryLabel(item.groundTruthLabels)}::${item.primaryPrediction}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()].map(([key, count]) => {
    const [actual, predicted] = key.split("::") as [AiDiagnosisLabel, AiDiagnosisLabel];
    return { actual, count, predicted };
  });
}

function buildPerClassMetrics(cases: BenchmarkCasePipelineResult[]): PerClassMetrics[] {
  return AI_DIAGNOSIS_LABELS.map((label) => {
    let tp = 0;
    let fp = 0;
    let fn = 0;
    let tn = 0;
    for (const item of cases) {
      const actual = item.groundTruthLabels.includes(label);
      const predicted = item.predictedLabels.includes(label) || item.primaryPrediction === label;
      if (actual && predicted) tp += 1;
      else if (!actual && predicted) fp += 1;
      else if (actual && !predicted) fn += 1;
      else tn += 1;
    }
    const precision = tp / Math.max(tp + fp, 1);
    const recall = tp / Math.max(tp + fn, 1);
    const specificity = tn / Math.max(tn + fp, 1);
    const f1 = (2 * precision * recall) / Math.max(precision + recall, 1e-12);
    return {
      f1: Number(f1.toFixed(4)),
      label,
      precision: Number(precision.toFixed(4)),
      recall: Number(recall.toFixed(4)),
      support: tp + fn,
      specificity: Number(specificity.toFixed(4)),
    };
  }).filter((item) => item.support > 0 || item.precision > 0);
}

function buildCalibration(cases: BenchmarkCasePipelineResult[]): CalibrationBucket[] {
  const buckets: CalibrationBucket[] = [
    { actualAccuracy: 0, avgConfidence: 0, count: 0, max: 0.2, min: 0 },
    { actualAccuracy: 0, avgConfidence: 0, count: 0, max: 0.4, min: 0.2 },
    { actualAccuracy: 0, avgConfidence: 0, count: 0, max: 0.6, min: 0.4 },
    { actualAccuracy: 0, avgConfidence: 0, count: 0, max: 0.8, min: 0.6 },
    { actualAccuracy: 0, avgConfidence: 0, count: 0, max: 1, min: 0.8 },
  ];
  for (const bucket of buckets) {
    const matched = cases.filter((item) => item.aiDiagnosis.confidence >= bucket.min && item.aiDiagnosis.confidence < bucket.max);
    bucket.count = matched.length;
    bucket.avgConfidence = matched.length
      ? Number((matched.reduce((sum, item) => sum + item.aiDiagnosis.confidence, 0) / matched.length).toFixed(4))
      : 0;
    bucket.actualAccuracy = matched.length
      ? Number((matched.filter((item) => item.correct).length / matched.length).toFixed(4))
      : 0;
  }
  return buckets;
}

export function computeBenchmarkMetrics(cases: BenchmarkCasePipelineResult[]): BenchmarkMetrics {
  const correct = cases.filter((item) => item.correct);
  const accuracy = cases.length ? correct.length / cases.length : 0;
  const yTrueFlat = cases.flatMap((item) => labelVector([...AI_DIAGNOSIS_LABELS], item.groundTruthLabels));
  const yPredFlat = cases.flatMap((item) => labelVector([...AI_DIAGNOSIS_LABELS], item.predictedLabels));
  let tp = 0;
  let fp = 0;
  let fn = 0;
  let tn = 0;
  for (let index = 0; index < yTrueFlat.length; index += 1) {
    const actual = yTrueFlat[index] === 1;
    const predicted = yPredFlat[index] === 1;
    if (actual && predicted) tp += 1;
    else if (!actual && predicted) fp += 1;
    else if (actual && !predicted) fn += 1;
    else tn += 1;
  }
  const precision = tp / Math.max(tp + fp, 1);
  const recall = tp / Math.max(tp + fn, 1);
  const f1 = (2 * precision * recall) / Math.max(precision + recall, 1e-12);
  const specificity = tn / Math.max(tn + fp, 1);
  const misclassified = cases.filter((item) => !item.correct);
  const falsePositives = cases.filter((item) => !item.groundTruthLabels.includes(item.primaryPrediction));
  const falseNegatives = cases.filter((item) => !item.predictedLabels.some((label) => item.groundTruthLabels.includes(label)));
  const summarize = (items: BenchmarkCasePipelineResult[]) => items.map((item) => ({
    confidence: item.aiDiagnosis.confidence,
    externalId: item.externalId,
    groundTruth: item.primaryGroundTruth,
    prediction: item.primaryPrediction,
  }));

  return {
    accuracy: Number(accuracy.toFixed(4)),
    auroc: macroAuroc(cases, AI_DIAGNOSIS_LABELS),
    calibration: buildCalibration(cases),
    confusionMatrix: buildConfusionMatrix(cases),
    f1: Number(f1.toFixed(4)),
    falseNegatives: summarize(falseNegatives),
    falsePositives: summarize(falsePositives),
    misclassified: summarize(misclassified),
    perClass: buildPerClassMetrics(cases),
    precision: Number(precision.toFixed(4)),
    recall: Number(recall.toFixed(4)),
    sensitivity: Number(recall.toFixed(4)),
    specificity: Number(specificity.toFixed(4)),
  };
}

export function serializeCaseResult(item: BenchmarkCasePipelineResult) {
  return {
    aiDiagnosis: item.aiDiagnosis,
    correct: item.correct,
    durationMs: item.durationMs,
    externalId: item.externalId,
    groundTruthLabels: item.groundTruthLabels,
    interpretationPrimary: item.interpretation.primaryDiagnosis,
    measurementConfidence: item.measurement.confidence,
    predictedLabels: item.predictedLabels,
    primaryGroundTruth: item.primaryGroundTruth,
    primaryPrediction: item.primaryPrediction,
    qualityScore: item.digitization.quality.score,
  };
}
