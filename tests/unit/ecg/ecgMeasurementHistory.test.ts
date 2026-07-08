import { describe, expect, it } from "vitest";

import {
  appendHistory,
  createHistoryEntry,
  deleteHistoryEntry,
  formatHistoryValue,
  renameHistoryEntry,
} from "@/components/ecg/viewer/ecgMeasurementHistory";
import type { EcgCaliper } from "@/components/ecg/viewer/measurementTypes";

const controls = {
  grid: { gain: 10, speed: 25 },
} as never;

const horizontalCaliper: EcgCaliper = {
  color: "#00ffcc",
  createdAt: "2026-01-01T00:00:00.000Z",
  end: { x: 140, y: 0 },
  hidden: false,
  id: "c1",
  kind: "horizontal",
  lead: "II",
  locked: false,
  measurementKind: "rr_interval",
  snapToGrid: true,
  start: { x: 0, y: 0 },
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("ecgMeasurementHistory", () => {
  it("formats horizontal caliper values in milliseconds", () => {
    const value = formatHistoryValue(horizontalCaliper, controls, 800);
    expect(value).toMatch(/ms/);
  });

  it("creates history entries with doctor and timestamp", () => {
    const entry = createHistoryEntry({
      action: "create",
      caliper: horizontalCaliper,
      controls,
      doctor: "Dr. QA",
      lead: "II",
    });
    expect(entry.doctor).toBe("Dr. QA");
    expect(entry.value).toBeTruthy();
    expect(entry.timestamp).toMatch(/T/);
  });

  it("appends and trims history to max entries", () => {
    const base = createHistoryEntry({ action: "create", controls, doctor: "Dr. QA", value: "400 ms" });
    const next = appendHistory([], base, 1);
    expect(next).toHaveLength(1);
    const overflow = appendHistory(next, { ...base, id: "history-2" }, 1);
    expect(overflow).toHaveLength(1);
    expect(overflow[0]?.id).toBe("history-2");
  });

  it("renames and deletes entries immutably", () => {
    const entry = createHistoryEntry({ action: "create", controls, doctor: "Dr. QA", value: "400 ms" });
    const renamed = renameHistoryEntry([entry], entry.id, "RR interval");
    expect(renamed[0]?.name).toBe("RR interval");
    expect(deleteHistoryEntry(renamed, entry.id)).toEqual([]);
  });
});
