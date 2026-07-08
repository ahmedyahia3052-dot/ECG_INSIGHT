import { describe, expect, it } from "vitest";

import {
  leadBaselinePoint,
  pointToSyncedTimestamp,
  replicateHorizontalCaliper,
  syncTimestampMarkers,
} from "@/components/ecg/viewer/ecgMultiLeadSync";
import type { EcgCaliper } from "@/components/ecg/viewer/measurementTypes";

const grid = { gain: 10 as const, speed: 25 as const };

function horizontalCaliper(): EcgCaliper {
  return {
    color: "#2563EB",
    createdAt: "2026-01-01T00:00:00.000Z",
    createdBy: "QA",
    end: { x: 220, y: 120 },
    hidden: false,
    id: "c-rr",
    kind: "horizontal",
    lead: "II",
    measurementKind: "rr_interval",
    start: { x: 120, y: 120 },
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

describe("ecgMultiLeadSync", () => {
  it("computes lead baseline anchor points for twelve-lead layout", () => {
    const point = leadBaselinePoint("V2", 1200, 900);
    expect(point.x).toBeGreaterThan(0);
    expect(point.y).toBeGreaterThan(0);
  });

  it("replicates horizontal calipers across all standard leads", () => {
    const replicas = replicateHorizontalCaliper(horizontalCaliper(), 1200, 900, grid, "grp-1");
    expect(replicas).toHaveLength(12);
    expect(replicas.filter((c) => c.lead === "II")[0]?.hidden).toBe(false);
    expect(replicas.filter((c) => c.lead !== "II").every((c) => c.hidden)).toBe(true);
    expect(replicas.every((c) => c.groupId === "grp-1")).toBe(true);
  });

  it("projects synchronized timestamp markers across leads", () => {
    const markers = syncTimestampMarkers(400, grid, 1200, 900);
    expect(markers).toHaveLength(12);
    expect(markers.every((m) => m.x >= 0 && m.y >= 0)).toBe(true);
  });

  it("converts pointer position to synced timestamp on anchor lead", () => {
    const timestamp = pointToSyncedTimestamp({ x: 180, y: 120 }, "II", grid, 1200, 900);
    expect(timestamp).toBeGreaterThanOrEqual(0);
  });
});
