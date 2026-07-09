import { medicalTheme } from "@/theme/medicalTheme";

/** Enterprise medical color tokens — single source for all UI surfaces. */
export const medicalColors = {
  primary: medicalTheme.primary,
  secondary: medicalTheme.primaryDark,
  accent: medicalTheme.primary,
  success: medicalTheme.success,
  warning: medicalTheme.warning,
  critical: medicalTheme.critical,
  emergency: "#DC2626",
  information: "#38BDF8",
  neutral: medicalTheme.muted,
} as const;

export const grayScale = {
  50: "#F8FAFC",
  100: "#F1F5F9",
  200: "#E2E8F0",
  300: "#CBD5E1",
  400: "#94A3B8",
  500: "#64748B",
  600: "#475569",
  700: "#334155",
  800: "#1E293B",
  900: "#0F172A",
  950: "#020617",
} as const;

export const surfaceColors = {
  background: medicalTheme.background,
  sidebar: medicalTheme.surface,
  workspace: medicalTheme.card,
  toolbar: medicalTheme.cardAlt,
  card: medicalTheme.card,
  table: medicalTheme.surface,
  dialog: medicalTheme.cardAlt,
  monitor: "#041018",
  viewer: "#050F1A",
} as const;

export const designColorTokens = {
  medical: medicalColors,
  gray: grayScale,
  surface: surfaceColors,
  text: {
    primary: medicalTheme.text,
    secondary: medicalTheme.muted,
    inverse: grayScale[950],
  },
  border: {
    default: medicalTheme.border,
    strong: grayScale[700],
    focus: medicalTheme.primary,
  },
} as const;

export type DesignColorTokens = typeof designColorTokens;
