/** Responsive breakpoints for enterprise medical layouts. */
export const breakpointTokens = {
  mobile: 0,
  tablet: 768,
  laptop: 1024,
  desktop: 1280,
  ultraWide: 1920,
} as const;

export type BreakpointToken = keyof typeof breakpointTokens;

export function resolveBreakpoint(width: number): BreakpointToken {
  if (width >= breakpointTokens.ultraWide) return "ultraWide";
  if (width >= breakpointTokens.desktop) return "desktop";
  if (width >= breakpointTokens.laptop) return "laptop";
  if (width >= breakpointTokens.tablet) return "tablet";
  return "mobile";
}
