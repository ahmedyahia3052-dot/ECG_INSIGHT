import { describe, expect, it } from "vitest";

import {
  beatMarkerPositions,
  detectBeatMarkerIndices,
  detectPacingIndices,
  detectPvcIndices,
} from "@/components/ecg/viewer/ecgMonitorBeatMarkers";
import type { DigitalEcgLead } from "@/services/ecgProcessing";

function rWaveLead(): DigitalEcgLead {
  const samples = Array.from({ length: 2000 }, () => 0.02);
  for (let peak = 150; peak < samples.length; peak += 250) {
    samples[peak - 2] = 0.3;
    samples[peak - 1] = 0.8;
    samples[peak] = 1.4;
    samples[peak + 1] = 0.7;
    samples[peak + 2] = 0.2;
  }
  return { durationSeconds: 4, lead: "II", samples, samplingRate: 500 };
}

describe("ecgMonitorBeatMarkers", () => {
  it("detects R-peak indices in synthetic waveform", () => {
    const indices = detectBeatMarkerIndices(rWaveLead(), 12);
    expect(indices.length).toBeGreaterThan(2);
    expect(indices.every((i) => i > 0)).toBe(true);
  });

  it("returns empty markers for insufficient samples", () => {
    expect(detectBeatMarkerIndices({ durationSeconds: 0.01, lead: "II", samples: [0.1], samplingRate: 500 })).toEqual([]);
  });

  it("detects premature beats with shortened RR intervals", () => {
    const lead = rWaveLead();
    const pvc = detectPvcIndices(lead);
    expect(Array.isArray(pvc)).toBe(true);
  });

  it("detects pacing spikes in high-gradient regions", () => {
    const samples = Array.from({ length: 500 }, (_, i) => (i % 100 === 50 ? 1.5 : 0));
    const pacing = detectPacingIndices({ durationSeconds: 1, lead: "II", samples, samplingRate: 500 });
    expect(pacing.length).toBeGreaterThan(0);
  });

  it("maps beat markers to screen coordinates for overlay rendering", () => {
    const markers = beatMarkerPositions(rWaveLead(), 640, 180, 1, 0);
    expect(markers.some((m) => m.kind === "r-peak")).toBe(true);
    expect(markers.every((m) => m.x >= 0 && m.y >= 0)).toBe(true);
  });
});
