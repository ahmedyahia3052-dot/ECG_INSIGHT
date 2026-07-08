/** Heart rate and RR interval calculations. */

export function heartRateFromRrMs(rrIntervalMs: number): number {
  if (!Number.isFinite(rrIntervalMs) || rrIntervalMs <= 0) return 0;
  return Math.round(60000 / rrIntervalMs);
}

export function averageRrIntervalMs(rPeaks: number[], samplingRate: number): number {
  if (rPeaks.length < 2 || samplingRate <= 0) return 833;
  let total = 0;
  for (let index = 1; index < rPeaks.length; index += 1) {
    total += ((rPeaks[index]! - rPeaks[index - 1]!) / samplingRate) * 1000;
  }
  return Math.round(total / (rPeaks.length - 1));
}
