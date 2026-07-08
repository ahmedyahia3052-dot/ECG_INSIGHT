import { describe, expect, it } from "vitest";

import { buildCardiologistModelFromSources } from "@/components/ecg/viewer/ai-cardiologist/buildCardiologistModel";

describe("buildCardiologistModel", () => {
  it("builds structured model from digitized ECG and analysis", () => {
    const model = buildCardiologistModelFromSources(
      {
        confidenceScore: 0.88,
        diagnosis: "Normal sinus rhythm",
        heartRate: 72,
        interpretation: "No acute ischemia.",
        rhythm: "sinus",
        severity: "normal",
        urgentActions: [],
      },
      null,
      {
        measurementEngine: {
          amplitudes: { pWaveAmplitudeMv: 0.1, stDeviationMm: 0.2 },
          axis: { meanQrsAxisDeg: 55 },
          confidence: 0.85,
          heartRate: 72,
          intervals: { prIntervalMs: 160, qrsDurationMs: 90, qtIntervalMs: 380, qtcBazettMs: 410, rrIntervalMs: 830 },
          rhythm: "sinus",
        },
        quality: { score: 0.92 },
        status: "available",
        validation: { digitizationAccuracy: 91, leadDetectionPercent: 100, signalContinuityPercent: 96 },
      } as never,
      null,
    );

    expect(model.loaded).toBe(true);
    expect(model.primaryDiagnosis.label).toBe("Normal sinus rhythm");
    expect(model.rhythm.heartRate).toBe(72);
    expect(model.intervals.find((i) => i.name === "PR")?.status).toBe("normal");
    expect(model.waveAnalysis.length).toBeGreaterThan(0);
    expect(model.confidence.overall).toBeGreaterThan(0);
  });

  it("returns pending state when no sources provided", () => {
    const model = buildCardiologistModelFromSources(null, null, null, null);
    expect(model.loaded).toBe(false);
    expect(model.primaryDiagnosis.label).toContain("Pending");
  });
});
