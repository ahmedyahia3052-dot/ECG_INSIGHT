import appColors from "@/constants/colors";

export const borderRadiusTokens = {
  none: 0,
  xs: 2,
  sm: appColors.radius.sm,
  md: appColors.radius.md,
  lg: appColors.radius.lg,
  xl: appColors.radius.xl,
  full: appColors.radius.full,
  clinical: 4,
  card: 8,
  dialog: 12,
} as const;

export type BorderRadiusToken = keyof typeof borderRadiusTokens;
