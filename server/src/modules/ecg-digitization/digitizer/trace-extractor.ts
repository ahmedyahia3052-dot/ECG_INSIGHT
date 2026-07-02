import {
  DEFAULT_SAMPLING_RATE,
  STANDARD_LEADS,
  type DigitizedLead,
  type GridCalibration,
  type LeadSegment,
} from "../types";

function extractLeadTrace(
  data: Uint8Array,
  width: number,
  height: number,
  segment: LeadSegment,
  sampleCount: number,
): number[] {
  const x0 = Math.floor((segment.xPercent / 100) * width);
  const y0 = Math.floor((segment.yPercent / 100) * height);
  const x1 = Math.min(width - 1, Math.floor(((segment.xPercent + segment.widthPercent) / 100) * width));
  const y1 = Math.min(height - 1, Math.floor(((segment.yPercent + segment.heightPercent) / 100) * height));
  const regionWidth = Math.max(1, x1 - x0);
  const regionHeight = Math.max(1, y1 - y0);
  const midY = y0 + Math.floor(regionHeight / 2);

  const raw = Array.from({ length: sampleCount }, (_v, index) => {
    const x = x0 + Math.floor((index / Math.max(sampleCount - 1, 1)) * (regionWidth - 1));
    let darkest = 255;
    let darkestY = midY;
    for (let y = y0; y <= y1; y += 1) {
      const value = data[y * width + x] ?? 255;
      if (value < darkest) {
        darkest = value;
        darkestY = y;
      }
    }
    const normalized = (midY - darkestY) / Math.max(regionHeight / 2, 1);
    return Number(normalized.toFixed(5));
  });

  const baselineWindow = Math.max(24, Math.round(DEFAULT_SAMPLING_RATE * 0.12));
  const baselineRemoved = raw.map((sample, index) => {
    const start = Math.max(0, index - baselineWindow);
    const end = Math.min(raw.length, index + baselineWindow);
    const baseline = raw.slice(start, end).reduce((sum, value) => sum + value, 0) / Math.max(end - start, 1);
    return sample - baseline * 0.15;
  });

  const smoothed = baselineRemoved.map((sample, index) => {
    const previous = baselineRemoved[index - 1] ?? sample;
    const next = baselineRemoved[index + 1] ?? sample;
    return Number(((previous + sample * 2 + next) / 4).toFixed(5));
  });

  const maxAmplitude = Math.max(0.15, ...smoothed.map((sample) => Math.abs(sample)));
  return smoothed.map((sample) => Number((sample / maxAmplitude).toFixed(5)));
}

export function digitizeLeadsFromImage(input: {
  calibration: GridCalibration;
  data: Uint8Array;
  durationSeconds: number;
  height: number;
  leadSegments: LeadSegment[];
  width: number;
}): DigitizedLead[] {
  const sampleCount = Math.round(input.durationSeconds * DEFAULT_SAMPLING_RATE);
  return STANDARD_LEADS.map((lead) => {
    const segment = input.leadSegments.find((item) => item.lead === lead);
    const samples = segment
      ? extractLeadTrace(input.data, input.width, input.height, segment, sampleCount)
      : Array.from({ length: sampleCount }, () => 0);
    const scaled = samples.map((sample) => Number((sample * (10 / input.calibration.gainMmPerMv)).toFixed(5)));
    return {
      durationSeconds: input.durationSeconds,
      lead,
      samples: scaled,
      samplingRate: DEFAULT_SAMPLING_RATE,
    };
  });
}

export function estimateDurationSeconds(originalName: string, isPdf: boolean) {
  const lower = originalName.toLowerCase();
  if (lower.includes("rhythm") || isPdf) return 10;
  return 2.5;
}
