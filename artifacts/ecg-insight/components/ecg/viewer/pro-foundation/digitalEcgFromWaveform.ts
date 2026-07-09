import type { DigitalEcg, EcgAiDiagnosis, EcgClinicalInterpretation, EcgClinicalMeasurements } from "@/services/ecgProcessing";
import type { EcgViewerWaveformDto } from "@/services/ecgViewerApi";

import type { EcgGridGain, EcgPaperSpeed } from "../types";

export type DigitalEcgClinicalSeed = {
  aiDiagnosis?: string;
  confidence?: number;
  electricalAxisDeg?: number;
  heartRate?: number;
  pWaveDurationMs?: number;
  prIntervalMs?: number;
  qrsDurationMs?: number;
  qtIntervalMs?: number;
  qtcIntervalMs?: number;
  rrIntervalMs?: number;
  stDeviationMm?: number;
  tWaveDurationMs?: number;
};

function buildAiDiagnosis(seed?: DigitalEcgClinicalSeed): EcgAiDiagnosis {
  const diagnosis = seed?.aiDiagnosis?.trim();
  return {
    agreementWithRules: seed?.confidence ?? 0,
    clinicalReasoning: diagnosis ? "Derived from case clinical record." : "",
    confidence: seed?.confidence ?? 0,
    disagreementExplanation: "",
    ensembleSources: [],
    evidence: diagnosis ? [diagnosis] : [],
    markdownReport: diagnosis ?? "",
    primaryDiagnosis: diagnosis || "Unavailable",
    recommendations: [],
    topDiagnoses: diagnosis
      ? [
          {
            agreementWithRules: seed?.confidence ?? 0,
            confidence: seed?.confidence ?? 0,
            evidence: [diagnosis],
            label: diagnosis,
            probability: seed?.confidence ?? 0,
            source: "measurement" as const,
          },
        ]
      : [],
    urgency: "normal",
  };
}

function buildInterpretation(seed?: DigitalEcgClinicalSeed): EcgClinicalInterpretation {
  const diagnosis = seed?.aiDiagnosis?.trim() || "Unavailable";
  return {
    confidence: seed?.confidence ?? 0,
    findings: [],
    markdownReport: diagnosis,
    measurementsUsed: {},
    primaryDiagnosis: diagnosis,
    recommendations: [],
    report: {
      confidence: seed?.confidence ?? 0,
      evidence: [],
      findings: [],
      measurementsUsed: {},
      recommendations: [],
      summary: diagnosis,
      urgency: "normal",
    },
    severity: "normal",
    urgency: "normal",
  };
}

function buildMeasurements(seed?: DigitalEcgClinicalSeed): EcgClinicalMeasurements {
  const heartRate = seed?.heartRate ?? 0;
  const rrIntervalMs = seed?.rrIntervalMs ?? (heartRate > 0 ? Math.round(60_000 / heartRate) : 0);
  return {
    amplitudes: {
      pWaveAmplitudeMv: 0,
      qrsAmplitudeMv: 0,
      rWaveProgression: "normal",
      stDeviationMm: seed?.stDeviationMm ?? 0,
      tWaveAmplitudeMv: 0,
    },
    axis: {
      electricalAxisDeg: seed?.electricalAxisDeg ?? 0,
      frontalPlaneAxisDeg: seed?.electricalAxisDeg ?? 0,
      meanQrsAxisDeg: seed?.electricalAxisDeg ?? 0,
    },
    confidence: seed?.confidence ?? 0,
    heartRate,
    intervals: {
      pWaveDurationMs: seed?.pWaveDurationMs ?? 0,
      prIntervalMs: seed?.prIntervalMs ?? 0,
      qrsDurationMs: seed?.qrsDurationMs ?? 0,
      qtIntervalMs: seed?.qtIntervalMs ?? 0,
      qtcBazettMs: seed?.qtcIntervalMs ?? 0,
      qtcFridericiaMs: 0,
      rrIntervalMs,
    },
    measurements: [],
    morphology: [],
    rhythm: "regular",
    stDeviation: seed?.stDeviationMm ?? 0,
  };
}

export function buildDigitalEcgFromWaveforms(
  waveforms: EcgViewerWaveformDto[],
  paper: { gain: EcgGridGain; speed: EcgPaperSpeed },
  clinical?: DigitalEcgClinicalSeed | null,
): DigitalEcg | null {
  if (!waveforms.length) return null;
  const leads = waveforms.map((entry) => ({
    durationSeconds: entry.durationSeconds,
    lead: entry.lead,
    samples: entry.samples,
    samplingRate: entry.samplingRate,
  }));
  const durationSeconds = Math.max(...leads.map((lead) => lead.durationSeconds), 0);
  const measurementEngine = buildMeasurements(clinical ?? undefined);
  return {
    aiDiagnosis: buildAiDiagnosis(clinical ?? undefined),
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
    interpretationEngine: buildInterpretation(clinical ?? undefined),
    measurementEngine,
    measurements: {
      heartRate: measurementEngine.heartRate,
      prIntervalMs: measurementEngine.intervals.prIntervalMs,
      qrsDurationMs: measurementEngine.intervals.qrsDurationMs,
      qtIntervalMs: measurementEngine.intervals.qtIntervalMs,
      qtcBazettMs: measurementEngine.intervals.qtcBazettMs,
      rrIntervalMs: measurementEngine.intervals.rrIntervalMs,
    },
    quality: { score: 1, warnings: [] },
    status: "available",
  };
}
