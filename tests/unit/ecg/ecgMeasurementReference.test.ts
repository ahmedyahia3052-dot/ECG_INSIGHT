import { describe, expect, it } from "vitest";

import {
  evaluateMeasurementReference,
  formatReferenceRange,
} from "@/components/ecg/viewer/ecgMeasurementReference";

describe("ecgMeasurementReference", () => {
  it("formats reference ranges for common measurement kinds", () => {
    expect(formatReferenceRange("heart_rate")).toContain("bpm");
    expect(formatReferenceRange("electrical_axis")).toContain("°");
    expect(formatReferenceRange("custom" as never)).toBe("Refer to institutional norms");
  });

  it("flags critical-high heart rate values", () => {
    const result = evaluateMeasurementReference("heart_rate", 180, "bpm");
    expect(result.status).toBe("critical-high");
    expect(result.clinicalSignificance).toContain("exceeds");
  });

  it("flags borderline PR prolongation", () => {
    const result = evaluateMeasurementReference("pr_interval", 210, "ms");
    expect(result.status).toBe("borderline");
  });

  it("returns normal status within typical range", () => {
    const result = evaluateMeasurementReference("qrs_duration", 90, "ms");
    expect(result.status).toBe("normal");
    expect(result.clinicalSignificance).toContain("within");
  });

  it("handles unknown kinds gracefully", () => {
    const result = evaluateMeasurementReference("custom", 42, "ms");
    expect(result.status).toBe("unknown");
  });
});
