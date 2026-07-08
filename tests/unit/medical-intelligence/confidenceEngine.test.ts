import { describe, expect, it } from "vitest";

import { assessFindingConfidence, assessOverallConfidence } from "../../../server/src/modules/medical-intelligence/confidence/engine";
import type { RuleFinding } from "../../../server/src/modules/medical-intelligence/types";
import type { EcgClinicalMeasurementResult } from "../../../server/src/modules/ecg-measurement/types";

function measurement(confidence: number): EcgClinicalMeasurementResult {
  return {
    amplitudes: { pWaveAmplitudeMv: 0.15, qrsAmplitudeMv: 1.2, rWaveProgression: "normal", stDeviationMm: 0, tWaveAmplitudeMv: 0.4 },
    axis: { electricalAxisDeg: 45, frontalPlaneAxisDeg: 45, meanQrsAxisDeg: 45 },
    confidence,
    heartRate: 75,
    intervals: { pWaveDurationMs: 90, prIntervalMs: 160, qrsDurationMs: 90, qtIntervalMs: 380, qtcBazettMs: 410, qtcFridericiaMs: 400, rrIntervalMs: 800 },
    morphology: [],
    rhythm: "sinus_rhythm",
    stDeviation: 0,
    measurements: [],
  };
}

function finding(overrides: Partial<RuleFinding> = {}): RuleFinding {
  return {
    category: "ischemia",
    code: "STEMI",
    evidence: [
      { feature: "ST elevation", met: true, value: "2.5mm" },
      { feature: "Reciprocal change", met: true, value: "present" },
      { feature: "Symptoms", met: false, value: "unknown" },
    ],
    label: "ST-Elevation MI",
    rawConfidence: 0.72,
    ruleId: "rule-stemi",
    severity: "critical",
    triggeredBy: ["st_elevation", "territory_anterior", "t_wave"],
    urgency: "immediate",
    ...overrides,
  };
}

describe("medical-intelligence confidence engine", () => {
  it("assesses finding confidence from evidence and measurement quality", () => {
    const assessment = assessFindingConfidence(finding(), measurement(0.9));
    expect(assessment.score).toBeGreaterThan(0.5);
    expect(assessment.level).toMatch(/high|medium/);
    expect(assessment.explanation).toContain("ST-Elevation");
    expect(assessment.factors.some((f) => f.impact === "positive")).toBe(true);
  });

  it("reduces confidence when measurement quality is low", () => {
    const high = assessFindingConfidence(finding(), measurement(0.9)).score;
    const low = assessFindingConfidence(finding(), measurement(0.3)).score;
    expect(low).toBeLessThan(high);
  });

  it("returns measurement-only confidence when no findings exist", () => {
    const assessment = assessOverallConfidence([], measurement(0.85), []);
    expect(assessment.explanation).toContain("No diagnostic findings");
    expect(assessment.level).toBe("medium");
  });

  it("blends individual assessments for overall confidence", () => {
    const f = finding();
    const assessments = [assessFindingConfidence(f, measurement(0.85))];
    const overall = assessOverallConfidence([f], measurement(0.85), assessments);
    expect(overall.score).toBeGreaterThan(0.4);
    expect(overall.factors.some((factor) => factor.factor.includes("finding"))).toBe(true);
  });
});
