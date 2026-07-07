import type { RenderEngine2DisplayProfile } from "./types";

export type HospitalCanvasContext = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

/** Hospital bedside CRT phosphor display profile. */
export const HOSPITAL_PHOSPHOR_PROFILE: RenderEngine2DisplayProfile = {
  background: "#000000",
  brightness: 1,
  contrast: 1.12,
  crtPersistence: 0.18,
  gridMajor: "rgba(34,197,94,0.82)",
  gridMinor: "rgba(16,120,88,0.52)",
  phosphorColor: "#22C55E",
  phosphorGlow: 14,
};

export function resolveDisplayProfile(
  overrides?: Partial<RenderEngine2DisplayProfile>,
  alarmTone = false,
): RenderEngine2DisplayProfile {
  const base = { ...HOSPITAL_PHOSPHOR_PROFILE, ...overrides };
  if (alarmTone) {
    return { ...base, phosphorColor: "#FACC15", phosphorGlow: 18 };
  }
  return base;
}

/** Apply brightness + contrast to canvas before trace/grid paint. */
export function applyDisplayProfile(ctx: HospitalCanvasContext, profile: RenderEngine2DisplayProfile, width: number, height: number) {
  ctx.save();
  ctx.fillStyle = profile.background;
  ctx.fillRect(0, 0, width, height);
  if (profile.brightness !== 1 || profile.contrast !== 1) {
    ctx.globalAlpha = Math.min(1, profile.brightness);
    ctx.filter = profile.contrast !== 1 ? `contrast(${profile.contrast})` : "none";
  }
}

export function restoreDisplayProfile(ctx: HospitalCanvasContext) {
  ctx.filter = "none";
  ctx.globalAlpha = 1;
  ctx.restore();
}

/** CRT phosphor persistence fade — leaves trailing glow during live sweep. */
export function applyCrtPersistenceFade(
  ctx: HospitalCanvasContext,
  width: number,
  height: number,
  persistence: number,
  background = HOSPITAL_PHOSPHOR_PROFILE.background,
) {
  const alpha = Math.min(0.32, Math.max(0.08, persistence));
  ctx.fillStyle = background.startsWith("#")
    ? `rgba(0,0,0,${alpha})`
    : background;
  ctx.fillRect(0, 0, width, height);
}
