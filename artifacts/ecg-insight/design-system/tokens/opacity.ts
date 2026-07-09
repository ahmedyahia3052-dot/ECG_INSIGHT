export const opacityTokens = {
  transparent: 0,
  subtle: 0.08,
  muted: 0.16,
  medium: 0.32,
  strong: 0.56,
  overlay: 0.72,
  disabled: 0.48,
  opaque: 1,
} as const;

export type OpacityToken = keyof typeof opacityTokens;
