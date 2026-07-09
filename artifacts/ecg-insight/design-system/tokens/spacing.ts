/** Enterprise spacing scale (px) — 4px grid with clinical workstation steps. */
export const spacingScale = {
  0: 0,
  2: 2,
  4: 4,
  8: 8,
  12: 12,
  16: 16,
  20: 20,
  24: 24,
  32: 32,
  40: 40,
  48: 48,
  64: 64,
} as const;

export type SpacingKey = keyof typeof spacingScale;

export function space(key: SpacingKey): number {
  return spacingScale[key];
}

export const designSpacingTokens = {
  scale: spacingScale,
  inset: {
    xs: spacingScale[4],
    sm: spacingScale[8],
    md: spacingScale[12],
    lg: spacingScale[16],
    xl: spacingScale[24],
    xxl: spacingScale[32],
  },
  stack: {
    tight: spacingScale[4],
    default: spacingScale[8],
    relaxed: spacingScale[16],
    section: spacingScale[24],
  },
} as const;
