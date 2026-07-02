import { STANDARD_LEADS, type ImageAnalysisMetrics, type LeadSegment } from "../types";

function regionSignalDensity(data: Uint8Array, width: number, height: number, segment: LeadSegment) {
  const x0 = Math.floor((segment.xPercent / 100) * width);
  const y0 = Math.floor((segment.yPercent / 100) * height);
  const x1 = Math.min(width, Math.floor(((segment.xPercent + segment.widthPercent) / 100) * width));
  const y1 = Math.min(height, Math.floor(((segment.yPercent + segment.heightPercent) / 100) * height));
  let dark = 0;
  let total = 0;
  for (let y = y0; y < y1; y += 2) {
    for (let x = x0; x < x1; x += 2) {
      total += 1;
      if ((data[y * width + x] ?? 255) < 180) dark += 1;
    }
  }
  return total ? dark / total : 0;
}

export function detectStandardLeadLayout(
  data: Uint8Array,
  width: number,
  height: number,
  metrics: ImageAnalysisMetrics,
): LeadSegment[] {
  const columns = 4;
  const rows = 3;
  const baseConfidence = Number(Math.min(0.98, Math.max(0.55, 0.62 + metrics.edgeDensity * 1.4 + metrics.entropy * 0.1 - metrics.noise * 0.25)).toFixed(2));

  return STANDARD_LEADS.map((lead, index) => {
    const segment: LeadSegment = {
      confidence: baseConfidence,
      heightPercent: 100 / rows - 5,
      lead,
      widthPercent: 100 / columns - 4,
      xPercent: (index % columns) * (100 / columns) + 2,
      yPercent: Math.floor(index / columns) * (100 / rows) + 3,
    };
    const density = regionSignalDensity(data, width, height, segment);
    segment.confidence = Number(Math.min(0.99, Math.max(0.45, baseConfidence * 0.6 + density * 0.5)).toFixed(2));
    return segment;
  });
}

export function missingLeads(segments: LeadSegment[], threshold = 0.5) {
  return segments.filter((segment) => segment.confidence < threshold).map((segment) => segment.lead);
}
