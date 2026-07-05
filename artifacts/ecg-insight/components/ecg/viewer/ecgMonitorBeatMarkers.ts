import type { DigitalEcgLead } from "@/services/ecgProcessing";

/** Detect local maxima as approximate R-peak beat indices for monitor markers. */
export function detectBeatMarkerIndices(lead: DigitalEcgLead, maxMarkers = 24): number[] {
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

export function beatMarkerPositions(
  lead: DigitalEcgLead,
  width: number,
  height: number,
  gainScale: number,
  offsetIndex: number,
  windowSize = 520,
) {
  const padX = 30;
  const padY = 18;
  const traceW = width - padX * 2;
  const traceH = height - padY * 2;
  const start = Math.max(0, Math.floor(offsetIndex) % Math.max(lead.samples.length, 1));
  const end = Math.min(start + windowSize, lead.samples.length);

  return detectBeatMarkerIndices(lead)
    .filter((index) => index >= start && index < end)
    .map((index) => {
      const local = index - start;
      const x = padX + (local / Math.max(windowSize - 1, 1)) * traceW;
      const y = padY + traceH / 2 - lead.samples[index]! * (traceH * 0.32) * gainScale;
      return { index, x, y };
    });
}
