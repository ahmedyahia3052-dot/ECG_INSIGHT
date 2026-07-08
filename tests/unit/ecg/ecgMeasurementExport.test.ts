import { describe, expect, it } from "vitest";

import { measurementsToCsv } from "@/components/ecg/viewer/ecgMeasurementExport";

describe("ecgMeasurementExport", () => {
  it("exports measurements as CSV with escaped commas", () => {
    const csv = measurementsToCsv([
      {
        caliperId: "c1",
        doctorNotes: "note, with comma",
        confidence: 0.9,
        end: { x: 10, y: 0 },
        hidden: false,
        id: "m1",
        kind: "horizontal",
        name: "RR",
        operator: "Dr. QA",
        start: { x: 0, y: 0 },
        timestamp: "2026-01-01T00:00:00.000Z",
        type: "interval",
        unit: "ms",
        updatedAt: "2026-01-01T00:00:00.000Z",
        value: 800,
      },
    ]);
    expect(csv.split("\n")).toHaveLength(2);
    expect(csv).toContain('"note, with comma"');
    expect(csv.startsWith("id,name,abbreviation,type,kind,")).toBe(true);
  });

  it("handles empty measurement list", () => {
    const csv = measurementsToCsv([]);
    expect(csv.trim().split("\n")).toHaveLength(1);
  });
});
