import { describe, expect, it } from "vitest";

import {
  buildMonitorWaveformPath,
  buildScrollingMonitorPath,
  durationMsForLead,
  msToSampleIndex,
  sampleIndexToMs,
} from "@/components/ecg/viewer/ecgMonitorPath";
import type { DigitalEcgLead } from "@/services/ecgProcessing";

function syntheticLead(samples: number[], samplingRate = 500): DigitalEcgLead {
  return {
    durationSeconds: samples.length / samplingRate,
    lead: "II",
    samples,
    samplingRate,
  };
}

describe("ecgMonitorPath", () => {
  it("returns empty path when fewer than two samples", () => {
    expect(buildMonitorWaveformPath(syntheticLead([0.1]), 400, 120, 1)).toBe("");
    expect(buildMonitorWaveformPath(syntheticLead([]), 400, 120, 1)).toBe("");
  });

  it("builds SVG move/line path for waveform rendering", () => {
    const path = buildMonitorWaveformPath(syntheticLead([0, 0.5, 1, 0.3]), 200, 100, 1);
    expect(path.startsWith("M ")).toBe(true);
    expect(path).toContain("L ");
    expect(path.split(" ").length).toBeGreaterThan(6);
  });

  it("wraps scrolling window across sample buffer", () => {
    const samples = Array.from({ length: 1000 }, (_, i) => Math.sin(i / 20));
    const lead = syntheticLead(samples);
    const pathA = buildScrollingMonitorPath(lead, 300, 80, 1, 0);
    const pathB = buildScrollingMonitorPath(lead, 300, 80, 1, 900);
    expect(pathA).not.toBe("");
    expect(pathB).not.toBe("");
  });

  it("converts between milliseconds and sample indices", () => {
    const lead = syntheticLead(Array(2500).fill(0), 500);
    expect(msToSampleIndex(lead, 1000)).toBe(500);
    expect(sampleIndexToMs(lead, 250)).toBe(500);
    expect(durationMsForLead(lead)).toBe(5000);
  });

  it("falls back to durationSeconds when sampling rate missing", () => {
    const lead: DigitalEcgLead = { durationSeconds: 8, lead: "II", samples: [0, 1, 0], samplingRate: 0 };
    expect(msToSampleIndex(lead, 500)).toBe(0);
    expect(durationMsForLead(lead)).toBe(8000);
  });
});
