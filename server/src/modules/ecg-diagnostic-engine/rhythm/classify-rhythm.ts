import { coefficientOfVariation, rrIntervalsMs } from "../wave-detection/detect-waves";
import type { EnterpriseMeasurementBundle, EnterpriseRhythmClass, MorphologyClass, RhythmEvidence, RhythmResult } from "../types";

function evidence(feature: string, value: string | number): RhythmEvidence {
  return { feature, value };
}

function supportingMeasurements(measurements: EnterpriseMeasurementBundle): Record<string, number> {
  return {
    heartRateBpm: measurements.heartRateBpm,
    prIntervalMs: measurements.prIntervalMs,
    qrsDurationMs: measurements.qrsDurationMs,
    rrIntervalMs: measurements.rrIntervalMs,
  };
}

function countPrematureBeats(rrIntervals: number[]): { premature: number; pattern: "none" | "bigeminy" | "trigeminy" } {
  if (rrIntervals.length < 3) return { pattern: "none", premature: 0 };
  const mean = rrIntervals.reduce((sum, value) => sum + value, 0) / rrIntervals.length;
  let premature = 0;
  for (const rr of rrIntervals) {
    if (rr < mean * 0.82) premature += 1;
  }
  const shortLong = rrIntervals.slice(0, -1).every((rr, index) => {
    const next = rrIntervals[index + 1] ?? rr;
    return (rr < mean * 0.85 && next > mean * 1.05) || (next < mean * 0.85 && rr > mean * 1.05);
  });
  if (premature >= 2 && shortLong) return { pattern: "bigeminy", premature };
  const everyThirdShort = rrIntervals.filter((rr, index) => index % 3 === 1 && rr < mean * 0.85).length >= 2;
  if (everyThirdShort) return { pattern: "trigeminy", premature };
  return { pattern: "none", premature };
}

export function classifyRhythmEnterprise(
  measurements: EnterpriseMeasurementBundle,
  morphology: MorphologyClass[],
  rPeaks: number[],
  samplingRate: number,
): RhythmResult {
  const rrList = rrIntervalsMs(rPeaks, samplingRate);
  const rrMs = measurements.rrIntervalMs;
  const heartRate = measurements.heartRateBpm;
  const cv = coefficientOfVariation(rrList.length ? rrList : [rrMs]);
  const irregular = cv > 0.12;
  const wideQrs = measurements.qrsDurationMs >= 120;
  const narrowQrs = measurements.qrsDurationMs < 120;
  const premature = countPrematureBeats(rrList);

  let classification: EnterpriseRhythmClass = "unknown_rhythm";
  let confidence = 0.45;
  const ev: RhythmEvidence[] = [
    evidence("Heart Rate", `${heartRate} bpm`),
    evidence("RR interval", `${rrMs} ms`),
    evidence("RR variability CV", Number(cv.toFixed(3))),
  ];

  if (measurements.prIntervalMs >= 200) {
    classification = "first_degree_av_block";
    confidence = 0.82;
    ev.push(evidence("PR interval", `${measurements.prIntervalMs} ms`));
  } else if (measurements.prIntervalMs >= 260 && irregular) {
    classification = "second_degree_av_block";
    confidence = 0.58;
  } else if (heartRate >= 20 && heartRate <= 45 && wideQrs && measurements.pWaveAmplitudeMv < 0.04) {
    classification = "third_degree_av_block";
    confidence = 0.62;
    ev.push(evidence("AV dissociation pattern", "Suggested by wide QRS escape"));
  } else if (!irregular && heartRate >= 150 && narrowQrs) {
    classification = "supraventricular_tachycardia";
    confidence = 0.74;
  } else if (!irregular && heartRate >= 100 && heartRate < 150 && narrowQrs) {
    classification = heartRate >= 130 && heartRate <= 170 ? "atrial_flutter" : "sinus_tachycardia";
    confidence = classification === "atrial_flutter" ? 0.66 : 0.8;
  } else if (!irregular && heartRate >= 100 && narrowQrs) {
    classification = "sinus_tachycardia";
    confidence = 0.78;
  } else if (!irregular && heartRate < 60 && heartRate >= 40 && narrowQrs) {
    classification = measurements.pWaveAmplitudeMv < 0.05 && measurements.prIntervalMs < 120
      ? "junctional_rhythm"
      : "sinus_bradycardia";
    confidence = 0.76;
  } else if (!irregular && heartRate < 40 && wideQrs) {
    classification = "escape_rhythm";
    confidence = 0.7;
  } else if (!irregular && wideQrs && heartRate >= 100 && heartRate <= 220) {
    classification = "ventricular_tachycardia";
    confidence = 0.72;
  } else if (heartRate >= 300 || (irregular && wideQrs && cv > 0.35)) {
    classification = "ventricular_fibrillation";
    confidence = 0.55;
  } else if (irregular && heartRate >= 90 && cv > 0.18 && narrowQrs) {
    classification = "atrial_fibrillation";
    confidence = 0.76;
  } else if (irregular && narrowQrs && premature.premature >= 1) {
    classification = "premature_atrial_contraction";
    confidence = 0.64;
  } else if (irregular && wideQrs && morphology.includes("wide_qrs")) {
    classification = "premature_ventricular_contraction";
    confidence = 0.68;
  } else if (premature.pattern === "bigeminy") {
    classification = "bigeminy";
    confidence = 0.7;
  } else if (premature.pattern === "trigeminy") {
    classification = "trigeminy";
    confidence = 0.68;
  } else if (!irregular && heartRate >= 60 && heartRate <= 100 && narrowQrs) {
    classification = "normal_sinus_rhythm";
    confidence = 0.88;
  }

  return {
    classification,
    confidence: Number(confidence.toFixed(3)),
    evidence: ev,
    supportingMeasurements: supportingMeasurements(measurements),
  };
}
