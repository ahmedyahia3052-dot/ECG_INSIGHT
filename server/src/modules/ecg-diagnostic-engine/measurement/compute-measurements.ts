import {
  clamp,
  leadSamples,
  msToSamples,
  samplesToMs,
} from "../signal/signal-processing";
import type { DetectedWave, EnterpriseMeasurementBundle, WaveDetectionResult } from "../types";
import { averageRrIntervalMs, heartRateFromRr } from "../wave-detection/detect-waves";

function signedNet(samples: number[], onset: number, offset: number): number {
  const segment = samples.slice(Math.max(0, onset), Math.min(samples.length, offset + 1));
  if (!segment.length) return 0;
  const max = Math.max(...segment);
  const min = Math.min(...segment);
  return max + min >= 0 ? max : min;
}

function axisFromLeads(
  leads: Array<{ lead: string; samples: number[] }>,
  onset: number,
  offset: number,
): { pAxisDeg: number; qrsAxisDeg: number; tAxisDeg: number; electricalAxisDeg: number; meanElectricalAxisDeg: number } {
  const leadI = leadSamples(leads, "I");
  const leadAvf = leadSamples(leads, "aVF");
  const leadII = leadSamples(leads, "II");
  const qrsNetI = signedNet(leadI, onset, offset) || signedNet(leadII, onset, offset);
  const qrsNetAvf = signedNet(leadAvf, onset, offset) || signedNet(leadII, onset, offset) * 0.75;
  const qrsRad = Math.atan2(qrsNetAvf, qrsNetI);
  const qrsDeg = Number((qrsRad * (180 / Math.PI)).toFixed(1));
  const normalized = ((qrsDeg % 360) + 360) % 360;
  const frontal = normalized > 180 ? normalized - 360 : normalized;

  const pOnset = Math.max(0, onset - msToSamples(180, 500));
  const pOffset = Math.max(0, onset - msToSamples(40, 500));
  const pNetI = signedNet(leadI, pOnset, pOffset);
  const pNetAvf = signedNet(leadAvf, pOnset, pOffset);
  const pDeg = Number((Math.atan2(pNetAvf, pNetI) * (180 / Math.PI)).toFixed(1));

  const tStart = Math.min(leadII.length - 1, offset + msToSamples(60, 500));
  const tEnd = Math.min(leadII.length - 1, offset + msToSamples(280, 500));
  const tNetI = signedNet(leadI, tStart, tEnd);
  const tNetAvf = signedNet(leadAvf, tStart, tEnd);
  const tDeg = Number((Math.atan2(tNetAvf, tNetI) * (180 / Math.PI)).toFixed(1));

  return {
    electricalAxisDeg: frontal,
    meanElectricalAxisDeg: frontal,
    pAxisDeg: pDeg,
    qrsAxisDeg: frontal,
    tAxisDeg: tDeg,
  };
}

function peakAmplitude(samples: number[], start: number, end: number): number {
  const segment = samples.slice(Math.max(0, start), Math.min(samples.length, end + 1));
  if (!segment.length) return 0;
  return Math.max(...segment.map(Math.abs));
}

function minAmplitude(samples: number[], start: number, end: number): number {
  const segment = samples.slice(Math.max(0, start), Math.min(samples.length, end + 1));
  if (!segment.length) return 0;
  return Math.min(...segment);
}

function stMeasureMm(
  samples: number[],
  waves: DetectedWave,
  samplingRate: number,
  gainMmPerMv: number,
): { stElevationMm: number; stDepressionMm: number; jPointMm: number; stDeviationMm: number } {
  const baseline = samples[Math.max(0, waves.r.peak - msToSamples(80, samplingRate))] ?? 0;
  const jValue = samples[waves.jPoint] ?? baseline;
  const st80 = samples[Math.min(samples.length - 1, waves.jPoint + msToSamples(80, samplingRate))] ?? jValue;
  const deviationMm = Number(((jValue - baseline) * gainMmPerMv).toFixed(2));
  const st80Mm = Number(((st80 - baseline) * gainMmPerMv).toFixed(2));
  return {
    jPointMm: deviationMm,
    stDepressionMm: st80Mm < -0.5 ? Math.abs(st80Mm) : 0,
    stDeviationMm: deviationMm,
    stElevationMm: st80Mm > 0.5 ? st80Mm : 0,
  };
}

