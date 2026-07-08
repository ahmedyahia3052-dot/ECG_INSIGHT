export function movingAverage(samples: number[], windowSize: number): number[] {
  const half = Math.floor(windowSize / 2);
  return samples.map((_sample, index) => {
    const start = Math.max(0, index - half);
    const end = Math.min(samples.length, index + half + 1);
    const segment = samples.slice(start, end);
    return segment.reduce((sum, value) => sum + value, 0) / segment.length;
  });
}

export function normalizeSignal(samples: number[]): number[] {
  const mean = samples.reduce((sum, value) => sum + value, 0) / Math.max(samples.length, 1);
  const centered = samples.map((value) => value - mean);
  const maxAbs = Math.max(...centered.map(Math.abs), 0.001);
  return centered.map((value) => value / maxAbs);
}

export function correctBaselineWander(samples: number[], samplingRate: number): number[] {
  const window = Math.max(5, Math.floor(samplingRate * 0.4));
  const baseline = movingAverage(samples, window);
  return samples.map((value, index) => value - (baseline[index] ?? 0));
}

export function filterPowerline(samples: number[], samplingRate: number, hz: 50 | 60 = 50): number[] {
  const period = Math.max(2, Math.round(samplingRate / hz));
  const smoothed = movingAverage(samples, period);
  return samples.map((value, index) => value - (smoothed[index] ?? 0) * 0.35);
}

export function estimateNoiseScore(samples: number[]): number {
  if (samples.length < 4) return 1;
  let diffSum = 0;
  for (let index = 1; index < samples.length; index += 1) {
    diffSum += Math.abs((samples[index] ?? 0) - (samples[index - 1] ?? 0));
  }
  const meanDiff = diffSum / (samples.length - 1);
  return Number(Math.min(1, meanDiff * 8).toFixed(3));
}

export function rejectMotionArtifact(samples: number[], rPeak: number, samplingRate: number): boolean {
  const window = Math.floor(samplingRate * 0.12);
  const start = Math.max(0, rPeak - window);
  const end = Math.min(samples.length, rPeak + window);
  const segment = samples.slice(start, end);
  if (segment.length < 3) return false;
  const peak = Math.max(...segment.map(Math.abs));
  const baseline = segment.reduce((sum, value) => sum + Math.abs(value), 0) / segment.length;
  return peak > baseline * 4.5;
}

export function adaptivePeakThreshold(smoothed: number[]): number {
  const sorted = [...smoothed].sort((a, b) => b - a);
  const top = sorted.slice(0, Math.max(1, Math.floor(sorted.length * 0.02)));
  const peakMean = top.reduce((sum, value) => sum + value, 0) / top.length;
  const median = sorted[Math.floor(sorted.length / 2)] ?? 0.35;
  return Number(Math.max(0.28, Math.min(0.72, peakMean * 0.52 + median * 0.18)).toFixed(3));
}

export function preprocessLead(samples: number[], samplingRate: number, powerlineHz: 50 | 60 = 50): {
  samples: number[];
  baselineCorrected: boolean;
  powerlineFiltered: boolean;
  noiseScore: number;
} {
  const baselineCorrected = correctBaselineWander(samples, samplingRate);
  const filtered = filterPowerline(baselineCorrected, samplingRate, powerlineHz);
  const normalized = normalizeSignal(filtered);
  return {
    baselineCorrected: true,
    noiseScore: estimateNoiseScore(normalized),
    powerlineFiltered: true,
    samples: normalized,
  };
}

export function samplesToMs(index: number, samplingRate: number): number {
  return Math.round((index / samplingRate) * 1000);
}

export function msToSamples(ms: number, samplingRate: number): number {
  return Math.round((ms / 1000) * samplingRate);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function leadSamples(leads: Array<{ lead: string; samples: number[] }>, leadName: string): number[] {
  return leads.find((lead) => lead.lead === leadName)?.samples ?? leads[0]?.samples ?? [];
}

export function localMinimum(samples: number[], center: number, radius: number): number {
  let best = center;
  let bestValue = samples[center] ?? 0;
  for (let index = Math.max(0, center - radius); index <= Math.min(samples.length - 1, center + radius); index += 1) {
    const value = samples[index] ?? 0;
    if (value < bestValue) {
      bestValue = value;
      best = index;
    }
  }
  return best;
}

export function localMaximum(samples: number[], center: number, radius: number): number {
  let best = center;
  let bestValue = samples[center] ?? 0;
  for (let index = Math.max(0, center - radius); index <= Math.min(samples.length - 1, center + radius); index += 1) {
    const value = samples[index] ?? 0;
    if (value > bestValue) {
      bestValue = value;
      best = index;
    }
  }
  return best;
}

export function segmentConfidence(amplitude: number, noiseScore: number): number {
  return Number(clamp(0.35 + amplitude * 0.45 + (1 - noiseScore) * 0.2, 0.25, 0.98).toFixed(3));
}
