import type { DigitalEcg, EcgAiDiagnosis, EcgClinicalInterpretation, EcgClinicalMeasurements } from "@/services/ecgProcessing";
import type { EcgViewerWaveformDto } from "@/services/ecgViewerApi";

import type { EcgGridGain, EcgPaperSpeed } from "../types";

function emptyAiDiagnosis(): EcgAiDiagnosis {
  return {
    agreementWithRules: 0,
    clinicalReasoning: "",
    confidence: 0,
    disagreementExplanation: "",
    ensembleSources: [],
    evidence: [],
    markdownReport: "",
    primaryDiagnosis: "Pending",
    recommendations: [],
    topDiagnoses: [],
    urgency: "normal",
  };
}

function emptyInterpretation(): EcgClinicalInterpretation {
  return {
    confidence: 0,
    findings: [],
    markdownReport: "",
    measurementsUsed: {},
    primaryDiagnosis: "Pending",
    recommendations: [],
    report: {
      confidence: 0,
      evidence: [],
      findings: [],
      measurementsUsed: {},
      recommendations: [],
      summary: "",
      urgency: "normal",
    },
    severity: "normal",
    urgency: "normal",
  };
}

function emptyMeasurements(): EcgClinicalMeasurements {
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

export function buildDigitalEcgFromWaveforms(
  waveforms: EcgViewerWaveformDto[],
  paper: { gain: EcgGridGain; speed: EcgPaperSpeed },
): DigitalEcg | null {
  if (!waveforms.length) return null;
  const leads = waveforms.map((entry) => ({
    durationSeconds: entry.durationSeconds,
    lead: entry.lead,
    samples: entry.samples,
    samplingRate: entry.samplingRate,
  }));
  const durationSeconds = Math.max(...leads.map((lead) => lead.durationSeconds), 0);
  return {
    aiDiagnosis: emptyAiDiagnosis(),
    annotations: [],
    calibration: {
      confidence: 1,
      gainMmPerMv: paper.gain,
      gridDetected: true,
      paperSpeedMmPerSec: paper.speed,
    },
    durationSeconds,
    ecgFileId: waveforms[0]?.ecgFileId,
    leadSegments: [],
    leads,
    interpretationEngine: emptyInterpretation(),
    measurementEngine: emptyMeasurements(),
    measurements: {
      heartRate: 0,
      prIntervalMs: 0,
      qrsDurationMs: 0,
      qtIntervalMs: 0,
      qtcBazettMs: 0,
      rrIntervalMs: 0,
    },
    quality: { score: 1, warnings: [] },
    status: "available",
  };
}
