import type { DigitalEcgLead } from "@/services/ecgProcessing";

export function buildMonitorWaveformPath(
  lead: DigitalEcgLead,
  width: number,
  height: number,
  gainScale: number,
  startIndex = 0,
  sampleCount = 520,
) {
  const samples = lead.samples;
  if (samples.length < 2) return "";
  const end = Math.min(startIndex + sampleCount, samples.length);
  const slice = samples.slice(startIndex, end);
  if (slice.length < 2) return "";
  return slice
    .map((sample, index) => {
      const x = (index / Math.max(slice.length - 1, 1)) * width;
      const y = height / 2 - sample * (height * 0.32) * gainScale;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

export function buildScrollingMonitorPath(
  lead: DigitalEcgLead,
  width: number,
  height: number,
  gainScale: number,
  offsetIndex: number,
) {
  const windowSize = Math.min(520, lead.samples.length);
  const start = Math.max(0, Math.floor(offsetIndex) % Math.max(lead.samples.length, 1));
  return buildMonitorWaveformPath(lead, width, height, gainScale, start, windowSize);
}

export function msToSampleIndex(lead: DigitalEcgLead, ms: number) {
  if (!lead.samplingRate) return 0;
  return Math.max(0, Math.min(lead.samples.length - 1, Math.round((ms / 1000) * lead.samplingRate)));
}

export function sampleIndexToMs(lead: DigitalEcgLead, index: number) {
  if (!lead.samplingRate) return 0;
  return (index / lead.samplingRate) * 1000;
}

export function durationMsForLead(lead: DigitalEcgLead) {
  if (!lead.samplingRate || !lead.samples.length) return lead.durationSeconds * 1000;
  return (lead.samples.length / lead.samplingRate) * 1000;
}
