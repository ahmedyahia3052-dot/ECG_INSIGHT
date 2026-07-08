import { describe, expect, it } from "vitest";
import { buildSyntheticTwelveLeadEcg } from "../../../../scripts/ecg-diagnostic-engine-synthetic";
import { runDiagnosticPipelineSync } from "../../../../server/src/modules/ecg-diagnostic-engine";

describe("ecg-diagnostic-engine pipeline", () => {
  it("produces enterprise measurements and clinical findings", () => {
    const { calibration, leads } = buildSyntheticTwelveLeadEcg({ bpm: 70 });
    const result = runDiagnosticPipelineSync({ calibration, leads });
    expect(result.version).toBe("sprint54-v1");
    expect(result.measurements.heartRateBpm).toBeGreaterThan(0);
    expect(result.waveDetection.baselineCorrected).toBe(true);
    expect(result.waveDetection.powerlineFiltered).toBe(true);
    expect(result.morphology.length).toBeGreaterThan(0);
    expect(result.rhythm.classification).toBeTruthy();
    expect(result.clinicalFindings.length).toBeGreaterThan(0);
    expect(result.confidence.overall).toBeGreaterThan(0.3);
  });

  it("is deterministic for identical input", () => {
    const input = buildSyntheticTwelveLeadEcg({ bpm: 65, noise: 0 });
    const stripPerf = (result: ReturnType<typeof runDiagnosticPipelineSync>) => {
      const { performanceMs: _performanceMs, ...rest } = result;
      return JSON.stringify(rest);
    };
    expect(stripPerf(runDiagnosticPipelineSync(input))).toBe(stripPerf(runDiagnosticPipelineSync(input)));
  });
});
