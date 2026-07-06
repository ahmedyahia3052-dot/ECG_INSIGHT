import type { EcgDirtyRect, EcgRenderLayerId } from "./types";

/** Dirty rectangle tracking — only redraw changed regions per layer */

export class DirtyRectManager {
  private dirty = new Map<EcgRenderLayerId, EcgDirtyRect[]>();
  private fullFrame = new Set<EcgRenderLayerId>();

  markFull(layer: EcgRenderLayerId) {
    this.fullFrame.add(layer);
    this.dirty.delete(layer);
  }

  markRect(layer: EcgRenderLayerId, rect: Omit<EcgDirtyRect, "layer">) {
    if (this.fullFrame.has(layer)) return;
    const list = this.dirty.get(layer) ?? [];
    list.push({ ...rect, layer });
    this.dirty.set(layer, list);
  }

  markAllLayers(layers: EcgRenderLayerId[], width: number, height: number) {
    for (const layer of layers) {
      this.markFull(layer);
    }
    void width;
    void height;
  }

  isDirty(layer: EcgRenderLayerId) {
    return this.fullFrame.has(layer) || (this.dirty.get(layer)?.length ?? 0) > 0;
  }

  rectsFor(layer: EcgRenderLayerId): EcgDirtyRect[] | "full" {
    if (this.fullFrame.has(layer)) return "full";
    return this.dirty.get(layer) ?? [];
  }

  clear(layer?: EcgRenderLayerId) {
    if (layer) {
      this.fullFrame.delete(layer);
      this.dirty.delete(layer);
      return;
    }
    this.fullFrame.clear();
    this.dirty.clear();
  }

  totalRects() {
    let count = this.fullFrame.size;
    for (const rects of this.dirty.values()) count += rects.length;
    return count;
  }
}

export function mergeDirtyRects(rects: EcgDirtyRect[]): EcgDirtyRect | null {
  if (!rects.length) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const rect of rects) {
    minX = Math.min(minX, rect.x);
    minY = Math.min(minY, rect.y);
    maxX = Math.max(maxX, rect.x + rect.width);
    maxY = Math.max(maxY, rect.y + rect.height);
  }
  return {
    height: maxY - minY,
    layer: rects[0]!.layer,
    width: maxX - minX,
    x: minX,
    y: minY,
  };
}
