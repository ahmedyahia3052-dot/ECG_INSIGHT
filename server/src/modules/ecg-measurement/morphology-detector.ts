import type { MorphologyFlag } from "./types";
import { leadSamples } from "./fiducial-detector";

function peakAmplitude(samples: number[], start: number, end: number) {
  const segment = samples.slice(Math.max(0, start), Math.min(samples.length, end + 1));
  if (!segment.length) return 0;
  return Math.max(...segment.map(Math.abs));
}

function minAmplitude(samples: number[], start: number, end: number) {
  const segment = samples.slice(Math.max(0, start), Math.min(samples.length, end + 1));
  if (!segment.length) return 0;
  return Math.min(...segment);
}

export function detectMorphology(
  leads: Array<{ lead: string; samples: number[] }>,
  qrsDurationMs: number,
  qrsOnset: number,
  qrsOffset: number,
  gainMmPerMv: number,
): MorphologyFlag[] {
  const flags: MorphologyFlag[] = [];
  if (qrsDurationMs >= 120) flags.push("wide_qrs");
  else flags.push("narrow_qrs");

  const v1 = leadSamples(leads, "V1");
  const v2 = leadSamples(leads, "V2");
  const v3 = leadSamples(leads, "V3");
  const v4 = leadSamples(leads, "V4");
  const v5 = leadSamples(leads, "V5");
  const v6 = leadSamples(leads, "V6");
  const rV1 = peakAmplitude(v1, qrsOnset, qrsOffset);
  const rV2 = peakAmplitude(v2, qrsOnset, qrsOffset);
  const rV3 = peakAmplitude(v3, qrsOnset, qrsOffset);
  const rV4 = peakAmplitude(v4, qrsOnset, qrsOffset);
  const rV5 = peakAmplitude(v5, qrsOnset, qrsOffset);
  const rV6 = peakAmplitude(v6, qrsOnset, qrsOffset);
  if (!(rV3 > rV2 && rV4 > rV3 && rV5 > rV4)) flags.push("poor_r_progression");

  const pathologicalQ = ["II", "III", "aVF", "V1", "V2", "V3"].some((leadName) => {
    const samples = leadSamples(leads, leadName);
    const qDepth = Math.abs(minAmplitude(samples, qrsOnset, qrsOffset));
    const rHeight = peakAmplitude(samples, qrsOnset, qrsOffset);
    return qDepth > 0.25 * Math.max(rHeight, 0.05) && qDepth > 0.05;
  });
  if (pathologicalQ) flags.push("pathological_q_waves");

  const limbLeads = ["I", "II", "III", "aVR", "aVL", "aVF"].map((leadName) => peakAmplitude(leadSamples(leads, leadName), qrsOnset, qrsOffset));
  if (limbLeads.every((value) => value < 0.5)) flags.push("low_voltage");

  const sV1 = Math.abs(minAmplitude(v1, qrsOnset, qrsOffset));
  const maxPrecordialR = Math.max(rV5, rV6);
  if (sV1 + maxPrecordialR > 3.5) flags.push("lvh_criteria");
  if (rV1 > 0.7 || (Math.abs(minAmplitude(v1, qrsOnset, qrsOffset)) > 0 && rV1 / Math.max(Math.abs(minAmplitude(v1, qrsOnset, qrsOffset)), 0.01) > 1)) {
    flags.push("rvh_criteria");
  }

  void gainMmPerMv;
  return flags;
}

export function classifyRWaveProgression(
  leads: Array<{ lead: string; samples: number[] }>,
  qrsOnset: number,
  qrsOffset: number,
): "normal" | "poor" | "reverse" {
  const values = ["V1", "V2", "V3", "V4", "V5", "V6"].map((leadName) =>
    peakAmplitude(leadSamples(leads, leadName), qrsOnset, qrsOffset),
  );
  if (values[5] < values[0]) return "reverse";
  if (!(values[2] > values[1] && values[3] > values[2])) return "poor";
  return "normal";
}