function computeQtPerLead(
  leads: Array<{ lead: string; samples: number[] }>,
  waves: DetectedWave,
  samplingRate: number,
): number[] {
  return leads.map((lead) => {
    const qtSamples = waves.t.offset - waves.r.onset;
    void lead;
    return clamp(samplesToMs(qtSamples, samplingRate), 240, 600);
  });
}

function classifyRProgression(
  leads: Array<{ lead: string; samples: number[] }>,
  onset: number,
  offset: number,
): "normal" | "poor" | "reverse" {
  const values = ["V1", "V2", "V3", "V4", "V5", "V6"].map((leadName) =>
    peakAmplitude(leadSamples(leads, leadName), onset, offset),
  );
  if (values[5] < values[0]) return "reverse";
  if (!(values[2] > values[1] && values[3] > values[2])) return "poor";
  return "normal";
}

function transitionZone(
  leads: Array<{ lead: string; samples: number[] }>,
  onset: number,
  offset: number,
): string {
  const precordial = ["V1", "V2", "V3", "V4", "V5", "V6"];
  let transition = "V3";
  for (let index = 0; index < precordial.length - 1; index += 1) {
    const current = peakAmplitude(leadSamples(leads, precordial[index]), onset, offset);
    const next = peakAmplitude(leadSamples(leads, precordial[index + 1]), onset, offset);
    if (next > current * 1.15) {
      transition = precordial[index + 1];
      break;
    }
  }
  return transition;
}

function bundleBranchIndicators(
  leads: Array<{ lead: string; samples: number[] }>,
  qrsDurationMs: number,
  onset: number,
  offset: number,
): string[] {
  const indicators: string[] = [];
  if (qrsDurationMs < 120) return indicators;
  const v1 = leadSamples(leads, "V1");
  const v6 = leadSamples(leads, "V6");
  const leadI = leadSamples(leads, "I");
  const rsRPrime = peakAmplitude(v1, onset, offset) > 0.4 && minAmplitude(v1, onset, offset) < -0.15;
  const wideS = Math.abs(minAmplitude(leadI, onset, offset)) > 0.25;
  const broadR = peakAmplitude(v6, onset, offset) > 0.5 && peakAmplitude(leadI, onset, offset) > 0.4;
  if (rsRPrime && wideS) indicators.push("rbbb_pattern");
  if (broadR && !rsRPrime) indicators.push("lbbb_pattern");
  if (!indicators.length) indicators.push("intraventricular_conduction_delay");
  return indicators;
}

