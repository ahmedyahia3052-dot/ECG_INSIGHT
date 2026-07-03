import { computeBenchmarkMetrics } from "../server/src/modules/ecg-benchmark/metrics";
import { runClinicalBenchmark } from "../server/src/modules/ecg-benchmark/benchmark-engine";
import { BUILTIN_BENCHMARK_MANIFESTS } from "../server/src/modules/ecg-benchmark/datasets";
import { runBenchmarkPipelineCase } from "../server/src/modules/ecg-benchmark/pipeline-runner";
import path from "node:path";
import fs from "node:fs/promises";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function main() {
  const imageDir = path.resolve(process.cwd(), "uploads", "sprint64-tests");
  await fs.mkdir(imageDir, { recursive: true });

  const sample = BUILTIN_BENCHMARK_MANIFESTS["ptb-xl"][0];
  const caseResult = await runBenchmarkPipelineCase(sample, imageDir);
  assert(caseResult.primaryPrediction.length > 0, "benchmark pipeline must produce a primary prediction");
  assert(caseResult.digitization.leads.length > 0, "benchmark pipeline must digitize leads");
  assert(caseResult.measurement.heartRate > 0, "benchmark pipeline must compute measurements");
  assert(caseResult.interpretation.primaryDiagnosis.length > 0, "benchmark pipeline must run rule engine");
  assert(caseResult.aiDiagnosis.topDiagnoses.length >= 1, "benchmark pipeline must run AI diagnosis");

  const metrics = computeBenchmarkMetrics([caseResult]);
  assert(metrics.accuracy >= 0 && metrics.accuracy <= 1, "accuracy must be normalized");
  assert(metrics.precision >= 0 && metrics.precision <= 1, "precision must be normalized");
  assert(metrics.recall >= 0 && metrics.recall <= 1, "recall must be normalized");
  assert(metrics.f1 >= 0 && metrics.f1 <= 1, "f1 must be normalized");
  assert(metrics.specificity >= 0 && metrics.specificity <= 1, "specificity must be normalized");
  assert(Array.isArray(metrics.confusionMatrix), "confusion matrix required");
  assert(metrics.calibration.length === 5, "calibration buckets required");
  assert(metrics.perClass.length >= 0, "per-class metrics required");

  const benchmark = await runClinicalBenchmark({
    actorId: "sprint64-integration",
    dataset: "cpsc",
    maxSamples: 2,
  });
  assert(benchmark.run.status === "completed", "benchmark run must complete");
  assert(benchmark.run.metrics.accuracy >= 0, "saved benchmark must include metrics");
  assert(benchmark.cases.length === 2, "benchmark must process requested sample count");

  const reportDir = path.resolve(process.cwd(), "uploads", "benchmarks", benchmark.run.id);
  await fs.access(path.join(reportDir, "report.csv"));
  await fs.access(path.join(reportDir, "report.pdf"));
  await fs.access(path.join(reportDir, "report.md"));

  console.log("ecg-benchmark-sprint64.integration.ts: all tests passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
