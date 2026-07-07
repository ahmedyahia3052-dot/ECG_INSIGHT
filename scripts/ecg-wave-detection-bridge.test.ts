import assert from "node:assert/strict";

import { detectWaveFiducials, horizontalMsBetweenPoints, msToImageX } from "../artifacts/ecg-insight/components/ecg/viewer/ecgWaveDetectionBridge";
import { MEASUREMENT_PRECISION, withinPixelTolerance } from "../artifacts/ecg-insight/components/ecg/viewer/ecgLiveMeasurements";
import type { DigitalEcg } from "../artifacts/ecg-insight/services/ecgProcessing";

const sampleDigitalEcg: DigitalEcg = {
  aiDiagnosis: {
    agreementWithRules: 0.8,
    clinicalReasoning: "Sample",
    confidence: 0.82,
    disagreementExplanation: "",
    ensembleSources: ["rules"],
    evidence: [],
    markdownReport: "",
    primaryDiagnosis: "Normal sinus rhythm",
    recommendations: [],
    topDiagnoses: [],
    urgency: "normal",
  },
  annotations: [],
  calibration: { confidence: 0.9, gainMmPerMv: 10, gridDetected: true, paperSpeedMmPerSec: 25 },
  durationSeconds: 10,
  interpretationEngine: {
    confidence: 0.8,
    findings: [],
    markdownReport: "",
    measurementsUsed: {},
    primaryDiagnosis: "Normal sinus rhythm",
    recommendations: [],
    report: { confidence: 0.8, evidence: [], findings: [], measurementsUsed: {}, recommendations: [], summary: "", urgency: "normal" },
    severity: "normal",
    urgency: "normal",
  },
  leadSegments: [],
  leads: [],
  measurementEngine: {
    amplitudes: { pWaveAmplitudeMv: 0.1, qrsAmplitudeMv: 1.2, rWaveProgression: "normal", stDeviationMm: 0, tWaveAmplitudeMv: 0.3 },
    axis: { electricalAxisDeg: 60, frontalPlaneAxisDeg: 60, meanQrsAxisDeg: 60 },
    confidence: 0.86,
    heartRate: 75,
    intervals: {
      pWaveDurationMs: 90,
      prIntervalMs: 160,
      qrsDurationMs: 90,
      qtIntervalMs: 380,
      qtcBazettMs: 410,
      qtcFridericiaMs: 405,
      rrIntervalMs: 800,
    },
    measurements: [],
    morphology: [],
    rhythm: "sinus_rhythm",
    stDeviation: 0,
  },
  measurements: {
    heartRate: 75,
    prIntervalMs: 160,
    qrsDurationMs: 90,
    qtIntervalMs: 380,
    qtcBazettMs: 410,
    rrIntervalMs: 800,
  },
};

const grid = { customCalibration: false, gain: 10 as const, opacity: 0.75, speed: 25 as const, visible: true };
const region = { width: 400, x: 100 };

const fiducials = detectWaveFiducials(sampleDigitalEcg, "II");
assert(fiducials.length >= 8, "Wave detection must identify P/Q/R/S/T fiducials");
assert(fiducials.some((item) => item.type === "R"), "Wave detection must include R peak");

const x0 = msToImageX(0, grid, region);
const x160 = msToImageX(160, grid, region);
const ms = horizontalMsBetweenPoints({ x: x0, y: 0 }, { x: x160, y: 0 }, grid);
assert(Math.abs(ms - 160) <= MEASUREMENT_PRECISION.qtMsTolerance + 2, `PR ms conversion expected ~160 got ${ms}`);

assert(withinPixelTolerance(10.4, 10), "Pixel tolerance must accept ±0.5 px");

console.log("ecg-wave-detection-bridge.test.ts: all Sprint 34 wave bridge checks passed");
