import { describe, expect, it } from "vitest";

import {
  buildVectorModelFromDigitalEcg,
  buildVectorSegment,
  gridMinorSpacing,
  sampleToVectorPoints,
  vectorPointsToSmoothPath,
  vectorPointsToSvgPath,
} from "@/components/ecg/viewer/rendering-engine/vectorModel";
import type { DigitalEcg } from "@/services/ecgProcessing";
import type { EcgRenderViewport, EcgTwelveLeadRegion } from "@/components/ecg/viewer/rendering-engine/types";

function digitalEcg(): DigitalEcg {
  return {
    annotations: [],
    format: "json",
    leads: [
      { durationSeconds: 2, lead: "II", samples: Array.from({ length: 1000 }, (_, i) => Math.sin(i / 40)), samplingRate: 500 },
      { durationSeconds: 2, lead: "V1", samples: Array.from({ length: 1000 }, (_, i) => Math.cos(i / 40)), samplingRate: 500 },
    ],
    metadata: {},
  } as DigitalEcg;
}

const viewport: EcgRenderViewport = {
  containerHeight: 300,
  containerWidth: 600,
  dpr: 1,
  panX: 0,
  panY: 0,
  signalHeight: 200,
  signalWidth: 1000,
  zoom: 1,
};

const regions: EcgTwelveLeadRegion[] = [
  { height: 120, lead: "II", width: 400, x: 0, y: 0 },
  { height: 120, lead: "V1", width: 400, x: 0, y: 140 },
];

describe("rendering-engine vectorModel", () => {
  it("converts sample slices to vector points for wave rendering", () => {
    const lead = digitalEcg().leads[0]!;
    const points = sampleToVectorPoints(lead, 400, 120, 1, 0, 200);
    expect(points.length).toBe(200);
    expect(points[0]).toMatchObject({ x: expect.any(Number), y: expect.any(Number), t: expect.any(Number) });
  });

  it("builds vector segments within visible sample range", () => {
    const segment = buildVectorSegment(digitalEcg().leads[0]!, regions[0]!, 1, viewport);
    expect(segment.lead).toBe("II");
    expect(segment.points.length).toBeGreaterThan(1);
  });

  it("assembles twelve-lead vector model from digitized ECG", () => {
    const model = buildVectorModelFromDigitalEcg(digitalEcg(), regions, viewport);
    expect(model.source).toBe("digitized");
    expect(model.leads).toHaveLength(2);
    expect(model.durationMs).toBeGreaterThan(0);
  });

  it("renders SVG paths from vector points", () => {
    const lead = digitalEcg().leads[0]!;
    const points = sampleToVectorPoints(lead, 200, 80, 1, 0, 50);
    expect(vectorPointsToSvgPath(points)).toMatch(/^M /);
    expect(vectorPointsToSmoothPath(points)).toContain(" Q ");
  });

  it("scales minor grid spacing with zoom", () => {
    expect(gridMinorSpacing(25, 10, 2)).toBeCloseTo(28, 0);
  });
});
