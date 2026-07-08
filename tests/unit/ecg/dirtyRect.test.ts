import { describe, expect, it } from "vitest";

import { DirtyRectManager, mergeDirtyRects } from "@/components/ecg/viewer/rendering-engine/dirtyRect";

describe("rendering-engine dirtyRect", () => {
  it("tracks full-frame invalidation per layer", () => {
    const manager = new DirtyRectManager();
    manager.markFull("waveform");
    expect(manager.isDirty("waveform")).toBe(true);
    expect(manager.rectsFor("waveform")).toBe("full");
  });

  it("accumulates partial dirty rectangles until cleared", () => {
    const manager = new DirtyRectManager();
    manager.markRect("grid", { height: 20, width: 40, x: 10, y: 5 });
    manager.markRect("grid", { height: 30, width: 50, x: 60, y: 15 });
    expect(manager.rectsFor("grid")).toHaveLength(2);
    manager.clear("grid");
    expect(manager.isDirty("grid")).toBe(false);
  });

  it("ignores partial marks after full-frame invalidation", () => {
    const manager = new DirtyRectManager();
    manager.markFull("overlay");
    manager.markRect("overlay", { height: 10, width: 10, x: 0, y: 0 });
    expect(manager.rectsFor("overlay")).toBe("full");
  });

  it("merges dirty rectangles into bounding box", () => {
    const merged = mergeDirtyRects([
      { height: 20, layer: "waveform", width: 30, x: 0, y: 0 },
      { height: 10, layer: "waveform", width: 10, x: 25, y: 15 },
    ]);
    expect(merged).toEqual({ height: 25, layer: "waveform", width: 35, x: 0, y: 0 });
    expect(mergeDirtyRects([])).toBeNull();
  });

  it("counts total dirty regions across layers", () => {
    const manager = new DirtyRectManager();
    manager.markFull("grid");
    manager.markRect("waveform", { height: 10, width: 10, x: 0, y: 0 });
    expect(manager.totalRects()).toBe(2);
    manager.clear();
    expect(manager.totalRects()).toBe(0);
  });
});
