import {
  averageRrIntervalMs,
  detectBundleBranchPatterns,
  electricalAxisDeg,
  evaluateVoltageCriteria,
  heartRateFromRrMs,
  qtcBazettMs,
  qtcFridericiaMs,
  qtDispersionMs,
  runMeasurementEngine,
  validateMeasurementBundle,
} from "../server/src/modules/ecg-measurement-engine";
import { buildSyntheticTwelveLeadEcg } from "./ecg-diagnostic-engine-synthetic";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function main() {
  assert(heartRateFromRrMs(833) === 72, "heart rate from RR should be 72 bpm at 833ms");
  assert(qtcBazettMs(400, 833) > 0, "QTc Bazett should be positive");
  assert(qtcFridericiaMs(400, 833) > 0, "QTc Fridericia should be positive");
  assert(qtDispersionMs([380, 400, 420]) === 40, "QT dispersion should be max-min");
  assert(electricalAxisDeg(1, 1) > 0, "axis should compute for positive nets");

  const bbb = detectBundleBranchPatterns({
    leadIMinMv: -0.3,
    qrsDurationMs: 130,
    v1MaxMv: 0.5,
    v1MinMv: -0.2,
    v6MaxMv: 0.6,
  });
  assert(bbb.includes("rbbb_pattern") || bbb.includes("lbbb_pattern") || bbb.includes("intraventricular_conduction_delay"), "BBB detection should classify");

  const voltage = evaluateVoltageCriteria({
    limbLeadPeakMv: [0.4, 0.3, 0.35, 0.2, 0.25, 0.3],
    qrsAmplitudeMv: 1.2,
    v1MinMv: -1.0,
    v1PeakMv: 0.5,
    v5PeakMv: 2.8,
    v6PeakMv: 2.4,
  });
  assert(voltage.lvhVoltageCriteria, "LVH criteria should trigger for high precordial R + S V1");

  const { calibration, leads } = buildSyntheticTwelveLeadEcg({ bpm: 72, noise: 0 });
  const rPeaks = [100, 600, 1100];
  assert(averageRrIntervalMs(rPeaks, 500) > 0, "average RR from peaks should be positive");

  const resultA = runMeasurementEngine({ calibration, leads });
  const resultB = runMeasurementEngine({ calibration, leads });
  assert(resultA.engineVersion === "sprint59-v1", "engine version should be sprint59-v1");
  assert(resultA.bundle.heartRate.heartRateBpm > 0, "heart rate should be computed");
  assert(resultA.bundle.intervals.prIntervalMs > 0, "PR interval should be computed");
  assert(resultA.bundle.intervals.qrsDurationMs > 0, "QRS duration should be computed");
  assert(resultA.bundle.intervals.qtIntervalMs > 0, "QT interval should be computed");
  assert(resultA.bundle.intervals.qtcBazettMs > 0, "QTc should be computed");
  assert(resultA.bundle.intervals.qtcFridericiaMs > 0, "QTc Fridericia should be computed");
  assert(resultA.bundle.intervals.pDurationMs > 0, "P duration should be computed");
  assert(resultA.bundle.amplitudes.pWaveAmplitudeMv >= 0, "P amplitude should be present");
  assert(resultA.bundle.amplitudes.qrsAmplitudeMv >= 0, "QRS amplitude should be present");
  assert(resultA.bundle.amplitudes.tWaveAmplitudeMv >= 0, "T amplitude should be present");
  assert(resultA.bundle.stSegment.stElevationMm >= 0, "ST elevation should be present");
  assert(resultA.bundle.stSegment.stDepressionMm >= 0, "ST depression should be present");
  assert(typeof resultA.bundle.stSegment.jPointMm === "number", "J point should be present");
  assert(["normal", "poor", "reverse"].includes(resultA.bundle.progression.rProgression), "R progression should classify");
  assert(resultA.bundle.bundleBranch.patterns.length > 0, "bundle branch patterns should be populated");
  assert(typeof resultA.bundle.axis.electricalAxisDeg === "number", "electrical axis should be computed");
  assert(resultA.validation.issues.length >= 0, "validation should return issues array");
  assert(resultA.performanceMs >= 0, "performance metric should be recorded");
  assert(JSON.stringify(resultA.bundle) === JSON.stringify(resultB.bundle), "measurement engine must be deterministic");

  const validation = validateMeasurementBundle(resultA.bundle);
  assert(typeof validation.valid === "boolean", "validation.valid should be boolean");

  console.log("ecg-measurement-engine-sprint59.test.ts: all tests passed");
}

main();
