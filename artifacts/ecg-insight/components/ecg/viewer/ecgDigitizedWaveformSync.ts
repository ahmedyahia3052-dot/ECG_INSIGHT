import type { DigitalEcg, DigitalEcgLead } from "@/services/ecgProcessing";

import type { DigitizedWaveformLead } from "./EcgDigitizedWaveformLayer";

function safeSamples(samples: number[]) {
  return samples.filter((sample) => Number.isFinite(sample));
}

export function buildDigitizedWaveformPath(
  lead: DigitalEcgLead,
  width: number,
  height: number,
): string {
  const samples = safeSamples(lead.samples.slice(0, Math.min(lead.samples.length, 1400)));
  if (samples.length < 2 || width <= 0 || height <= 0) return "";
  const step = Math.max(1, Math.ceil(samples.length / 480));
  const reduced = samples.filter((_sample, index) => index % step === 0);
  return reduced
    .map((sample, index) => {
      const x = (index / Math.max(reduced.length - 1, 1)) * width;
      const y = height / 2 - sample * (height * 0.28);
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

export function buildDigitizedWaveformLeads(
  digitalEcg: DigitalEcg | null | undefined,
  width: number,
  height: number,
): DigitizedWaveformLead[] {
  if (!digitalEcg?.leads?.length || width <= 0 || height <= 0) return [];
  return digitalEcg.leads
    .map((lead) => ({
      lead: lead.lead,
      path: buildDigitizedWaveformPath(lead, width, height),
    }))
    .filter((item) => item.path.length > 0);
}

export function buildSegmentAlignedDigitizedWaveformLeads(
  digitalEcg: DigitalEcg | null | undefined,
  imageWidth: number,
  imageHeight: number,
): DigitizedWaveformLead[] {
  if (!digitalEcg?.leads?.length || imageWidth <= 0 || imageHeight <= 0) return [];
  const segments = digitalEcg.leadSegments ?? [];
  return digitalEcg.leads
    .map((lead) => {
      const segment = segments.find((item) => item.lead === lead.lead);
      if (!segment) {
        return { lead: lead.lead, path: buildDigitizedWaveformPath(lead, imageWidth, imageHeight) };
      }
      const segmentWidth = Math.max(1, (segment.widthPercent / 100) * imageWidth);
      const segmentHeight = Math.max(1, (segment.heightPercent / 100) * imageHeight);
      const xOffset = (segment.xPercent / 100) * imageWidth;
      const yOffset = (segment.yPercent / 100) * imageHeight;
      const localPath = buildDigitizedWaveformPath(lead, segmentWidth, segmentHeight);
      if (!localPath) return { lead: lead.lead, path: "" };
      const translated = localPath.replace(/([ML])\s+([\d.]+)\s+([\d.]+)/g, (_match, command, x, y) => {
        return `${command} ${(Number(x) + xOffset).toFixed(2)} ${(Number(y) + yOffset).toFixed(2)}`;
      });
      return { lead: lead.lead, path: translated };
    })
    .filter((item) => item.path.length > 0);
}
