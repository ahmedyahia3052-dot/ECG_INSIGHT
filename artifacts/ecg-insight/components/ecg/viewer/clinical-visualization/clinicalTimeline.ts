import type { DigitalEcgLead } from "@/services/ecgProcessing";

export type TimelineMarker = {
  color: string;
  kind: "af" | "ai" | "bookmark" | "note" | "pause" | "pvc" | "r-peak";
  label: string;
  ms: number;
};

export function buildTimelineMarkers(
  lead: DigitalEcgLead | null | undefined,
  aiLabels: string[] = [],
): TimelineMarker[] {
  if (!lead?.samples?.length) return [];
  const rate = lead.samplingRate || 500;
  const markers: TimelineMarker[] = [];
  const samples = lead.samples;

  for (let i = 1; i < samples.length - 1; i += 1) {
    const prev = samples[i - 1]!;
    const curr = samples[i]!;
    const next = samples[i + 1]!;
    if (curr > prev && curr >= next && curr > 0.35) {
      const ms = (i / rate) * 1000;
      if (markers.length === 0 || ms - markers[markers.length - 1]!.ms > 280) {
        markers.push({ color: "#22C55E", kind: "r-peak", label: "R", ms });
      }
    }
  }

  for (let i = 2; i < samples.length - 2; i += 1) {
    const ms = (i / rate) * 1000;
    const prev = samples[i - 1]!;
    const curr = samples[i]!;
    if (curr > 0.55 && curr > prev * 1.8 && curr > samples[i - 2]! * 1.5) {
      markers.push({ color: "#F87171", kind: "pvc", label: "PVC", ms });
    }
  }

  aiLabels.forEach((label, index) => {
    markers.push({ color: "#FACC15", kind: "ai", label, ms: (index + 1) * 800 });
  });

  return markers.sort((a, b) => a.ms - b.ms);
}

export function viewportIndicatorRatio(viewportStartMs: number, viewportEndMs: number, durationMs: number) {
  if (durationMs <= 0) return { left: 0, width: 1 };
  return {
    left: Math.max(0, viewportStartMs / durationMs),
    width: Math.min(1, (viewportEndMs - viewportStartMs) / durationMs),
  };
}
