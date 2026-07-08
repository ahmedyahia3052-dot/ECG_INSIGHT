import { evaluateClinicalRules, toStructuredFindings } from "./clinical-rules/evaluate-rules";
import { scoreConfidence } from "./confidence/score-confidence";
import { computeMeasurements } from "./measurement/compute-measurements";
import { classifyMorphology, qrsWindowFromWave } from "./morphology/classify-morphology";
import { classifyRhythmEnterprise } from "./rhythm/classify-rhythm";
import { preprocessLead } from "./signal/signal-processing";
import {
  DIAGNOSTIC_ENGINE_VERSION,
  type DiagnosticPipelineInput,
  type DiagnosticPipelineResult,
} from "./types";
import { detectWaves } from "./wave-detection/detect-waves";

async function preprocessLeadsParallel(
  leads: DiagnosticPipelineInput["leads"],
  powerlineHz: 50 | 60,
): Promise<Array<{ lead: string; samples: number[]; samplingRate: number }>> {
  return Promise.all(leads.map(async (lead) => {
    const processed = preprocessLead(lead.samples, lead.samplingRate, powerlineHz);
    return {
      lead: lead.lead,
      samples: processed.samples,
      samplingRate: lead.samplingRate,
    };
  }));
}

export async function runDiagnosticPipeline(input: DiagnosticPipelineInput): Promise<DiagnosticPipelineResult> {
  const started = performance.now();
  const powerlineHz = input.powerlineHz ?? 50;
  const primaryLeadName = input.leads.find((lead) => lead.lead === "II")?.lead ?? input.leads[0]?.lead ?? "II";

  const filteredLeads = await preprocessLeadsParallel(input.leads, powerlineHz);
  const primaryLead = filteredLeads.find((lead) => lead.lead === primaryLeadName) ?? filteredLeads[0];
  if (!primaryLead?.samples.length) {
    return emptyPipelineResult(performance.now() - started);
  }

  const preprocessed = preprocessLead(
    input.leads.find((lead) => lead.lead === primaryLead.lead)?.samples ?? primaryLead.samples,
    primaryLead.samplingRate,
    powerlineHz,
  );

  const waveDetection = detectWaves(preprocessed.samples, primaryLead.samplingRate, {
    baselineCorrected: preprocessed.baselineCorrected,
    lead: primaryLead.lead,
    powerlineFiltered: preprocessed.powerlineFiltered,
  });

  const measurements = computeMeasurements(filteredLeads, waveDetection, input.calibration.gainMmPerMv);
  const beat = waveDetection.beats[0];
  const qrsWindow = qrsWindowFromWave(beat?.rPeak ?? 0, primaryLead.samplingRate);
  const morphology = classifyMorphology(filteredLeads, measurements, qrsWindow.onset, qrsWindow.offset);
  const rhythm = classifyRhythmEnterprise(
    measurements,
    morphology,
    waveDetection.rPeaks,
    primaryLead.samplingRate,
  );
  const clinicalFindings = evaluateClinicalRules(measurements, rhythm, morphology);
  const confidence = scoreConfidence(measurements, waveDetection, rhythm, morphology, clinicalFindings);
  const structuredFindings = toStructuredFindings(clinicalFindings);

  return {
    clinicalFindings,
    confidence,
    filteredLeads,
    measurements,
    morphology,
    performanceMs: Number((performance.now() - started).toFixed(2)),
    rhythm,
    structuredFindings,
    version: DIAGNOSTIC_ENGINE_VERSION,
    waveDetection,
  };
}

