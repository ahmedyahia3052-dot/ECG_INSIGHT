/** Sprint 28 — smooth zoom/pan with momentum */

export type PanMomentum = { vx: number; vy: number };

export function applyWheelZoom(deltaY: number, factor = 0.0012) {
  return deltaY > 0 ? 1 - Math.min(0.25, Math.abs(deltaY) * factor) : 1 + Math.min(0.25, Math.abs(deltaY) * factor);
}

export function lerpZoom(current: number, target: number, t = 0.18) {
  return current + (target - current) * t;
}

export function decayMomentum(momentum: PanMomentum, friction = 0.92): PanMomentum {
  return { vx: momentum.vx * friction, vy: momentum.vy * friction };
}

export function momentumActive(momentum: PanMomentum, threshold = 0.4) {
  return Math.abs(momentum.vx) > threshold || Math.abs(momentum.vy) > threshold;
}

export function trackPanVelocity(
  last: { t: number; x: number; y: number } | null,
  x: number,
  y: number,
  t: number,
): PanMomentum {
  if (!last || t - last.t > 80) return { vx: 0, vy: 0 };
  const dt = Math.max(1, t - last.t);
  return { vx: ((x - last.x) / dt) * 16, vy: ((y - last.y) / dt) * 16 };
}

export const CLINICAL_EASING_MS = 200;

export function easeOutCubic(t: number) {
  return 1 - (1 - t) ** 3;
}
