import type { DigitalEcgLead } from "@/services/ecgProcessing";

export type MonitorBeatMarker = {
  index: number;
  kind: "pacing" | "pvc" | "r-peak";
  x: number;
  y: number;
};

export function detectBeatMarkerIndices(lead: DigitalEcgLead, maxMarkers = 48): number[] {
  const samples = lead.samples;
  if (samples.length < 8) return [];

  const indices: number[] = [];
  const threshold = Math.max(...samples.slice(0, Math.min(200, samples.length))) * 0.55;
  let lastIndex = -Math.round((lead.samplingRate ?? 500) * 0.28);

  for (let i = 2; i < samples.length - 2; i += 1) {
    const value = samples[i]!;
    if (value < threshold) continue;
    if (value <= samples[i - 1]! || value <= samples[i - 2]!) continue;
    if (value <= samples[i + 1]! || value <= samples[i + 2]!) continue;
    if (i - lastIndex < Math.round((lead.samplingRate ?? 500) * 0.25)) continue;
    indices.push(i);
    lastIndex = i;
    if (indices.length >= maxMarkers) break;
  }

  return indices;
}

export function detectPvcIndices(lead: DigitalEcgLead): number[] {
  const rPeaks = detectBeatMarkerIndices(lead, 64);
  if (rPeaks.length < 3) return [];

  const intervals: number[] = [];
  for (let i = 1; i < rPeaks.length; i += 1) {
    intervals.push(rPeaks[i]! - rPeaks[i - 1]!);
  }
  const median = [...intervals].sort((a, b) => a - b)[Math.floor(intervals.length / 2)] ?? intervals[0]!;
  const pvc: number[] = [];
  for (let i = 1; i < rPeaks.length; i += 1) {
    const interval = rPeaks[i]! - rPeaks[i - 1]!;
    if (interval < median * 0.78) pvc.push(rPeaks[i]!);
  }
  return pvc;
}

export function detectPacingIndices(lead: DigitalEcgLead): number[] {
  const samples = lead.samples;
  const pacing: number[] = [];
  for (let i = 1; i < samples.length - 1; i += 1) {
    const spike = Math.abs(samples[i]! - samples[i - 1]!) > 0.65 && Math.abs(samples[i]!) > 0.4;
    if (spike) pacing.push(i);
    if (pacing.length >= 12) break;
  }
  return pacing;
}

export function beatMarkerPositions(
  lead: DigitalEcgLead,
  width: number,
  height: number,
  gainScale: number,
  offsetIndex: number,
  windowSize = 520,
): MonitorBeatMarker[] {
  const padX = 36;
  const padY = 22;
  const traceW = width - padX * 2;
  const traceH = height - padY * 2;
  const start = Math.max(0, Math.floor(offsetIndex) % Math.max(lead.samples.length, 1));
  const end = Math.min(start + windowSize, lead.samples.length);

  const rPeaks = detectBeatMarkerIndices(lead)
    .filter((index) => index >= start && index < end)
    .map((index) => {
      const local = index - start;
      const x = padX + (local / Math.max(windowSize - 1, 1)) * traceW;
      const y = padY + traceH / 2 - lead.samples[index]! * (traceH * 0.34) * gainScale;
      return { index, kind: "r-peak" as const, x, y };
    });

  const pacing = detectPacingIndices(lead)
    .filter((index) => index >= start && index < end)
    .map((index) => {
      const local = index - start;
      const x = padX + (local / Math.max(windowSize - 1, 1)) * traceW;
      const y = padY + traceH / 2 - lead.samples[index]! * (traceH * 0.34) * gainScale;
      return { index, kind: "pacing" as const, x, y };
    });

  return [...rPeaks, ...pacing];
}
