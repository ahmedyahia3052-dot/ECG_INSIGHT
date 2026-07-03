import type { BenchmarkCasePipelineResult, BenchmarkMetrics, BenchmarkRunSummary } from "./types";
import { serializeCaseResult } from "./metrics";

export function buildValidationReportMarkdown(run: BenchmarkRunSummary, cases: BenchmarkCasePipelineResult[]) {
  const { metrics } = run;
  return [
    "# ECG Clinical Validation Report",
    "",
    `**Run ID:** ${run.id}`,
    `**Dataset:** ${run.datasetLabel}`,
    `**Samples:** ${run.sampleCount}`,
    `**Status:** ${run.status}`,
    `**Completed:** ${run.completedAt ?? "in progress"}`,
    "",
    "## Aggregate Metrics",
    "",
    `| Metric | Value |`,
    `| --- | --- |`,
    `| Accuracy | ${(metrics.accuracy * 100).toFixed(2)}% |`,
    `| Precision | ${(metrics.precision * 100).toFixed(2)}% |`,
    `| Recall / Sensitivity | ${(metrics.recall * 100).toFixed(2)}% |`,
    `| F1 Score | ${(metrics.f1 * 100).toFixed(2)}% |`,
    `| Specificity | ${(metrics.specificity * 100).toFixed(2)}% |`,
    `| ROC AUC (macro) | ${metrics.auroc === null ? "N/A" : metrics.auroc.toFixed(4)} |`,
    "",
    "## Per-Class Performance",
    "",
    ...metrics.perClass.map((item) => `- **${item.label}** — precision ${(item.precision * 100).toFixed(1)}%, recall ${(item.recall * 100).toFixed(1)}%, F1 ${(item.f1 * 100).toFixed(1)}%, support ${item.support}`),
    "",
    "## Confusion Matrix (Primary Diagnosis)",
    "",
    ...metrics.confusionMatrix.map((item) => `- Actual **${item.actual}** → Predicted **${item.predicted}**: ${item.count}`),
    "",
    "## Confidence Calibration",
    "",
    ...metrics.calibration.map((bucket) => `- ${Math.round(bucket.min * 100)}–${Math.round(bucket.max * 100)}% confidence: n=${bucket.count}, avg confidence ${(bucket.avgConfidence * 100).toFixed(1)}%, observed accuracy ${(bucket.actualAccuracy * 100).toFixed(1)}%`),
    "",
    "## Misclassified Samples",
    "",
    ...metrics.misclassified.slice(0, 20).map((item) => `- ${item.externalId}: expected ${item.groundTruth}, predicted ${item.prediction}`),
    "",
    "## Pipeline Coverage",
    "",
    "Each sample executed: image preprocessing → digitization → measurement → rule engine → AI diagnosis ensemble.",
    "",
    `Processed cases: ${cases.length}`,
  ].join("\n");
}

export function buildBenchmarkCsv(run: BenchmarkRunSummary, cases: BenchmarkCasePipelineResult[]) {
  const header = [
    "external_id",
    "dataset",
    "ground_truth",
    "primary_prediction",
    "correct",
    "confidence",
    "agreement_with_rules",
    "quality_score",
    "duration_ms",
    "rule_primary",
    "top_diagnoses",
  ].join(",");
  const rows = cases.map((item) => {
    const serialized = serializeCaseResult(item);
    return [
      serialized.externalId,
      run.dataset,
      serialized.groundTruthLabels.join("|"),
      serialized.primaryPrediction,
      serialized.correct ? "true" : "false",
      serialized.aiDiagnosis.confidence,
      serialized.aiDiagnosis.agreementWithRules,
      serialized.qualityScore,
      serialized.durationMs,
      serialized.interpretationPrimary,
      serialized.aiDiagnosis.topDiagnoses.map((row) => `${row.label}:${row.probability}`).join("|"),
    ].map((value) => `"${String(value).replace(/"/g, '""')}"`).join(",");
  });
  return [header, ...rows].join("\n");
}

export function buildBenchmarkPdf(run: BenchmarkRunSummary, markdown: string) {
  return [
    "ECG Insight Clinical Validation Benchmark Report",
    `Run: ${run.id}`,
    `Dataset: ${run.datasetLabel}`,
    `Generated: ${run.completedAt ?? new Date().toISOString()}`,
    "",
    markdown.replace(/^#/gm, "").replace(/\*\*/g, ""),
  ].join("\n");
}

export function metricsOnlyForStorage(metrics: BenchmarkMetrics): BenchmarkMetrics {
  return metrics;
}
