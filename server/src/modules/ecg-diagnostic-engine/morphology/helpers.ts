export function leadSamples(leads: Array<{ lead: string; samples: number[] }>, leadName: string): number[] {
  return leads.find((lead) => lead.lead === leadName)?.samples ?? leads[0]?.samples ?? [];
}

export function peakAmplitudeHelper(samples: number[], start: number, end: number): number {
  const segment = samples.slice(Math.max(0, start), Math.min(samples.length, end + 1));
  if (!segment.length) return 0;
  return Math.max(...segment.map(Math.abs));
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
