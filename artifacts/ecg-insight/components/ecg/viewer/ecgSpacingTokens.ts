/** Sprint 33.5 — 4px spacing grid for pixel-perfect alignment. */
export const ECG_SPACING = {
  xs: 2,
  sm: 4,
  md: 6,
  lg: 8,
  xl: 12,
} as const;

export const ECG_TYPOGRAPHY = {
  caption: { fontSize: 8, fontWeight: "700" as const },
  label: { fontSize: 9, fontWeight: "800" as const },
  body: { fontSize: 10, fontWeight: "800" as const },
  title: { fontSize: 11, fontWeight: "900" as const },
  status: { fontSize: 11, fontWeight: "900" as const },
} as const;
