import type { DigitalEcgLead } from "@/services/ecgProcessing";

import { detectBeatMarkerIndices, detectPvcIndices } from "../ecgMonitorBeatMarkers";

export type ClinicalMarkerKind = "af" | "ai" | "pvc" | "qt" | "r-peak" | "st";

export type ClinicalMarker = {
  index: number;
  kind: ClinicalMarkerKind;
  label?: string;
  x: number;
  y: number;
};

export function detectStElevationIndices(lead: DigitalEcgLead, windowStart: number, windowEnd: number): number[] {
  const samples = lead.samples;
  const rate = lead.samplingRate ?? 500;
  const jOffset = Math.round(rate * 0.08);
  const stIndices: number[] = [];
  const rPeaks = detectBeatMarkerIndices(lead, 32).filter((i) => i >= windowStart && i < windowEnd);
  for (const r of rPeaks) {
    const st = Math.min(samples.length - 1, r + jOffset);
    const baseline = samples[Math.max(0, st - Math.round(rate * 0.04))] ?? 0;
    if ((samples[st] ?? 0) - baseline > 0.12) stIndices.push(st);
  }
  return stIndices;
}

export function detectQtProlongationIndices(lead: DigitalEcgLead, windowStart: number, windowEnd: number): number[] {
  const samples = lead.samples;
  const rate = lead.samplingRate ?? 500;
  const qtIndices: number[] = [];
  const rPeaks = detectBeatMarkerIndices(lead, 24).filter((i) => i >= windowStart && i < windowEnd);
  for (const r of rPeaks) {
    const qStart = Math.max(0, r - Math.round(rate * 0.04));
    let tEnd = Math.min(samples.length - 1, r + Math.round(rate * 0.36));
    while (tEnd > r && Math.abs(samples[tEnd]!) < 0.04) tEnd -= 1;
    const qtMs = ((tEnd - qStart) / rate) * 1000;
    if (qtMs > 460) qtIndices.push(tEnd);
  }
  return qtIndices;
}

export function detectAfIrregularity(lead: DigitalEcgLead): boolean {
  const rPeaks = detectBeatMarkerIndices(lead, 48);
  if (rPeaks.length < 6) return false;
  const intervals: number[] = [];
  for (let i = 1; i < rPeaks.length; i += 1) intervals.push(rPeaks[i]! - rPeaks[i - 1]!);
  const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  const variance = intervals.reduce((a, b) => a + (b - mean) ** 2, 0) / intervals.length;
  const cv = Math.sqrt(variance) / Math.max(mean, 1);
  return cv > 0.22;
}

export function buildClinicalMarkers(
  lead: DigitalEcgLead,
  regionX: number,
  regionY: number,
  regionW: number,
  regionH: number,
  gainScale: number,
  offsetIndex: number,
  windowSize: number,
  padX: number,
  padY: number,
  aiAnnotations?: Array<{ index: number; label: string }>,
): ClinicalMarker[] {
  const traceW = regionW - padX * 2;
  const traceH = regionH - padY * 2;
  const start = Math.max(0, Math.floor(offsetIndex) % Math.max(lead.samples.length, 1));
  const end = start + windowSize;

  const toPoint = (index: number, kind: ClinicalMarkerKind, label?: string): ClinicalMarker => {
    const local = index - start;
    const x = regionX + padX + (local / Math.max(windowSize - 1, 1)) * traceW;
    const y = regionY + padY + traceH / 2 - lead.samples[index]! * (traceH * 0.42) * gainScale;
    return { index, kind, label, x, y };
  };

  const markers: ClinicalMarker[] = detectBeatMarkerIndices(lead)
    .filter((i) => i >= start && i < end)
    .map((i) => toPoint(i, "r-peak"));

  detectPvcIndices(lead)
    .filter((i) => i >= start && i < end)
    .forEach((i) => markers.push(toPoint(i, "pvc")));

  detectStElevationIndices(lead, start, end).forEach((i) => markers.push(toPoint(i, "st", "ST↑")));
  detectQtProlongationIndices(lead, start, end).forEach((i) => markers.push(toPoint(i, "qt", "QT")));

  if (detectAfIrregularity(lead)) {
    const mid = start + Math.floor(windowSize / 2);
    if (mid >= start && mid < end) markers.push(toPoint(mid, "af", "AF"));
  }

  (aiAnnotations ?? []).filter((a) => a.index >= start && a.index < end).forEach((a) => markers.push(toPoint(a.index, "ai", a.label)));

  return markers;
}

export function drawClinicalMarker(ctx: CanvasRenderingContext2D, marker: ClinicalMarker) {
  const colors: Record<ClinicalMarkerKind, string> = {
    af: "#F472B6",
    ai: "#38BDF8",
    pvc: "#F87171",
    qt: "#A78BFA",
    "r-peak": "#FACC15",
    st: "#FB923C",
  };
  const color = colors[marker.kind];
  if (marker.kind === "pvc" || marker.kind === "st") {
    ctx.fillStyle = color;
    ctx.fillRect(marker.x - 3, marker.y - 7, 6, 14);
    return;
  }
  if (marker.kind === "qt" || marker.kind === "af" || marker.kind === "ai") {
    ctx.fillStyle = color;
    ctx.font = "bold 8px system-ui,sans-serif";
    ctx.fillText(marker.label ?? marker.kind.toUpperCase(), marker.x + 2, marker.y - 4);
    return;
  }
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(marker.x, marker.y - 6);
  ctx.lineTo(marker.x + 4, marker.y);
  ctx.lineTo(marker.x, marker.y + 6);
  ctx.lineTo(marker.x - 4, marker.y);
  ctx.closePath();
  ctx.fill();
}
