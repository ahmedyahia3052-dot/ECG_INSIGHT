import {
  clearMeasurementStudioStore,
  compareMeasurements,
  computeMeasurementTrend,
  exportMeasurementPayload,
  recordMeasurementSnapshot,
  runDiagnosticPipelineSync,
  toLegacyMeasurementResult,
} from "../server/src/modules/ecg-diagnostic-engine";
import { buildSyntheticTwelveLeadEcg, generateSyntheticBeatSamples } from "./ecg-diagnostic-engine-synthetic";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function stablePayload(pipeline: ReturnType<typeof runDiagnosticPipelineSync>) {
  const { performanceMs: _performanceMs, ...rest } = pipeline;
  return JSON.stringify(rest);
}

function main() {
  const { calibration, leads } = buildSyntheticTwelveLeadEcg({ bpm: 72, noise: 0 });
  const pipelineA = runDiagnosticPipelineSync({ calibration, leads });
  const pipelineB = runDiagnosticPipelineSync({ calibration, leads });
  const legacy = toLegacyMeasurementResult(pipelineA, leads[1]?.samplingRate ?? 500);

  assert(pipelineA.version === "sprint54-v1", "pipeline version should be sprint54-v1");
  assert(pipelineA.measurements.heartRateBpm > 0, "heart rate should be computed");
  assert(pipelineA.measurements.prIntervalMs > 0, "PR interval should be computed");
  assert(pipelineA.measurements.qrsDurationMs > 0, "QRS duration should be computed");
  assert(pipelineA.measurements.qtIntervalMs > 0, "QT interval should be computed");
  assert(pipelineA.measurements.qtcBazettMs > 0, "QTc should be computed");
  assert(pipelineA.measurements.qtDispersionMs >= 0, "QT dispersion should be computed");
  assert(pipelineA.waveDetection.beats.length > 0, "beats should be detected");
  assert(pipelineA.waveDetection.beats[0].peakConfidence > 0, "peak confidence should be set");
  assert(pipelineA.rhythm.confidence > 0, "rhythm confidence should be set");
  assert(pipelineA.clinicalFindings.length > 0, "clinical findings should be generated");
  assert(pipelineA.confidence.overall > 0, "overall confidence should be set");
  assert(pipelineA.performanceMs >= 0, "performance metric should be recorded");
  assert(legacy.measurements.length >= 20, "legacy adapter should expose expanded measurement list");
  assert(stablePayload(pipelineA) === stablePayload(pipelineB), "pipeline output must be deterministic");

  clearMeasurementStudioStore("sprint54-case");
  recordMeasurementSnapshot("sprint54-case", pipelineA);
  recordMeasurementSnapshot("sprint54-case", pipelineB);
  const comparison = compareMeasurements("sprint54-case");
  assert(comparison !== null, "comparison API should return deltas");
  const trend = computeMeasurementTrend("sprint54-case", "heartRateBpm");
  assert(trend.length === 2, "trend API should return historical points");
  const exported = exportMeasurementPayload("sprint54-case", pipelineA);
  assert(exported.version === "sprint54-v1", "export payload should include engine version");

  const noisy = runDiagnosticPipelineSync({
    calibration,
    leads: leads.map((lead) => ({
      ...lead,
      samples: generateSyntheticBeatSamples({ bpm: 72, noise: 0.8, samplingRate: lead.samplingRate }),
    })),
  });
  assert(noisy.confidence.overall <= pipelineA.confidence.overall + 0.05, "noisy signal should not increase confidence");

  const longLead = buildSyntheticTwelveLeadEcg({ durationSeconds: 30, bpm: 68 });
  const longPipeline = runDiagnosticPipelineSync(longLead);
  assert(longPipeline.waveDetection.rPeaks.length >= 5, "long ECG should detect multiple beats");
  assert(longPipeline.performanceMs < 5000, "long ECG analysis should complete within stress budget");

  console.log("ecg-diagnostic-engine-sprint54.test.ts: all tests passed");
}

main();
