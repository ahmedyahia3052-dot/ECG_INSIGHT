/**
 * Sprint 78 — Typography tokens (application + clinical workstation).
 */

import appColors from "@/constants/colors";
import { ECG_TYPOGRAPHY } from "@/components/ecg/viewer/ecgSpacingTokens";

export const typographyTokens = {
  app: {
    body: { fontSize: 14, fontWeight: "500" as const, lineHeight: 20 },
    caption: { fontSize: 12, fontWeight: "600" as const, lineHeight: 16 },
    heading: { fontSize: 20, fontWeight: "800" as const, lineHeight: 28 },
    label: { fontSize: 11, fontWeight: "700" as const, lineHeight: 14 },
    title: { fontSize: 16, fontWeight: "900" as const, lineHeight: 22 },
  },
  clinical: ECG_TYPOGRAPHY,
  fontFamily: {
    mono: "monospace",
    sans: "System",
  },
} as const;

export type TypographyTokenGroup = keyof typeof typographyTokens;

export const typographyScale = [8, 9, 10, 11, 12, 13, 14, 16, 20, 24] as const;

export { appColors };
