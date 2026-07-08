/**
 * Sprint 78 — Responsive breakpoints for presentation + workspace layouts.
 */

export const responsiveBreakpoints = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  xxl: 1536,
  ultra: 1920,
  qhd: 2560,
  uhd: 3840,
} as const;

export type ResponsiveBreakpoint = keyof typeof responsiveBreakpoints;

export function resolveBreakpoint(width: number): ResponsiveBreakpoint {
  if (width >= responsiveBreakpoints.uhd) return "uhd";
  if (width >= responsiveBreakpoints.qhd) return "qhd";
  if (width >= responsiveBreakpoints.ultra) return "ultra";
  if (width >= responsiveBreakpoints.xxl) return "xxl";
  if (width >= responsiveBreakpoints.xl) return "xl";
  if (width >= responsiveBreakpoints.lg) return "lg";
  if (width >= responsiveBreakpoints.md) return "md";
  if (width >= responsiveBreakpoints.sm) return "sm";
  return "xs";
}

export function isCompactViewport(width: number) {
  return width < responsiveBreakpoints.lg;
}

export function isUltraWideViewport(width: number) {
  return width >= responsiveBreakpoints.ultra;
}
