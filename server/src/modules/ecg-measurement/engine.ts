import type { GridCalibration } from "../ecg-digitization/types";
import { calculateAxis } from "./axis-calculator";
import { detectBeatFiducials, detectRPeaks, leadSamples, samplesToMs } from "./fiducial-detector";
import { averageRrIntervalMs, calculateIntervals, heartRateFromRr } from "./interval-calculator";
import { classifyRWaveProgression, detectMorphology } from "./morphology-detector";
import { classifyRhythm, rhythmRegularityScore } from "./rhythm-detector";
import type { EcgClinicalMeasurementResult, EcgMeasurementItem, MeasureLeadsInput } from "./types";

function amplitudeAt(samples: number[], index: number) {
  return Number((samples[index] ?? 0).toFixed(4));
}

function stDeviationMm(samples: number[], rPeak: number, samplingRate: number, gainMmPerMv: number) {
  const jPoint = Math.min(samples.length - 1, rPeak + Math.floor(samplingRate * 0.08));
  const baseline = samples[Math.max(0, rPeak - Math.floor(samplingRate * 0.12))] ?? 0;
  const jValue = samples[jPoint] ?? baseline;
  return Number(((jValue - baseline) * gainMmPerMv).toFixed(2));
}

function buildMeasurementItems(
  result: Omit<EcgClinicalMeasurementResult, "measurements">,
  fiducials: ReturnType<typeof detectBeatFiducials>,
  samplingRate: number,
): EcgMeasurementItem[] {
  const lead = "II";
  const toHighlight = (startIndex: number, endIndex: number, peakIndex?: number) => ({
    endMs: samplesToMs(endIndex, samplingRate),
    lead,
    peakMs: peakIndex === undefined ? undefined : samplesToMs(peakIndex, samplingRate),
    startMs: samplesToMs(startIndex, samplingRate),
  });

  return [
    { label: "Heart Rate", unit: "bpm", value: result.heartRate },
    { label: "RR Interval", highlight: toHighlight(fiducials.rPeak, fiducials.rPeak + Math.round((result.intervals.rrIntervalMs / 1000) * samplingRate)), unit: "ms", value: result.intervals.rrIntervalMs },
    { label: "PR Interval", highlight: toHighlight(fiducials.pOnset, fiducials.rPeak), unit: "ms", value: result.intervals.prIntervalMs },
    { label: "QRS Duration", highlight: toHighlight(fiducials.qrsOnset, fiducials.qrsOffset, fiducials.rPeak), unit: "ms", value: result.intervals.qrsDurationMs },
    { label: "QT Interval", highlight: toHighlight(fiducials.qrsOnset, fiducials.tOffset), unit: "ms", value: result.intervals.qtIntervalMs },
    { label: "QTc Bazett", unit: "ms", value: result.intervals.qtcBazettMs },
    { label: "QTc Fridericia", unit: "ms", value: result.intervals.qtcFridericiaMs },
    { label: "P Wave Duration", highlight: toHighlight(fiducials.pOnset, fiducials.pPeak), unit: "ms", value: result.intervals.pWaveDurationMs },
    { label: "P Wave Amplitude", highlight: toHighlight(fiducials.pOnset, fiducials.pPeak, fiducials.pPeak), unit: "mV", value: result.amplitudes.pWaveAmplitudeMv },
    { label: "QRS Amplitude", highlight: toHighlight(fiducials.qrsOnset, fiducials.qrsOffset, fiducials.rPeak), unit: "mV", value: result.amplitudes.qrsAmplitudeMv },
    { label: "T Wave Amplitude", highlight: toHighlight(fiducials.rPeak, fiducials.tOffset, fiducials.tPeak), unit: "mV", value: result.amplitudes.tWaveAmplitudeMv },
    { label: "ST Deviation", highlight: toHighlight(fiducials.rPeak, Math.min(fiducials.rPeak + Math.round(samplingRate * 0.08), fiducials.tPeak)), unit: "mm", value: result.stDeviation },
    { label: "Electrical Axis", unit: "deg", value: result.axis.electricalAxisDeg },
    { label: "Frontal Plane Axis", unit: "deg", value: result.axis.frontalPlaneAxisDeg },
    { label: "Mean QRS Axis", unit: "deg", value: result.axis.meanQrsAxisDeg },
  ];
}

export function measureFromLeads(input: MeasureLeadsInput): EcgClinicalMeasurementResult {
  const { calibration, leads } = input;
  const leadII = leads.find((lead) => lead.lead === "II") ?? leads[0];
  if (!leadII?.samples.length) {
    return emptyMeasurementResult();
  }

  const { samples, samplingRate } = leadII;
  const rPeaks = detectRPeaks(samples, samplingRate);
  const rPeak = rPeaks[0] ?? Math.floor(samples.length * 0.35);
  const fiducials = detectBeatFiducials(samples, samplingRate, rPeak);
  const rrIntervalsMs = rPeaks.slice(1).map((peak, index) => samplesToMs(peak - rPeaks[index], samplingRate));
  const rrIntervalMs = averageRrIntervalMs(rPeaks, samplingRate);
  const heartRate = heartRateFromRr(rrIntervalMs);
  const intervals = calculateIntervals(fiducials, samplingRate, rrIntervalMs);
  const axis = calculateAxis(leads, fiducials.qrsOnset, fiducials.qrsOffset);
  const stDeviation = stDeviationMm(samples, fiducials.rPeak, samplingRate, calibration.gainMmPerMv);
  const qrsSegment = samples.slice(fiducials.qrsOnset, fiducials.qrsOffset + 1);
  const qrsAmplitudeMv = qrsSegment.length ? Number((Math.max(...qrsSegment) - Math.min(...qrsSegment)).toFixed(4)) : 0;
  const amplitudes = {
    pWaveAmplitudeMv: Math.abs(amplitudeAt(samples, fiducials.pPeak)),
    qrsAmplitudeMv,
    rWaveProgression: classifyRWaveProgression(leads, fiducials.qrsOnset, fiducials.qrsOffset),
    stDeviationMm: stDeviation,
    tWaveAmplitudeMv: Math.abs(amplitudeAt(samples, fiducials.tPeak)),
  };
  const morphology = detectMorphology(leads, intervals.qrsDurationMs, fiducials.qrsOnset, fiducials.qrsOffset, calibration.gainMmPerMv);
  const rhythm = classifyRhythm(heartRate, rrIntervalsMs.length ? rrIntervalsMs : [rrIntervalMs]);
  const regularity = rhythmRegularityScore(rrIntervalsMs.length ? rrIntervalsMs : [rrIntervalMs]);
  const signalQuality = leadII.samples.length / Math.max(leadII.samplingRate, 1);
  const confidence = Number(Math.min(0.98, Math.max(0.35, 0.45 + regularity * 0.25 + Math.min(signalQuality / 4, 0.2) + (calibration.gridDetected ? 0.08 : 0))).toFixed(3));

  const base = {
    amplitudes,
    axis,
    confidence,
    heartRate,
    intervals,
    morphology,
    rhythm,
    stDeviation,
  };

  return {
    ...base,
    measurements: buildMeasurementItems(base, fiducials, samplingRate),
  };
}

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
