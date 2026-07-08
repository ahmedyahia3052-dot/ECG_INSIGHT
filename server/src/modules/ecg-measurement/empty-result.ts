import type { GridCalibration } from "../ecg-digitization/types";
import type { EcgClinicalMeasurementResult } from "./types";

export function emptyMeasurementResult(): EcgClinicalMeasurementResult {
  return {
    amplitudes: {
      pWaveAmplitudeMv: 0,
      qrsAmplitudeMv: 0,
      rWaveProgression: "normal",
      stDeviationMm: 0,
      tWaveAmplitudeMv: 0,
    },
    axis: { electricalAxisDeg: 0, frontalPlaneAxisDeg: 0, meanQrsAxisDeg: 0 },
    confidence: 0,
    heartRate: 0,
    intervals: {
      pWaveDurationMs: 0,
      prIntervalMs: 0,
      qrsDurationMs: 0,
      qtIntervalMs: 0,
      qtcBazettMs: 0,
      qtcFridericiaMs: 0,
      rrIntervalMs: 0,
    },
    measurements: [],
    morphology: [],
    rhythm: "regular",
    stDeviation: 0,
  };
}

export function serializeMeasurementSummary(result: EcgClinicalMeasurementResult, calibration: GridCalibration) {
  return {
    amplitudes: result.amplitudes,
    axis: result.axis,
    confidence: result.confidence,
    heartRate: result.heartRate,
    intervals: result.intervals,
    measurements: result.measurements,
    morphology: result.morphology,
    rhythm: result.rhythm,
    stDeviation: result.stDeviation,
    units: {
      gainMmPerMv: calibration.gainMmPerMv,
      paperSpeedMmPerSec: calibration.paperSpeedMmPerSec,
    },
  };
}
