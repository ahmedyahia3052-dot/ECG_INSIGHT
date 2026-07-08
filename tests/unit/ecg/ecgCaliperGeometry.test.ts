import { describe, expect, it } from "vitest";

import {
  arcPath,
  caliperPathPoints,
  caliperPrimaryUnit,
  computeAngleDegrees,
  deltaPixelsForCaliper,
  polylineLength,
} from "@/components/ecg/viewer/ecgCaliperGeometry";
import type { EcgCaliper } from "@/components/ecg/viewer/measurementTypes";

function baseCaliper(overrides: Partial<EcgCaliper>): EcgCaliper {
  return {
    color: "#2563EB",
    createdAt: "2026-01-01T00:00:00.000Z",
    createdBy: "QA",
    end: { x: 100, y: 0 },
    hidden: false,
    id: "c1",
    kind: "horizontal",
    measurementKind: "rr_interval",
    start: { x: 0, y: 0 },
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("ecgCaliperGeometry", () => {
  it("computes polyline length across waypoints", () => {
    const length = polylineLength([
      { x: 0, y: 0 },
      { x: 3, y: 4 },
      { x: 3, y: 8 },
    ]);
    expect(length).toBe(9);
  });

  it("resolves caliper path points for multi-segment calipers", () => {
    const waypoints = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
    ];
    const caliper = baseCaliper({ kind: "multi", waypoints });
    expect(caliperPathPoints(caliper)).toEqual(waypoints);
    expect(deltaPixelsForCaliper(caliper)).toBe(20);
  });

  it("measures horizontal, vertical, and angle calipers", () => {
    expect(deltaPixelsForCaliper(baseCaliper({ kind: "horizontal" }))).toBe(100);
    expect(deltaPixelsForCaliper(baseCaliper({ kind: "vertical", end: { x: 0, y: 80 } }))).toBe(80);
    const angle = computeAngleDegrees({ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 0, y: 10 });
    expect(angle).toBe(90);
  });

  it("maps caliper kinds to clinical units", () => {
    expect(caliperPrimaryUnit("angle")).toBe("deg");
    expect(caliperPrimaryUnit("vertical", "st_elevation")).toBe("mm");
    expect(caliperPrimaryUnit("vertical", "r_amplitude")).toBe("mV");
    expect(caliperPrimaryUnit("horizontal")).toBe("ms");
  });

  it("builds SVG arc path for angle overlay rendering", () => {
    const path = arcPath({ x: 50, y: 50 }, { x: 80, y: 50 }, { x: 50, y: 20 });
    expect(path.startsWith("M ")).toBe(true);
    expect(path).toContain(" A ");
  });
});