export function runDiagnosticPipelineSync(input: DiagnosticPipelineInput): DiagnosticPipelineResult {
  const started = performance.now();
  const powerlineHz = input.powerlineHz ?? 50;
  const primaryLeadName = input.leads.find((lead) => lead.lead === "II")?.lead ?? input.leads[0]?.lead ?? "II";

  const filteredLeads = input.leads.map((lead) => {
    const processed = preprocessLead(lead.samples, lead.samplingRate, powerlineHz);
    return { lead: lead.lead, samples: processed.samples, samplingRate: lead.samplingRate };
  });

  const primaryLead = filteredLeads.find((lead) => lead.lead === primaryLeadName) ?? filteredLeads[0];
  if (!primaryLead?.samples.length) {
    return emptyPipelineResult(performance.now() - started);
  }

  const preprocessed = preprocessLead(
    input.leads.find((lead) => lead.lead === primaryLead.lead)?.samples ?? primaryLead.samples,
    primaryLead.samplingRate,
    powerlineHz,
  );

  const waveDetection = detectWaves(preprocessed.samples, primaryLead.samplingRate, {
    baselineCorrected: preprocessed.baselineCorrected,
    lead: primaryLead.lead,
    powerlineFiltered: preprocessed.powerlineFiltered,
  });

  const measurements = computeMeasurements(filteredLeads, waveDetection, input.calibration.gainMmPerMv);
  const beat = waveDetection.beats[0];
  const qrsWindow = qrsWindowFromWave(beat?.rPeak ?? 0, primaryLead.samplingRate);
  const morphology = classifyMorphology(filteredLeads, measurements, qrsWindow.onset, qrsWindow.offset);
  const rhythm = classifyRhythmEnterprise(
    measurements,
    morphology,
    waveDetection.rPeaks,
    primaryLead.samplingRate,
  );
  const clinicalFindings = evaluateClinicalRules(measurements, rhythm, morphology);
  const confidence = scoreConfidence(measurements, waveDetection, rhythm, morphology, clinicalFindings);
  const structuredFindings = toStructuredFindings(clinicalFindings);

  return {
    clinicalFindings,
    confidence,
    filteredLeads,
    measurements,
    morphology,
    performanceMs: Number((performance.now() - started).toFixed(2)),
    rhythm,
    structuredFindings,
    version: DIAGNOSTIC_ENGINE_VERSION,
    waveDetection,
  };
}

function emptyMeasurementBundle(): import("./types").EnterpriseMeasurementBundle {
  return {
    atrialActivity: "absent",
    bundleBranchIndicators: [],
    electricalAxisDeg: 0,
    heartRateBpm: 0,
    jPointMm: 0,
    lvhVoltageCriteria: false,
    meanElectricalAxisDeg: 0,
    pAxisDeg: 0,
    pDurationMs: 0,
    pWaveAmplitudeMv: 0,
    prIntervalMs: 0,
    qrsAmplitudeMv: 0,
    qrsAxisDeg: 0,
    qrsDurationMs: 0,
    qtDispersionMs: 0,
    qtcBazettMs: 0,
    qtcFridericiaMs: 0,
    qtIntervalMs: 0,
    rProgression: "normal",
    rWaveAmplitudeMv: 0,
    rrIntervalMs: 0,
    rvhVoltageCriteria: false,
    sWaveAmplitudeMv: 0,
    stDepressionMm: 0,
    stDeviationMm: 0,
    stElevationMm: 0,
    tAxisDeg: 0,
    tInversion: false,
    tWaveAmplitudeMv: 0,
    transitionZone: "V3",
    ventricularActivity: "regular",
    voltageMv: 0,
  };
}

function emptyPipelineResult(performanceMs: number): DiagnosticPipelineResult {
  return {
    clinicalFindings: [],
    confidence: {
      diagnosticCertainty: "uncertain",
      measurementConfidence: 0,
      morphologyConfidence: 0,
      overall: 0,
      reasons: ["Insufficient digitized waveform data."],
      rhythmConfidence: 0,
      rulesConfidence: 0,
    },
    filteredLeads: [],
    measurements: emptyMeasurementBundle(),
    morphology: [],
    performanceMs,
    rhythm: {
      classification: "unknown_rhythm",
      confidence: 0,
      evidence: [],
      supportingMeasurements: {},
    },
    structuredFindings: [],
    version: DIAGNOSTIC_ENGINE_VERSION,
    waveDetection: {
      adaptiveThreshold: 0,
      baselineCorrected: false,
      beats: [],
      filteredLead: "II",
      powerlineFiltered: false,
      rPeaks: [],
    },
  };
}
