import { describe, expect, it } from "vitest";

import {
  createWorkspaceState,
  migrateWorkspaceState,
} from "@/components/ecg/viewer/measurementTypes";

describe("measurementTypes workspace migration", () => {
  it("creates default workspace state with clinical defaults", () => {
    const state = createWorkspaceState();
    expect(state.version).toBe(5);
    expect(state.activeLead).toBe("II");
    expect(state.grid.gain).toBe(10);
    expect(state.toolMode).toBe("select");
  });

  it("migrates legacy measurements with missing optional fields", () => {
    const migrated = migrateWorkspaceState({
      measurements: [
        {
          caliperId: "c1",
          id: "m1",
          kind: "rr_interval",
          name: "RR",
          operator: "QA",
          timestamp: "2026-01-01T00:00:00.000Z",
          type: "RR Interval",
          unit: "ms",
          value: 800,
        } as never,
      ],
      calipers: [{ id: "c1", kind: "horizontal", start: { x: 0, y: 0 }, end: { x: 10, y: 0 } } as never],
    });
    expect(migrated.version).toBe(5);
    expect(migrated.measurements[0]?.start).toEqual({ x: 0, y: 0 });
    expect(migrated.measurements[0]?.durationMs).toBeUndefined();
    expect(migrated.calipers[0]?.color).toBe("#2563EB");
  });

  it("preserves AI overlay state during migration", () => {
    const overlay = { annotations: [], selectedAnnotationIds: [], settings: { showLabels: true }, version: 1 };
    const migrated = migrateWorkspaceState({ aiOverlay: overlay as never });
    expect(migrated.aiOverlay).toEqual(overlay);
  });
});
