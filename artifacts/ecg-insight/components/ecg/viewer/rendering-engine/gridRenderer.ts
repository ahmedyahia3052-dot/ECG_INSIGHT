import { gridSpacingPx } from "../ecgCalibrationMath";
import type { EcgRenderGridSettings, EcgRenderViewport } from "./types";
import { effectiveDpr, subPixel } from "./viewport";

export type GridRenderOptions = {
  grid: EcgRenderGridSettings;
  height: number;
  offsetX?: number;
  offsetY?: number;
  viewport: EcgRenderViewport;
  width: number;
};

export function buildGridSvgLines(options: GridRenderOptions) {
  if (!options.grid.visible) return { major: [] as string[], minor: [] as string[] };
  const { grid, height, offsetX = 0, offsetY = 0, viewport, width } = options;
  const minor = gridSpacingPx(grid.speed, grid.gain) * viewport.zoom;
  const major = minor * 5;
  const minorLines: string[] = [];
  const majorLines: string[] = [];

  for (let x = 0; x <= width; x += minor) {
    const sx = subPixel(offsetX + x + 0.5);
    minorLines.push(`M ${sx} ${offsetY} L ${sx} ${offsetY + height}`);
  }
  for (let y = 0; y <= height; y += minor) {
    const sy = subPixel(offsetY + y + 0.5);
    minorLines.push(`M ${offsetX} ${sy} L ${offsetX + width} ${sy}`);
  }
  for (let x = 0; x <= width; x += major) {
    const sx = subPixel(offsetX + x + 0.5);
    majorLines.push(`M ${sx} ${offsetY} L ${sx} ${offsetY + height}`);
  }
  for (let y = 0; y <= height; y += major) {
    const sy = subPixel(offsetY + y + 0.5);
    majorLines.push(`M ${offsetX} ${sy} L ${offsetX + width} ${sy}`);
  }
  return { major: majorLines, minor: minorLines };
}

export function drawGridCanvas2d(
  ctx: CanvasRenderingContext2D,
  options: GridRenderOptions,
) {
  if (!options.grid.visible) return;
  const { grid, height, offsetX = 0, offsetY = 0, viewport, width } = options;
  const minor = gridSpacingPx(grid.speed, grid.gain) * viewport.zoom;
  const major = minor * 5;
  const dpr = effectiveDpr(viewport);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.lineCap = "butt";

  ctx.strokeStyle = `rgba(220, 38, 38, ${grid.opacity * 0.35})`;
  ctx.lineWidth = 0.5;
  for (let x = 0; x <= width; x += minor) {
    ctx.beginPath();
    ctx.moveTo(subPixel(offsetX + x + 0.5), offsetY);
    ctx.lineTo(subPixel(offsetX + x + 0.5), offsetY + height);
    ctx.stroke();
  }
  for (let y = 0; y <= height; y += minor) {
    ctx.beginPath();
    ctx.moveTo(offsetX, subPixel(offsetY + y + 0.5));
    ctx.lineTo(offsetX + width, subPixel(offsetY + y + 0.5));
    ctx.stroke();
  }

  ctx.strokeStyle = `rgba(220, 38, 38, ${grid.opacity * 0.65})`;
  ctx.lineWidth = 1;
  for (let x = 0; x <= width; x += major) {
    ctx.beginPath();
    ctx.moveTo(subPixel(offsetX + x + 0.5), offsetY);
    ctx.lineTo(subPixel(offsetX + x + 0.5), offsetY + height);
    ctx.stroke();
  }
  for (let y = 0; y <= height; y += major) {
    ctx.beginPath();
    ctx.moveTo(offsetX, subPixel(offsetY + y + 0.5));
    ctx.lineTo(offsetX + width, subPixel(offsetY + y + 0.5));
    ctx.stroke();
  }
}
