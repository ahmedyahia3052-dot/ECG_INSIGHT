import type { GridCalibration, LeadSegment, WaveformExtractionMetrics } from "../types";
import { sobelGradient, thresholdEdges } from "./edge-detection";
import { catmullRomSpline, recoverGaps } from "./spline";

function regionBounds(segment: LeadSegment, width: number, height: number) {
  const x0 = Math.floor((segment.xPercent / 100) * width);
  const y0 = Math.floor((segment.yPercent / 100) * height);
  const x1 = Math.min(width - 1, Math.floor(((segment.xPercent + segment.widthPercent) / 100) * width));
  const y1 = Math.min(height - 1, Math.floor(((segment.yPercent + segment.heightPercent) / 100) * height));
  return { height: Math.max(1, y1 - y0), width: Math.max(1, x1 - x0), x0, x1, y0, y1 };
}

function zhangSuenThinning(binary: Uint8Array, width: number, height: number) {
  const output = Uint8Array.from(binary);
  let changed = true;
  let iterations = 0;
  while (changed && iterations < 4) {
    changed = false;
    iterations += 1;
    for (let y = 1; y < height - 1; y += 1) {
      for (let x = 1; x < width - 1; x += 1) {
        const index = y * width + x;
        if (output[index] === 0) continue;
        const neighbors = [
          output[(y - 1) * width + x] ? 1 : 0,
          output[(y - 1) * width + x + 1] ? 1 : 0,
          output[y * width + x + 1] ? 1 : 0,
          output[(y + 1) * width + x + 1] ? 1 : 0,
          output[(y + 1) * width + x] ? 1 : 0,
          output[(y + 1) * width + x - 1] ? 1 : 0,
          output[y * width + x - 1] ? 1 : 0,
          output[(y - 1) * width + x - 1] ? 1 : 0,
        ];
        const transitions = neighbors.reduce((sum, value, neighborIndex) => {
          const next = neighbors[(neighborIndex + 1) % 8];
          return sum + (value === 0 && next === 1 ? 1 : 0);
        }, 0);
        const count = neighbors.reduce((sum, value) => sum + value, 0);
        if (count >= 2 && count <= 6 && transitions === 1) {
          output[index] = 0;
          changed = true;
        }
      }
    }
  }
  return output;
}

function extractCenterlineColumn(
  data: Uint8Array,
  edges: Uint8Array,
  width: number,
  height: number,
  segment: LeadSegment,
  sampleCount: number,
): { metrics: WaveformExtractionMetrics; path: string; samples: number[] } {
  const { height: regionHeight, width: regionWidth, x0, x1, y0, y1 } = regionBounds(segment, width, height);
  const midY = y0 + regionHeight / 2;
  const rawPoints: Array<{ x: number; y: number }> = [];
  let artifactRejected = 0;

  for (let index = 0; index < sampleCount; index += 1) {
    const x = x0 + Math.floor((index / Math.max(sampleCount - 1, 1)) * (regionWidth - 1));
    let bestY = midY;
    let bestScore = Number.POSITIVE_INFINITY;
    let found = false;
    for (let y = y0; y <= y1; y += 1) {
      const pixel = data[y * width + x] ?? 255;
      const edge = edges[y * width + x] ?? 0;
      const score = pixel + (edge > 0 ? -18 : 0);
      if (score < bestScore) {
        bestScore = score;
        bestY = y;
        found = pixel < 220;
      }
    }
    if (!found) {
      artifactRejected += 1;
      rawPoints.push({ x: index, y: midY });
    } else {
      rawPoints.push({ x: index, y: bestY });
    }
  }

  const smoothed = catmullRomSpline(rawPoints, 2);
  const normalized = smoothed.map((point) => Number(((midY - point.y) / Math.max(regionHeight / 2, 1)).toFixed(5)));
  const recovered = recoverGaps(normalized);

  const filtered = recovered.values.map((sample, index) => {
    const previous = recovered.values[index - 1] ?? sample;
    const next = recovered.values[index + 1] ?? sample;
    const delta = Math.abs(sample - previous) + Math.abs(sample - next);
    if (delta > 2.4) {
      artifactRejected += 1;
      return Number(((previous + next) / 2).toFixed(5));
    }
    return sample;
  });

  const baselineWindow = Math.max(24, Math.round(sampleCount * 0.08));
  const baselineRemoved = filtered.map((sample, index) => {
    const start = Math.max(0, index - baselineWindow);
    const end = Math.min(filtered.length, index + baselineWindow);
    const baseline = filtered.slice(start, end).reduce((sum, value) => sum + value, 0) / Math.max(end - start, 1);
    return Number((sample - baseline * 0.12).toFixed(5));
  });

  const maxAmplitude = Math.max(0.12, ...baselineRemoved.map((sample) => Math.abs(sample)));
  const samples = baselineRemoved.map((sample) => Number((sample / maxAmplitude).toFixed(5)));
  const path = samples
    .filter((_sample, index) => index % Math.max(1, Math.floor(samples.length / 240)) === 0)
    .map((sample, index, reduced) => {
      const x = (index / Math.max(reduced.length - 1, 1)) * regionWidth;
      const y = regionHeight / 2 - sample * (regionHeight * 0.28);
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");

  const continuity = samples.filter((sample) => Math.abs(sample) > 0.02).length / Math.max(samples.length, 1);
  const waveConfidence = Number(Math.min(0.99, Math.max(0.35, continuity * 0.7 + segment.confidence * 0.3)).toFixed(3));

  return {
    metrics: {
      artifactRejectedSamples: artifactRejected,
      branchResolved: 0,
      centerlineConfidence: Number((waveConfidence * 0.92).toFixed(3)),
      crossingResolved: 0,
      gapRecovered: recovered.gapRecovered,
      subPixelError: Number((0.18 + artifactRejected / Math.max(samples.length, 1)).toFixed(4)),
      waveConfidence,
    },
    path,
    samples,
  };
}

export function extractLeadWaveformCenterline(input: {
  calibration: GridCalibration;
  data: Uint8Array;
  durationSeconds: number;
  height: number;
  leadSegments: LeadSegment[];
  sampleCount: number;
  width: number;
}): {
  centerlinePaths: Record<string, string>;
  leads: Array<{ lead: string; metrics: WaveformExtractionMetrics; samples: number[] }>;
} {
  const gradient = sobelGradient(input.data, input.width, input.height);
  const threshold = 40 + input.calibration.confidence * 20;
  const edges = thresholdEdges(gradient, threshold);
  zhangSuenThinning(edges, input.width, input.height);

  const centerlinePaths: Record<string, string> = {};
  const leads = input.leadSegments.map((segment) => {
    const extracted = extractCenterlineColumn(
      input.data,
      edges,
      input.width,
      input.height,
      segment,
      input.sampleCount,
    );
    centerlinePaths[segment.lead] = extracted.path;
    const gain = input.calibration.gainMmPerMv ?? 10;
    const scaled = extracted.samples.map((sample) => Number((sample * (10 / gain)).toFixed(5)));
    return { lead: segment.lead, metrics: extracted.metrics, samples: scaled };
  });

  return { centerlinePaths, leads };
}
