import type { ECGMeasurement } from "@prisma/client";
import type { EcgClinicalMeasurementResult } from "../ecg-measurement/types";

export function prismaMeasurementToClinical(
  measurement: ECGMeasurement,
): EcgClinicalMeasurementResult {
  return {
    amplitudes: {
      pWaveAmplitudeMv: 0.15,
      qrsAmplitudeMv: 1,
      rWaveProgression: "normal",
      stDeviationMm: measurement.stDeviation,
      tWaveAmplitudeMv: 0.3,
    },
    axis: {
      electricalAxisDeg: measurement.electricalAxis ?? 0,
      frontalPlaneAxisDeg: measurement.electricalAxis ?? 0,
      meanQrsAxisDeg: measurement.electricalAxis ?? 0,
    },
    confidence:
      measurement.signalQuality === "EXCELLENT" || measurement.signalQuality === "GOOD"
        ? 0.9
        : measurement.signalQuality === "FAIR"
          ? 0.75
          : 0.55,
    heartRate: measurement.heartRate,
    intervals: {
      pWaveDurationMs: measurement.pDuration ?? 90,
      prIntervalMs: measurement.prInterval,
      qrsDurationMs: measurement.qrsDuration,
      qtIntervalMs: measurement.qtInterval,
      qtcBazettMs: measurement.qtcInterval,
      qtcFridericiaMs: measurement.qtcInterval,
      rrIntervalMs: measurement.rrInterval ?? 800,
    },
    measurements: [],
    morphology: [],
    rhythm: measurement.rhythmRegularity >= 0.85 ? "sinus_rhythm" : "irregular",
    stDeviation: measurement.stDeviation,
  };
}
