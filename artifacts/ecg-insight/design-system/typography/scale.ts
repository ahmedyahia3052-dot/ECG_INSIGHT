import { designColorTokens } from "../tokens/colors";

/** Typography scale for enterprise medical UI. */
export const typographyVariants = {
  display: { fontSize: 28, fontWeight: "900" as const, lineHeight: 34, letterSpacing: 0.4 },
  heading: { fontSize: 20, fontWeight: "800" as const, lineHeight: 28, letterSpacing: 0.3 },
  title: { fontSize: 16, fontWeight: "900" as const, lineHeight: 22, letterSpacing: 0.2 },
  subtitle: { fontSize: 14, fontWeight: "700" as const, lineHeight: 20, letterSpacing: 0.15 },
  body: { fontSize: 14, fontWeight: "500" as const, lineHeight: 20, letterSpacing: 0 },
  caption: { fontSize: 12, fontWeight: "600" as const, lineHeight: 16, letterSpacing: 0.1 },
  small: { fontSize: 10, fontWeight: "700" as const, lineHeight: 14, letterSpacing: 0.2 },
  code: { fontSize: 12, fontWeight: "600" as const, lineHeight: 16, fontFamily: "monospace" },
  monitor: { fontSize: 11, fontWeight: "800" as const, lineHeight: 14, letterSpacing: 0.6, fontFamily: "monospace" },
  numeric: { fontSize: 18, fontWeight: "900" as const, lineHeight: 22, fontVariant: ["tabular-nums"] as const },
  ecgLabel: { fontSize: 9, fontWeight: "800" as const, lineHeight: 12, letterSpacing: 0.8 },
  vitalLabel: { fontSize: 10, fontWeight: "800" as const, lineHeight: 12, letterSpacing: 0.4 },
  statusLabel: { fontSize: 11, fontWeight: "900" as const, lineHeight: 14, letterSpacing: 0.5 },
} as const;

export type TypographyVariant = keyof typeof typographyVariants;

export const typographyTokens = {
  variants: typographyVariants,
  fontFamily: {
    sans: "System",
    mono: "monospace",
  },
  color: {
    default: designColorTokens.text.primary,
    muted: designColorTokens.text.secondary,
    inverse: designColorTokens.text.inverse,
  },
} as const;
