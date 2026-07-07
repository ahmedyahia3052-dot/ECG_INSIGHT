import type { RenderEngine2DisplayProfile } from "./types";

/** Sub-pixel alignment for crisp 1px grid lines on retina displays. */
export function subPixelAlign(value: number) {
  return Math.round(value) + 0.5;
}

export function configureHospitalCanvasContext(ctx: CanvasRenderingContext2D) {
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
}

export function dynamicTraceStrokeWidth(leadCount: number, zoom: number, dpr: number) {
  const base = leadCount >= 12 ? 1.35 : leadCount >= 6 ? 1.65 : leadCount >= 5 ? 1.85 : 2.1;
  const scaled = base / Math.sqrt(Math.max(zoom, 0.5));
  return Math.max(0.75, Math.min(3.2, scaled / Math.max(dpr, 1)));
}

export function adaptivePhosphorGlow(isLive: boolean, profile: RenderEngine2DisplayProfile) {
  return isLive ? profile.phosphorGlow : Math.max(4, profile.phosphorGlow * 0.45);
}

/** Draw anti-aliased clinical trace with quadratic smoothing and phosphor glow. */
export function drawPhosphorTrace(
  ctx: CanvasRenderingContext2D,
  points: Array<{ x: number; y: number }>,
  profile: RenderEngine2DisplayProfile,
  lineWidth: number,
  isLive: boolean,
) {
  if (points.length < 2) return;

  configureHospitalCanvasContext(ctx);
  ctx.save();
  ctx.strokeStyle = profile.phosphorColor;
  ctx.lineWidth = lineWidth;
  ctx.shadowBlur = adaptivePhosphorGlow(isLive, profile);
  ctx.shadowColor = profile.phosphorColor.replace(")", ",0.75)").replace("#22C55E", "rgba(34,197,94,0.75)").replace("#FACC15", "rgba(250,204,21,0.85)");

  ctx.beginPath();
  points.forEach((point, index) => {
    const x = subPixelAlign(point.x);
    const y = point.y;
    if (index === 0) ctx.moveTo(x, y);
    else {
      const prev = points[index - 1]!;
      const cx = (prev.x + point.x) / 2;
      ctx.quadraticCurveTo(subPixelAlign(prev.x), prev.y, cx, (prev.y + point.y) / 2);
      if (index === points.length - 1) ctx.lineTo(x, y);
    }
  });
  ctx.stroke();
  ctx.restore();
}

export function detectGpuAcceleration() {
  if (typeof document === "undefined") return false;
  const canvas = document.createElement("canvas");
  const gl = canvas.getContext("webgl") ?? canvas.getContext("experimental-webgl");
  return !!gl;
}
