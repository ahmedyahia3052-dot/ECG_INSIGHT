/**
 * Sprint 78 — Semantic color tokens for Bolt/Penpot import.
 * Values sourced from production palettes; no placeholders.
 */

import appColors from "@/constants/colors";
import { medicalTheme } from "@/theme/medicalTheme";

export const colorTokens = {
  clinical: medicalTheme,
  dark: appColors.dark,
  light: appColors.light,
  gradients: appColors.gradients,
} as const;

export type ColorTokenScheme = keyof Pick<typeof colorTokens, "dark" | "light">;

export function resolveColorScheme(scheme: ColorTokenScheme) {
  return colorTokens[scheme];
}

export const semanticColors = {
  critical: medicalTheme.critical,
  primary: medicalTheme.primary,
  success: medicalTheme.success,
  warning: medicalTheme.warning,
  border: medicalTheme.border,
  surface: medicalTheme.surface,
  text: medicalTheme.text,
  muted: medicalTheme.muted,
} as const;
