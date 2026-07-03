import type { EcgMeasurementAxis } from "./types";
import { leadSamples } from "./fiducial-detector";

function netQrsAmplitude(samples: number[], qrsOnset: number, qrsOffset: number) {
  const segment = samples.slice(Math.max(0, qrsOnset), Math.min(samples.length, qrsOffset + 1));
  if (!segment.length) return 0;
  return Math.max(...segment) - Math.min(...segment);
}

function signedNet(samples: number[], qrsOnset: number, qrsOffset: number) {
  const segment = samples.slice(Math.max(0, qrsOnset), Math.min(samples.length, qrsOffset + 1));
  if (!segment.length) return 0;
  const max = Math.max(...segment);
  const min = Math.min(...segment);
  return max + min >= 0 ? max : min;
}

export function calculateAxis(
  leads: Array<{ lead: string; samples: number[] }>,
  qrsOnset: number,
  qrsOffset: number,
): EcgMeasurementAxis {
  const leadI = leadSamples(leads, "I");
  const leadAvf = leadSamples(leads, "aVF");
  const leadII = leadSamples(leads, "II");
  const netI = signedNet(leadI, qrsOnset, qrsOffset) || netQrsAmplitude(leadII, qrsOnset, qrsOffset);
  const netAvf = signedNet(leadAvf, qrsOnset, qrsOffset) || netQrsAmplitude(leadII, qrsOnset, qrsOffset) * 0.75;
  const axisRad = Math.atan2(netAvf, netI);
  const axisDeg = Number((axisRad * (180 / Math.PI)).toFixed(1));
  const normalized = ((axisDeg % 360) + 360) % 360;
  const frontal = normalized > 180 ? normalized - 360 : normalized;
  return {
    electricalAxisDeg: frontal,
    frontalPlaneAxisDeg: frontal,
    meanQrsAxisDeg: frontal,
  };
}
