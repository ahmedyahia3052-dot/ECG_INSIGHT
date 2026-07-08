import { describe, expect, it } from "vitest";
import {
  heartRateFromRrMs,
  qtcBazettMs,
  qtcFridericiaMs,
  runMeasurementEngine,
  validateMeasurementBundle,
} from "../../../../server/src/modules/ecg-measurement-engine";
import { buildSyntheticTwelveLeadEcg } from "../../../../scripts/ecg-diagnostic-engine-synthetic";

describe("ecg-measurement-engine sprint59", () => {
  it("computes heart rate from RR interval", () => {
    expect(heartRateFromRrMs(600)).toBe(100);
    expect(heartRateFromRrMs(1000)).toBe(60);
  });

  it("computes QTc corrections", () => {
    expect(qtcBazettMs(400, 800)).toBeGreaterThan(400);
    expect(qtcFridericiaMs(400, 800)).toBeGreaterThan(350);
  });

  it("runs full measurement engine on synthetic 12-lead", () => {
    const { calibration, leads } = buildSyntheticTwelveLeadEcg({ bpm: 75, noise: 0 });
    const result = runMeasurementEngine({ calibration, leads });
    expect(result.engineVersion).toBe("sprint59-v1");
    expect(result.bundle.heartRate.heartRateBpm).toBeGreaterThan(0);
    expect(result.bundle.intervals.qrsDurationMs).toBeGreaterThan(0);
    expect(result.validation.valid).toBeTypeOf("boolean");
  });

  it("validates measurement bundle", () => {
    const { calibration, leads } = buildSyntheticTwelveLeadEcg({ bpm: 75, noise: 0 });
    const result = runMeasurementEngine({ calibration, leads });
    const validation = validateMeasurementBundle(result.bundle);
    expect(Array.isArray(validation.issues)).toBe(true);
  });
});
