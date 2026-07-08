/**
 * Sprint 78 — Spacing tokens (4px grid + enterprise spacing).
 */

import { ECG_SPACING } from "@/components/ecg/viewer/ecgSpacingTokens";
import { ECG_ENTERPRISE_DESIGN } from "@/components/ecg/viewer/ecgEnterpriseDesignTokens";

export const spacingTokens = {
  grid: ECG_SPACING,
  enterprise: ECG_ENTERPRISE_DESIGN.spacing,
  /** Standard padding steps for Bolt/Penpot alignment */
  scale: {
    none: 0,
    xs: 2,
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    xxl: 24,
    xxxl: 32,
  },
} as const;

export type SpacingToken = keyof typeof spacingTokens.scale;

export function spacing(step: SpacingToken) {
  return spacingTokens.scale[step];
}
