import { designAnimationTokens } from "../tokens/animation";

export const motionPresets = {
  hover: { duration: designAnimationTokens.duration.fast, easing: designAnimationTokens.easing.standard },
  focus: { duration: designAnimationTokens.duration.instant, easing: designAnimationTokens.easing.standard },
  loading: { duration: designAnimationTokens.duration.normal, easing: designAnimationTokens.easing.standard },
  drawer: { duration: designAnimationTokens.duration.drawer, easing: designAnimationTokens.easing.enter },
  dialog: { duration: designAnimationTokens.duration.dialog, easing: designAnimationTokens.easing.emphasis },
  toast: { duration: designAnimationTokens.duration.toast, easing: designAnimationTokens.easing.exit },
  notification: { duration: designAnimationTokens.duration.normal, easing: designAnimationTokens.easing.standard },
  chart: { duration: designAnimationTokens.duration.chart, easing: designAnimationTokens.easing.emphasis },
  card: { duration: designAnimationTokens.duration.fast, easing: designAnimationTokens.easing.standard },
  sidebar: { duration: designAnimationTokens.duration.sidebar, easing: designAnimationTokens.easing.enter },
  workspace: { duration: designAnimationTokens.duration.workspace, easing: designAnimationTokens.easing.emphasis },
} as const;

export type MotionPresetId = keyof typeof motionPresets;

export function resolveMotionPreset(id: MotionPresetId) {
  return motionPresets[id];
}
