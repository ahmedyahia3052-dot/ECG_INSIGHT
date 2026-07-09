/** Animation timing tokens — medical UI motion (smooth, non-distracting). */
export const animationTimingTokens = {
  instant: 0,
  fast: 120,
  normal: 200,
  slow: 320,
  drawer: 280,
  dialog: 240,
  toast: 180,
  chart: 400,
  sidebar: 260,
  workspace: 300,
} as const;

export const animationEasingTokens = {
  standard: "ease-out",
  enter: "ease-out",
  exit: "ease-in",
  emphasis: "cubic-bezier(0.2, 0, 0, 1)",
} as const;

export const designAnimationTokens = {
  duration: animationTimingTokens,
  easing: animationEasingTokens,
} as const;
