export interface BeatFiducials {
  pOnset: number;
  pPeak: number;
  qrsOffset: number;
  qrsOnset: number;
  rPeak: number;
  tOffset: number;
  tPeak: number;
}

function movingAverage(samples: number[], windowSize: number) {
  const half = Math.floor(windowSize / 2);
  return samples.map((_sample, index) => {
    const start = Math.max(0, index - half);
    const end = Math.min(samples.length, index + half + 1);
    const segment = samples.slice(start, end);
    return segment.reduce((sum, value) => sum + value, 0) / segment.length;
  });
}

function normalize(samples: number[]) {
  const mean = samples.reduce((sum, value) => sum + value, 0) / Math.max(samples.length, 1);
  const centered = samples.map((value) => value - mean);
  const maxAbs = Math.max(...centered.map(Math.abs), 0.001);
  return centered.map((value) => value / maxAbs);
}

export function detectRPeaks(samples: number[], samplingRate: number) {
  const smoothed = movingAverage(normalize(samples), 5);
  const threshold = Math.max(0.35, Math.max(...smoothed) * 0.55);
  const refractory = Math.floor(samplingRate * 0.25);
  const peaks: number[] = [];
  for (let index = 1; index < smoothed.length - 1; index += 1) {
    const isPeak = smoothed[index] > threshold && smoothed[index] > smoothed[index - 1] && smoothed[index] >= smoothed[index + 1];
    if (!isPeak) continue;
    const previous = peaks[peaks.length - 1];
    if (previous === undefined || index - previous > refractory) peaks.push(index);
    else if (smoothed[index] > smoothed[previous]) peaks[peaks.length - 1] = index;
  }
  return peaks;
}

function localMinimum(samples: number[], center: number, radius: number) {
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

function localMaximum(samples: number[], center: number, radius: number) {
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

export function detectBeatFiducials(samples: number[], samplingRate: number, rPeak: number): BeatFiducials {
  const msToSamples = (ms: number) => Math.round((ms / 1000) * samplingRate);
  const pSearchStart = Math.max(0, rPeak - msToSamples(220));
  const pSearchEnd = Math.max(pSearchStart + 1, rPeak - msToSamples(60));
  const pPeak = localMaximum(samples, Math.floor((pSearchStart + pSearchEnd) / 2), msToSamples(40));
  const pOnset = localMinimum(samples, Math.max(0, pPeak - msToSamples(30)), msToSamples(20));
  const qrsOnset = localMinimum(samples, Math.max(0, rPeak - msToSamples(40)), msToSamples(25));
  const qrsOffset = localMinimum(samples, Math.min(samples.length - 1, rPeak + msToSamples(45)), msToSamples(25));
  const tPeak = localMaximum(samples, Math.min(samples.length - 1, rPeak + msToSamples(180)), msToSamples(60));
  const tOffset = localMinimum(samples, Math.min(samples.length - 1, tPeak + msToSamples(80)), msToSamples(40));
  return { pOnset, pPeak, qrsOffset, qrsOnset, rPeak, tOffset, tPeak };
}

export function samplesToMs(index: number, samplingRate: number) {
  return Math.round((index / samplingRate) * 1000);
}

export function leadSamples(leads: Array<{ lead: string; samples: number[] }>, leadName: string) {
  return leads.find((lead) => lead.lead === leadName)?.samples ?? leads[0]?.samples ?? [];
}
