import { recoverGaps } from "../waveform/spline";

/** Morphology-preserving smoothing — light window, skips QRS slopes. */
function preserveMorphologySmooth(values: number[], window = 3): number[] {
  if (values.length < window * 2) return values;
  const output = [...values];
  for (let i = window; i < values.length - window; i += 1) {
    const local = values.slice(i - window, i + window + 1);
    const slope = Math.abs((values[i + 1] ?? 0) - (values[i - 1] ?? 0));
    if (slope > 0.08) {
      output[i] = values[i]!;
      continue;
    }
    output[i] = local.reduce((sum, v) => sum + v, 0) / local.length;
  }
  return output;
}

function linearResample(values: number[], targetCount: number): number[] {
  if (values.length < 2 || targetCount <= values.length) return values;
  const output: number[] = [];
  for (let i = 0; i < targetCount; i += 1) {
    const t = (i / Math.max(targetCount - 1, 1)) * (values.length - 1);
    const left = Math.floor(t);
    const right = Math.min(values.length - 1, left + 1);
    const frac = t - left;
    output.push(values[left]! * (1 - frac) + values[right]! * frac);
  }
  return output;
}

export type ReconstructedLead = {
  gapRecovered: number;
  lead: string;
  samples: number[];
};

export function reconstructLeadSignal(lead: string, samples: number[]): ReconstructedLead {
  const gap = recoverGaps(samples, 8);
  const smoothed = preserveMorphologySmooth(gap.values, 3);
  const resampled = linearResample(smoothed, smoothed.length);
  return { gapRecovered: gap.gapRecovered, lead, samples: resampled };
}

export function reconstructDigitizedLeads(leads: Array<{ lead: string; samples: number[] }>) {
  return leads.map((entry) => reconstructLeadSignal(entry.lead, entry.samples));
}
