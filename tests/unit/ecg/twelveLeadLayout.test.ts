import { describe, expect, it } from "vitest";

import {
  allStandardLeads,
  buildTwelveLeadRegions,
  sampleIndexAtMs,
  sharedTimelineMs,
} from "@/components/ecg/viewer/rendering-engine/twelveLeadLayout";

describe("twelveLeadLayout", () => {
  it("builds 12-lead grid regions with rhythm strip", () => {
    const regions = buildTwelveLeadRegions(800, 600, "12-lead");
    expect(regions).toHaveLength(13);
    expect(regions[0]?.lead).toBe("I");
    expect(regions.some((region) => region.rhythmStrip)).toBe(true);
  });

  it("builds single-lead fullscreen region", () => {
    const regions = buildTwelveLeadRegions(640, 480, "single", "V5");
    expect(regions).toEqual([{ height: 480, lead: "V5", width: 640, x: 0, y: 0 }]);
  });

  it("synchronizes timeline ms across leads", () => {
    expect(sharedTimelineMs(500, 500)).toBe(1000);
    expect(sampleIndexAtMs(1000, 500, 2000)).toBe(500);
    expect(sampleIndexAtMs(999999, 500, 100)).toBe(99);
  });

  it("lists all standard leads", () => {
    expect(allStandardLeads()).toHaveLength(12);
  });
});
