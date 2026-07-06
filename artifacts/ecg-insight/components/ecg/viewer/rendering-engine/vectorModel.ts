import type { DigitalEcg, DigitalEcgLead } from "@/services/ecgProcessing";

import { gridSpacingPx } from "../ecgCalibrationMath";
import type { EcgGridGain, EcgPaperSpeed } from "../types";
import type { EcgTwelveLeadRegion, EcgVectorModel, EcgVectorPoint, EcgVectorSegment, EcgRenderViewport } from "./types";
import { subPixel, visibleSampleRange } from "./viewport";

/** Image → Digitized Signal → Vector Model */

function safeSamples(samples: number[]) {
  return samples.filter((sample) => Number.isFinite(sample));
}

export function sampleToVectorPoints(
  lead: DigitalEcgLead,
  width: number,
  height: number,
  gainScale: number,
  sampleStart: number,
  sampleEnd: number,
): EcgVectorPoint[] {
  const samples = safeSamples(lead.samples);
  if (samples.length < 2 || width <= 0 || height <= 0) return [];
  const start = Math.max(0, Math.min(sampleStart, samples.length - 1));
  const end = Math.max(start + 1, Math.min(sampleEnd, samples.length));
  const slice = samples.slice(start, end);
  const rate = lead.samplingRate || 500;
  const durationMs = (samples.length / rate) * 1000;
  const points: EcgVectorPoint[] = [];
  for (let i = 0; i < slice.length; i += 1) {
    const globalIndex = start + i;
    const t = (globalIndex / Math.max(samples.length - 1, 1)) * durationMs;
    const x = subPixel((globalIndex / Math.max(samples.length - 1, 1)) * width);
    const y = subPixel(height / 2 - slice[i]! * (height * 0.28) * gainScale);
    points.push({ t, v: slice[i]!, x, y });
  }
  return points;
}

export function buildVectorSegment(
  lead: DigitalEcgLead,
  region: Pick<EcgTwelveLeadRegion, "height" | "width">,
  gainScale: number,
  viewport: EcgRenderViewport,
): EcgVectorSegment {
  const samples = safeSamples(lead.samples);
  const range = visibleSampleRange(samples.length, viewport);
  const points = sampleToVectorPoints(lead, region.width, region.height, gainScale, range.start, range.end);
  return {
    lead: lead.lead,
    points,
    sampleEnd: range.end,
    sampleStart: range.start,
  };
}

export function buildVectorModelFromDigitalEcg(
  digitalEcg: DigitalEcg,
  regions: EcgTwelveLeadRegion[],
  viewport: EcgRenderViewport,
  gainScale = 1,
): EcgVectorModel {
  const rate = digitalEcg.leads[0]?.samplingRate ?? 500;
  const maxSamples = Math.max(...digitalEcg.leads.map((l) => l.samples.length), 0);
  const durationMs = maxSamples > 0 ? (maxSamples / rate) * 1000 : 0;
  const leads = digitalEcg.leads.map((lead) => {
    const region = regions.find((r) => r.lead === lead.lead) ?? regions[0]!;
    return buildVectorSegment(lead, region, gainScale, viewport);
  });
  return { durationMs, leads, samplingRate: rate, source: "digitized" };
}

export function vectorPointsToSvgPath(points: EcgVectorPoint[], offsetX = 0, offsetY = 0): string {
  if (points.length < 2) return "";
  return points
    .map((point, index) => {
      const x = subPixel(point.x + offsetX);
      const y = subPixel(point.y + offsetY);
      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");
}

export function vectorPointsToSmoothPath(points: EcgVectorPoint[], offsetX = 0, offsetY = 0): string {
  if (points.length < 2) return vectorPointsToSvgPath(points, offsetX, offsetY);
  let path = `M ${subPixel(points[0]!.x + offsetX)} ${subPixel(points[0]!.y + offsetY)}`;
  for (let i = 1; i < points.length; i += 1) {
    const prev = points[i - 1]!;
    const curr = points[i]!;
    const cx = subPixel((prev.x + curr.x) / 2 + offsetX);
    const cy = subPixel((prev.y + curr.y) / 2 + offsetY);
    path += ` Q ${subPixel(prev.x + offsetX)} ${subPixel(prev.y + offsetY)} ${cx} ${cy}`;
    if (i === points.length - 1) {
      path += ` L ${subPixel(curr.x + offsetX)} ${subPixel(curr.y + offsetY)}`;
    }
  }
  return path;
}

export function gridMinorSpacing(speed: EcgPaperSpeed, gain: EcgGridGain, zoom: number) {
  return gridSpacingPx(speed, gain) * zoom;
}
