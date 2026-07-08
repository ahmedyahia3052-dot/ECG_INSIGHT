import { describe, expect, it } from "vitest";

import {
  deriveSignalQualityFlags,
  signalQualityLabel,
  signalQualityTone,
} from "@/components/ecg/viewer/clinical-visualization/signalQuality";
import type { DigitalEcg } from "@/services/ecgProcessing";

function digitalEcg(overrides: Partial<DigitalEcg> = {}): DigitalEcg {
  return {
    annotations: [],
    format: "json",
    leads: [],
    metadata: {},
    quality: { score: 95, warnings: [] },
    validation: { warnings: [] },
    ...overrides,
  } as DigitalEcg;
}

describe("signalQuality", () => {
  it("returns no flags for high-quality signals", () => {
    expect(deriveSignalQualityFlags(digitalEcg())).toEqual([]);
    expect(signalQualityLabel([])).toBe("Good");
    expect(signalQualityTone([])).toBe("success");
  });

  it("flags poor signal when quality score is low", () => {
    const flags = deriveSignalQualityFlags(digitalEcg({ quality: { score: 40, warnings: [] } }));
    expect(flags.some((f) => f.type === "poor-signal" && f.severity === "critical")).toBe(true);
    expect(signalQualityTone(flags)).toBe("critical");
  });

  it("derives warning flags from quality and validation messages", () => {
    const flags = deriveSignalQualityFlags(
      digitalEcg({
        quality: { score: 70, warnings: ["Baseline wander detected", "50Hz powerline"] },
        validation: { warnings: ["Lead off on V2"] },
      }),
    );
    expect(flags.map((f) => f.type)).toEqual(expect.arrayContaining(["baseline", "powerline", "lead-off"]));
    expect(signalQualityLabel(flags)).toBe("Lead Off");
  });

  it("deduplicates repeated warning categories", () => {
    const flags = deriveSignalQualityFlags(
      digitalEcg({ quality: { score: 65, warnings: ["noise", "extra noise", "artifact"] } }),
    );
    const types = flags.map((f) => f.type);
    expect(new Set(types).size).toBe(types.length);
  });
});