export function computeMeasurements(
  leads: Array<{ lead: string; samples: number[]; samplingRate: number }>,
  waveDetection: WaveDetectionResult,
  gainMmPerMv: number,
): EnterpriseMeasurementBundle {
  const primaryLead = leads.find((lead) => lead.lead === waveDetection.filteredLead) ?? leads[0];
  const beat = waveDetection.beats[0];
  const waves = beat?.waves;
  const samplingRate = primaryLead?.samplingRate ?? 500;
  const samples = primaryLead?.samples ?? [];
  const rPeak = beat?.rPeak ?? Math.floor(samples.length * 0.35);
  const fallbackOnset = Math.max(0, rPeak - msToSamples(40, samplingRate));
  const fallbackOffset = Math.min(samples.length - 1, rPeak + msToSamples(45, samplingRate));
  const w: DetectedWave = waves ?? {
    jPoint: fallbackOffset,
    p: { confidence: 0.4, offset: fallbackOnset, onset: fallbackOnset, peak: fallbackOnset },
    q: { confidence: 0.4, offset: rPeak, onset: fallbackOnset, peak: fallbackOnset },
    r: { confidence: 0.5, offset: fallbackOffset, onset: fallbackOnset, peak: rPeak },
    s: { confidence: 0.4, offset: fallbackOffset, onset: rPeak, peak: fallbackOffset },
    t: { confidence: 0.4, offset: fallbackOffset, onset: fallbackOffset, peak: fallbackOffset },
  };

  const rrIntervalMs = averageRrIntervalMs(waveDetection.rPeaks, samplingRate);
  const heartRateBpm = heartRateFromRr(rrIntervalMs);
  const prIntervalMs = clamp(samplesToMs(w.r.peak - w.p.onset, samplingRate), 80, 320);
  const pDurationMs = clamp(samplesToMs(w.p.offset - w.p.onset, samplingRate) + 20, 60, 140);
  const qrsDurationMs = clamp(samplesToMs(w.s.offset - w.q.onset, samplingRate), 60, 200);
  const qtIntervalMs = clamp(samplesToMs(w.t.offset - w.r.onset, samplingRate), 240, 600);
  const rrSeconds = rrIntervalMs / 1000;
  const qtcBazettMs = Math.round(qtIntervalMs / Math.sqrt(Math.max(rrSeconds, 0.2)));
  const qtcFridericiaMs = Math.round(qtIntervalMs / Math.cbrt(Math.max(rrSeconds, 0.2)));
  const qtValues = computeQtPerLead(leads, w, samplingRate);
  const qtDispersionMs = qtValues.length ? Math.max(...qtValues) - Math.min(...qtValues) : 0;

  const axis = axisFromLeads(leads, w.r.onset, w.s.offset);
  const qrsSegment = samples.slice(w.r.onset, w.s.offset + 1);
  const rWaveAmplitudeMv = qrsSegment.length ? Number(Math.max(...qrsSegment).toFixed(4)) : 0;
  const sWaveAmplitudeMv = qrsSegment.length ? Number(Math.abs(Math.min(...qrsSegment)).toFixed(4)) : 0;
  const qrsAmplitudeMv = Number((rWaveAmplitudeMv + sWaveAmplitudeMv).toFixed(4));
  const pWaveAmplitudeMv = Number(Math.abs(samples[w.p.peak] ?? 0).toFixed(4));
  const tWaveAmplitudeMv = Number(Math.abs(samples[w.t.peak] ?? 0).toFixed(4));
  const st = stMeasureMm(samples, w, samplingRate, gainMmPerMv);
  const tInversion = (samples[w.t.peak] ?? 0) < (samples[w.jPoint] ?? 0) - 0.05;
  const rProgression = classifyRProgression(leads, w.r.onset, w.s.offset);
  const transition = transitionZone(leads, w.r.onset, w.s.offset);

  const v1 = leadSamples(leads, "V1");
  const v5 = leadSamples(leads, "V5");
  const v6 = leadSamples(leads, "V6");
  const sV1 = Math.abs(minAmplitude(v1, w.r.onset, w.s.offset));
  const maxPrecordialR = Math.max(peakAmplitude(v5, w.r.onset, w.s.offset), peakAmplitude(v6, w.r.onset, w.s.offset));
  const lvhVoltageCriteria = sV1 + maxPrecordialR > 3.5;
  const rvhVoltageCriteria = peakAmplitude(v1, w.r.onset, w.s.offset) > 0.7;
  const limbVoltage = ["I", "II", "III", "aVR", "aVL", "aVF"].every((leadName) =>
    peakAmplitude(leadSamples(leads, leadName), w.r.onset, w.s.offset) < 0.5,
  );
  const voltageMv = limbVoltage ? 0.3 : qrsAmplitudeMv;
  const bbb = bundleBranchIndicators(leads, qrsDurationMs, w.r.onset, w.s.offset);

  return {
    atrialActivity: pWaveAmplitudeMv >= 0.05 ? "present" : "absent",
    bundleBranchIndicators: bbb,
    electricalAxisDeg: axis.electricalAxisDeg,
    heartRateBpm,
    jPointMm: st.jPointMm,
    lvhVoltageCriteria,
    meanElectricalAxisDeg: axis.meanElectricalAxisDeg,
    pAxisDeg: axis.pAxisDeg,
    pDurationMs,
    pWaveAmplitudeMv,
    prIntervalMs,
    qrsAmplitudeMv,
    qrsAxisDeg: axis.qrsAxisDeg,
    qrsDurationMs,
    qtDispersionMs,
    qtcBazettMs,
    qtcFridericiaMs,
    qtIntervalMs,
    rProgression,
    rWaveAmplitudeMv,
    rrIntervalMs,
    rvhVoltageCriteria,
    sWaveAmplitudeMv,
    stDepressionMm: st.stDepressionMm,
    stDeviationMm: st.stDeviationMm,
    stElevationMm: st.stElevationMm,
    tAxisDeg: axis.tAxisDeg,
    tInversion,
    tWaveAmplitudeMv,
    transitionZone: transition,
    ventricularActivity: qrsDurationMs >= 120 ? "wide" : qrsDurationMs <= 90 ? "narrow" : "regular",
    voltageMv,
  };
}
