import { leadSamples, peakAmplitudeHelper } from "./helpers";
import type { EnterpriseMeasurementBundle, MorphologyClass } from "../types";

function peakAmplitude(samples: number[], start: number, end: number): number {
  return peakAmplitudeHelper(samples, start, end);
}

function minAmplitude(samples: number[], start: number, end: number): number {
  const segment = samples.slice(Math.max(0, start), Math.min(samples.length, end + 1));
  if (!segment.length) return 0;
  return Math.min(...segment);
}

export function classifyMorphology(
  leads: Array<{ lead: string; samples: number[] }>,
  measurements: EnterpriseMeasurementBundle,
  qrsOnset: number,
  qrsOffset: number,
): MorphologyClass[] {
  const flags = new Set<MorphologyClass>();
  if (measurements.qrsDurationMs >= 120) flags.add("wide_qrs");
  else flags.add("narrow_qrs");

  if (measurements.qrsDurationMs >= 120 && measurements.bundleBranchIndicators.length) {
    flags.add("bbb_morphology");
    flags.add("bundle_branch_block");
  }

  if (measurements.rProgression === "poor" || measurements.rProgression === "reverse") {
    flags.add("poor_r_progression");
  } else {
    flags.add("normal");
  }

  const pathologicalQ = ["II", "III", "aVF", "V1", "V2", "V3"].some((leadName) => {
    const samples = leadSamples(leads, leadName);
    const qDepth = Math.abs(minAmplitude(samples, qrsOnset, qrsOffset));
    const rHeight = peakAmplitude(samples, qrsOnset, qrsOffset);
    return qDepth > 0.25 * Math.max(rHeight, 0.05) && qDepth > 0.05;
  });
  if (pathologicalQ) flags.add("pathological_q");

  if (measurements.voltageMv < 0.5) flags.add("voltage_abnormality");
  if (measurements.lvhVoltageCriteria) flags.add("lvh_voltage");
  if (measurements.rvhVoltageCriteria) flags.add("rvh_voltage");

  if (measurements.stElevationMm > 1 || measurements.stDepressionMm > 0.5) {
    flags.add("st_morphology_abnormal");
  }
  if (measurements.tInversion) flags.add("t_morphology_abnormal");
  if (measurements.pWaveAmplitudeMv < 0.04 && measurements.prIntervalMs < 120) {
    flags.add("p_morphology_abnormal");
  }

  const v1 = leadSamples(leads, "V1");
  const deltaCandidate = peakAmplitude(v1, Math.max(0, qrsOnset - 20), qrsOnset) > 0.15
    && measurements.prIntervalMs < 120;
  if (deltaCandidate) flags.add("delta_wave");

  const qrsSegmentWidth = qrsOffset - qrsOnset;
  if (qrsSegmentWidth > 0) {
    let directionChanges = 0;
    const leadII = leadSamples(leads, "II");
    const segment = leadII.slice(qrsOnset, qrsOffset + 1);
    for (let index = 1; index < segment.length - 1; index += 1) {
      const prev = (segment[index] ?? 0) - (segment[index - 1] ?? 0);
      const next = (segment[index + 1] ?? 0) - (segment[index] ?? 0);
      if (Math.sign(prev) !== Math.sign(next)) directionChanges += 1;
    }
    if (directionChanges >= 4) flags.add("fragmented_qrs");
  }

  return [...flags];
}

export function qrsWindowFromWave(rPeak: number, samplingRate: number): { onset: number; offset: number } {
  const msToSamples = (ms: number) => Math.round((ms / 1000) * samplingRate);
  return {
    onset: Math.max(0, rPeak - msToSamples(40)),
    offset: rPeak + msToSamples(45),
  };
}

export function stMorphologyLabel(measurements: EnterpriseMeasurementBundle): string {
  if (measurements.stElevationMm > 1) return "st_elevation";
  if (measurements.stDepressionMm > 0.5) return "st_depression";
  return "st_normal";
}

export function tMorphologyLabel(measurements: EnterpriseMeasurementBundle): string {
  if (measurements.tInversion) return "t_inversion";
  if (measurements.tWaveAmplitudeMv > 1.2) return "t_tall";
  return "t_normal";
}
