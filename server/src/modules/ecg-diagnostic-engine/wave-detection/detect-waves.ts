import {
  adaptivePeakThreshold,
  clamp,
  localMaximum,
  localMinimum,
  msToSamples,
  movingAverage,
  normalizeSignal,
  rejectMotionArtifact,
  segmentConfidence,
  samplesToMs,
} from "../signal/signal-processing";
import type { DetectedWave, WaveDetectionBeat, WaveDetectionResult } from "../types";

function detectRPeaks(samples: number[], samplingRate: number): { peaks: number[]; threshold: number } {
  const smoothed = movingAverage(normalizeSignal(samples), 5);
  const threshold = adaptivePeakThreshold(smoothed);
  const refractory = Math.floor(samplingRate * 0.25);
  const peaks: number[] = [];
  for (let index = 1; index < smoothed.length - 1; index += 1) {
    const isPeak = smoothed[index] > threshold
      && smoothed[index] > smoothed[index - 1]
      && smoothed[index] >= smoothed[index + 1];
    if (!isPeak) continue;
    const previous = peaks[peaks.length - 1];
    if (previous === undefined || index - previous > refractory) peaks.push(index);
    else if (smoothed[index] > smoothed[previous]) peaks[peaks.length - 1] = index;
  }
  return { peaks, threshold };
}

function detectWaveSegment(
  samples: number[],
  samplingRate: number,
  searchStart: number,
  searchEnd: number,
  mode: "max" | "min",
  noiseScore: number,
): { onset: number; offset: number; peak: number; confidence: number } {
  const start = clamp(searchStart, 0, samples.length - 1);
  const end = clamp(searchEnd, start + 1, samples.length - 1);
  const center = Math.floor((start + end) / 2);
  const radius = Math.max(2, msToSamples(25, samplingRate));
  const peak = mode === "max" ? localMaximum(samples, center, radius) : localMinimum(samples, center, radius);
  const onset = localMinimum(samples, Math.max(start, peak - msToSamples(35, samplingRate)), msToSamples(20, samplingRate));
  const offset = localMinimum(samples, Math.min(end, peak + msToSamples(35, samplingRate)), msToSamples(20, samplingRate));
  const amplitude = Math.abs((samples[peak] ?? 0) - (samples[onset] ?? 0));
  return {
    confidence: segmentConfidence(amplitude, noiseScore),
    offset,
    onset,
    peak,
  };
}

function detectBeatWaves(samples: number[], samplingRate: number, rPeak: number, noiseScore: number): DetectedWave {
  const p = detectWaveSegment(
    samples,
    samplingRate,
    rPeak - msToSamples(220, samplingRate),
    rPeak - msToSamples(60, samplingRate),
    "max",
    noiseScore,
  );
  const q = detectWaveSegment(
    samples,
    samplingRate,
    rPeak - msToSamples(45, samplingRate),
    rPeak - msToSamples(5, samplingRate),
    "min",
    noiseScore,
  );
  const r = {
    confidence: segmentConfidence(Math.abs(samples[rPeak] ?? 0), noiseScore),
    offset: localMinimum(samples, Math.min(samples.length - 1, rPeak + msToSamples(20, samplingRate)), msToSamples(15, samplingRate)),
    onset: localMinimum(samples, Math.max(0, rPeak - msToSamples(40, samplingRate)), msToSamples(20, samplingRate)),
    peak: rPeak,
  };
  const s = detectWaveSegment(
    samples,
    samplingRate,
    rPeak + msToSamples(5, samplingRate),
    rPeak + msToSamples(50, samplingRate),
    "min",
    noiseScore,
  );
  const t = detectWaveSegment(
    samples,
    samplingRate,
    rPeak + msToSamples(80, samplingRate),
    rPeak + msToSamples(280, samplingRate),
    "max",
    noiseScore,
  );
  const uSearchStart = t.offset + msToSamples(20, samplingRate);
  const uSearchEnd = Math.min(samples.length - 1, t.offset + msToSamples(120, samplingRate));
  const u = uSearchEnd > uSearchStart
    ? detectWaveSegment(samples, samplingRate, uSearchStart, uSearchEnd, "max", noiseScore)
    : undefined;
  const jPoint = localMinimum(samples, Math.min(samples.length - 1, rPeak + msToSamples(80, samplingRate)), msToSamples(15, samplingRate));
  return { jPoint, p, q, r, s, t, u };
}

export function detectWaves(
  samples: number[],
  samplingRate: number,
  options: { baselineCorrected?: boolean; powerlineFiltered?: boolean; lead?: string } = {},
): WaveDetectionResult {
  const noiseScore = Number((samples.reduce((sum, value, index, arr) =>
    sum + (index ? Math.abs(value - (arr[index - 1] ?? 0)) : 0), 0) / Math.max(samples.length - 1, 1)).toFixed(3));
  const { peaks: rPeaks, threshold } = detectRPeaks(samples, samplingRate);
  const primaryPeak = rPeaks[0] ?? Math.floor(samples.length * 0.35);
  const beats: WaveDetectionBeat[] = (rPeaks.length ? rPeaks : [primaryPeak]).slice(0, 12).map((rPeak, beatIndex) => {
    const waves = detectBeatWaves(samples, samplingRate, rPeak, noiseScore);
    const motionArtifactRejected = rejectMotionArtifact(samples, rPeak, samplingRate);
    const peakConfidence = waves.r.confidence;
    const waveConfidence = Number((
      (waves.p.confidence + waves.q.confidence + waves.r.confidence + waves.s.confidence + waves.t.confidence) / 5
    ).toFixed(3));
    return {
      beatIndex,
      motionArtifactRejected,
      noiseScore,
      peakConfidence,
      rPeak,
      waveConfidence,
      waves,
    };
  });

  return {
    adaptiveThreshold: threshold,
    baselineCorrected: options.baselineCorrected ?? true,
    beats,
    filteredLead: options.lead ?? "II",
    powerlineFiltered: options.powerlineFiltered ?? true,
    rPeaks: rPeaks.length ? rPeaks : [primaryPeak],
  };
}

export function averageRrIntervalMs(rPeaks: number[], samplingRate: number): number {
  if (rPeaks.length < 2) return 800;
  const rrSamples = rPeaks.slice(1).map((peak, index) => peak - rPeaks[index]);
  const avgSamples = rrSamples.reduce((sum, value) => sum + value, 0) / rrSamples.length;
  return Math.round(samplesToMs(avgSamples, samplingRate));
}

export function heartRateFromRr(rrIntervalMs: number): number {
  return Math.round(60000 / Math.max(rrIntervalMs, 200));
}

export function rrIntervalsMs(rPeaks: number[], samplingRate: number): number[] {
  return rPeaks.slice(1).map((peak, index) => samplesToMs(peak - rPeaks[index], samplingRate));
}

export function coefficientOfVariation(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  if (mean === 0) return 0;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance) / mean;
}
