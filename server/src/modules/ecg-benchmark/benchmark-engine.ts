import path from "node:path";
import { datasetLabel, importPublicDatasetManifest } from "./datasets";
import { computeBenchmarkMetrics, serializeCaseResult } from "./metrics";
import { runBenchmarkPipelineCase } from "./pipeline-runner";
import { buildBenchmarkCsv, buildBenchmarkPdf, buildValidationReportMarkdown } from "./report-builder";
import {
  benchmarkStorageRoot,
  createBenchmarkRunId,
  listBenchmarkRuns,
  loadBenchmarkCases,
  loadBenchmarkRun,
  saveBenchmarkArtifact,
  saveBenchmarkRun,
} from "./storage";
import type { BenchmarkDashboard, BenchmarkDatasetId, BenchmarkRunSummary, BenchmarkSample } from "./types";

export async function runClinicalBenchmark(input: {
  actorId: string;
  customManifestPath?: string;
  dataset: BenchmarkDatasetId;
  maxSamples?: number;
  samples?: BenchmarkSample[];
}) {
  const runId = createBenchmarkRunId();
  const startedAt = new Date().toISOString();
  const samples = await importPublicDatasetManifest({
    dataset: input.dataset,
    manifestPath: input.customManifestPath,
    samples: input.samples,
  });
  const limited = samples.slice(0, input.maxSamples ?? samples.length);
  const imageDir = path.join(benchmarkStorageRoot(), runId, "images");
  const caseResults = [];

  for (const sample of limited) {
    caseResults.push(await runBenchmarkPipelineCase(sample, imageDir));
  }

  const metrics = computeBenchmarkMetrics(caseResults);
  const completedAt = new Date().toISOString();
  const run: BenchmarkRunSummary = {
    completedAt,
    dataset: input.dataset,
    datasetLabel: datasetLabel(input.dataset),
    id: runId,
    initiatedById: input.actorId,
    metrics,
    mode: "benchmark",
    sampleCount: limited.length,
    startedAt,
    status: "completed",
  };

  const serializedCases = caseResults.map(serializeCaseResult);
  await saveBenchmarkRun(run, serializedCases);
  const markdown = buildValidationReportMarkdown(run, caseResults);
  await saveBenchmarkArtifact(runId, "report.md", markdown);
  await saveBenchmarkArtifact(runId, "report.csv", buildBenchmarkCsv(run, caseResults));
  await saveBenchmarkArtifact(runId, "report.pdf", buildBenchmarkPdf(run, markdown));
  return { cases: serializedCases, run };
}

export async function getBenchmarkDashboard(): Promise<BenchmarkDashboard> {
  const runs = await listBenchmarkRuns(10);
  const latest = runs[0] ? await loadBenchmarkRun(runs[0].id) : null;
  const perClassMap = new Map<string, { correct: number; total: number }>();
  let misclassified = 0;
  let falsePositives = 0;
  let falseNegatives = 0;
  let samples = 0;
  let accuracySum = 0;

  for (const entry of runs) {
    accuracySum += entry.summary.accuracy;
    samples += entry.sampleCount;
    const run = await loadBenchmarkRun(entry.id);
    if (!run) continue;
    misclassified += run.metrics.misclassified.length;
    falsePositives += run.metrics.falsePositives.length;
    falseNegatives += run.metrics.falseNegatives.length;
    for (const item of run.metrics.perClass) {
      const bucket = perClassMap.get(item.label) ?? { correct: 0, total: 0 };
      bucket.total += item.support;
      bucket.correct += Math.round(item.recall * item.support);
      perClassMap.set(item.label, bucket);
    }
  }

  return {
    latestRun: latest,
    overallAccuracy: runs.length ? Number((accuracySum / runs.length).toFixed(4)) : 0,
    perClassAccuracy: [...perClassMap.entries()].map(([label, bucket]) => ({
      accuracy: bucket.total ? Number((bucket.correct / bucket.total).toFixed(4)) : 0,
      label: label as BenchmarkRunSummary["metrics"]["perClass"][number]["label"],
      samples: bucket.total,
    })),
    recentRuns: runs.map((entry) => ({
      completedAt: entry.completedAt,
      dataset: entry.dataset,
      datasetLabel: entry.datasetLabel,
      id: entry.id,
      initiatedById: entry.initiatedById,
      metrics: {
        accuracy: entry.summary.accuracy,
        auroc: null,
        calibration: [],
        confusionMatrix: [],
        f1: entry.summary.f1,
        falseNegatives: [],
        falsePositives: [],
        misclassified: [],
        perClass: [],
        precision: entry.summary.precision,
        recall: entry.summary.recall,
        sensitivity: entry.summary.recall,
        specificity: 0,
      },
      mode: "benchmark" as const,
      sampleCount: entry.sampleCount,
      startedAt: entry.startedAt,
      status: entry.status,
    })),
    totals: {
      falseNegatives,
      falsePositives,
      misclassified,
      runs: runs.length,
      samples,
    },
  };
}

export async function getBenchmarkRunDetail(runId: string) {
  const run = await loadBenchmarkRun(runId);
  if (!run) return null;
  const cases = await loadBenchmarkCases(runId);
  return { cases, run };
}

export { listBenchmarkRuns, loadBenchmarkRun, readBenchmarkArtifact } from "./storage";
