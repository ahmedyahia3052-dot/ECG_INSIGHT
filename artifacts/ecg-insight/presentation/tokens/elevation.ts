/**
 * Sprint 78 — Elevation / shadow tokens.
 */

import { ECG_ENTERPRISE_DESIGN } from "@/components/ecg/viewer/ecgEnterpriseDesignTokens";
import appColors from "@/constants/colors";

export const elevationTokens = {
  enterprise: ECG_ENTERPRISE_DESIGN.shadow,
  glow: ECG_ENTERPRISE_DESIGN.glow,
  levels: {
    none: "none",
    sm: "0 1px 3px rgba(0,0,0,0.25)",
    md: ECG_ENTERPRISE_DESIGN.shadow.elevation,
    lg: ECG_ENTERPRISE_DESIGN.shadow.floating,
    xl: `0 8px 32px ${appColors.dark.shadow}40`,
  },
  zIndex: {
    base: 0,
    panel: 10,
    sidebar: 20,
    overlay: 30,
    modal: 40,
    toast: 50,
    commandPalette: 60,
  },
} as const;

export type ElevationLevel = keyof typeof elevationTokens.levels;
