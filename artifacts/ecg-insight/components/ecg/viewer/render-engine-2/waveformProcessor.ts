import type { RenderEngine2WaveformSettings, WaveformArtifactMode } from "./types";

const DEFAULT_ARTIFACTS: Record<WaveformArtifactMode, boolean> = {
  baselineWander: false,
  muscleArtifact: false,
  noise: false,
  powerlineInterference: false,
  respirationDrift: false,
};

function movingAverage(values: number[], window: number) {
  if (window <= 1) return values;
  const out: number[] = [];
  for (let i = 0; i < values.length; i += 1) {
    let sum = 0;
    let count = 0;
    for (let j = Math.max(0, i - window); j <= Math.min(values.length - 1, i + window); j += 1) {
      sum += values[j]!;
      count += 1;
    }
    out.push(sum / count);
  }
  return out;
}

function applyBaselineWander(samples: number[], phase: number) {
  return samples.map((s, i) => s + Math.sin((i + phase) * 0.018) * 0.06);
}

function applyMuscleArtifact(samples: number[], phase: number) {
  return samples.map((s, i) => s + (Math.random() - 0.5) * 0.04 * (1 + Math.sin((i + phase) * 0.31)));
}

function applyPowerline(samples: number[], phase: number) {
  return samples.map((s, i) => s + Math.sin((i + phase) * 0.52) * 0.025);
}

function applyRespirationDrift(samples: number[], phase: number) {
  return samples.map((s, i) => s + Math.sin((i + phase) * 0.009) * 0.035);
}

function applyNoise(samples: number[]) {
  return samples.map((s) => s + (Math.random() - 0.5) * 0.02);
}

/** Resample with linear interpolation for pixel-perfect scaling. */
export function resampleSubPixel(samples: number[], targetCount: number) {
  if (samples.length < 2 || targetCount < 2) return samples;
  const output: number[] = [];
  for (let i = 0; i < targetCount; i += 1) {
    const t = (i / Math.max(targetCount - 1, 1)) * (samples.length - 1);
    const left = Math.floor(t);
    const right = Math.min(samples.length - 1, left + 1);
    const frac = t - left;
    output.push(samples[left]! * (1 - frac) + samples[right]! * frac);
  }
  return output;
}

export function processWaveformSamples(
  samples: number[],
  settings: RenderEngine2WaveformSettings,
  phaseSeed: number,
): number[] {
  let processed = [...samples];
  const artifacts = { ...DEFAULT_ARTIFACTS, ...settings.artifacts };

  if (!settings.filterEnabled) {
    if (artifacts.baselineWander) processed = applyBaselineWander(processed, phaseSeed);
    if (artifacts.muscleArtifact) processed = applyMuscleArtifact(processed, phaseSeed);
    if (artifacts.powerlineInterference) processed = applyPowerline(processed, phaseSeed);
    if (artifacts.respirationDrift) processed = applyRespirationDrift(processed, phaseSeed);
    if (artifacts.noise) processed = applyNoise(processed);
  } else if (settings.clinicalSmoothing) {
    processed = movingAverage(processed, 2);
  }

  return processed;
}
