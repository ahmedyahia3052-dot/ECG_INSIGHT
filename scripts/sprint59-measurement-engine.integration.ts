import { runIntegrationMain } from "./finish-integration";
import { runMeasurementEngine } from "../server/src/modules/ecg-measurement-engine";
import { measurementEngineResultSchema } from "../server/src/modules/ecg-measurement-engine/schemas";
import { buildSyntheticTwelveLeadEcg } from "./ecg-diagnostic-engine-synthetic";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function main() {
  const { calibration, leads } = buildSyntheticTwelveLeadEcg({ bpm: 68, durationSeconds: 12, noise: 0.02 });
  const result = runMeasurementEngine({ calibration, leads });

  assert(result.engineVersion === "sprint59-v1", "engine version mismatch");
  measurementEngineResultSchema.parse(result);

  const requiredFields = [
    result.bundle.heartRate.heartRateBpm,
    result.bundle.heartRate.rrIntervalMs,
    result.bundle.intervals.prIntervalMs,
    result.bundle.intervals.qrsDurationMs,
    result.bundle.intervals.qtIntervalMs,
    result.bundle.intervals.qtcBazettMs,
    result.bundle.intervals.qtcFridericiaMs,
    result.bundle.intervals.pDurationMs,
    result.bundle.axis.electricalAxisDeg,
    result.bundle.amplitudes.pWaveAmplitudeMv,
    result.bundle.amplitudes.qrsAmplitudeMv,
    result.bundle.amplitudes.tWaveAmplitudeMv,
    result.bundle.stSegment.stElevationMm,
    result.bundle.stSegment.stDepressionMm,
    result.bundle.stSegment.jPointMm,
  ];
  assert(requiredFields.every((value) => Number.isFinite(value)), "all scalar measurements should be finite");

  assert(result.performanceMs < 3000, "measurement engine should complete within 3s budget");
  assert(result.confidence > 0 && result.confidence <= 1, "confidence should be normalized");

  console.log("sprint59-measurement-engine.integration.ts: all tests passed");
}

runIntegrationMain(main, "sprint59-measurement-engine.integration.ts");
