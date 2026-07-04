import type { DigitizationPipelineResult, GridCalibration } from "../types";

export interface BenchmarkCase {
  expectedLeadCount: number;
  expectedMinQuality: number;
  expectedMinValidation: number;
  id: string;
  name: string;
}

export interface BenchmarkResult {
  caseId: string;
  durationMs: number;
  leadCount: number;
  passed: boolean;
  qualityScore: number;
  validationScore: number;
  warnings: string[];
}

export function evaluateDigitizationBenchmark(
  benchmarkCase: BenchmarkCase,
  result: DigitizationPipelineResult,
  durationMs: number,
): BenchmarkResult {
  const leadCount = result.leads.filter((lead) => lead.samples.some((sample) => Math.abs(sample) > 0.02)).length;
  const qualityScore = result.quality.score;
  const validationScore = result.validation?.score ?? 0;
  const passed =
    leadCount >= benchmarkCase.expectedLeadCount
    && qualityScore >= benchmarkCase.expectedMinQuality
    && validationScore >= benchmarkCase.expectedMinValidation;

  return {
    caseId: benchmarkCase.id,
    durationMs,
    leadCount,
    passed,
    qualityScore,
    validationScore,
    warnings: [...result.quality.warnings, ...(result.validation?.warnings ?? [])],
  };
}

export function summarizeBenchmarkResults(results: BenchmarkResult[]) {
  const passed = results.filter((result) => result.passed).length;
  const avgQuality = results.reduce((sum, result) => sum + result.qualityScore, 0) / Math.max(results.length, 1);
  const avgValidation = results.reduce((sum, result) => sum + result.validationScore, 0) / Math.max(results.length, 1);
  const maxDurationMs = Math.max(...results.map((result) => result.durationMs), 0);
  return {
    avgQuality: Number(avgQuality.toFixed(1)),
    avgValidation: Number(avgValidation.toFixed(1)),
    maxDurationMs,
    passRate: Number(((passed / Math.max(results.length, 1)) * 100).toFixed(1)),
    passed,
    total: results.length,
  };
}

export function applyBenchmarkCalibrationHints(
  calibration: GridCalibration,
  hints?: Partial<GridCalibration>,
): GridCalibration {
  if (!hints) return calibration;
  return { ...calibration, ...hints };
}
