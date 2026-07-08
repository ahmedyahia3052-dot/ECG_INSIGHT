/**
 * Sprint 78 — Animation / motion tokens.
 */

import { ECG_ENTERPRISE_DESIGN } from "@/components/ecg/viewer/ecgEnterpriseDesignTokens";

export const animationTokens = {
  duration: {
    ...ECG_ENTERPRISE_DESIGN.animation,
    instant: 0,
    page: 240,
  },
  easing: {
    standard: "cubic-bezier(0.4, 0, 0.2, 1)",
    decelerate: "cubic-bezier(0, 0, 0.2, 1)",
    accelerate: "cubic-bezier(0.4, 0, 1, 1)",
    clinical: "cubic-bezier(0.25, 0.1, 0.25, 1)",
  },
} as const;

export type AnimationDuration = keyof typeof animationTokens.duration;
