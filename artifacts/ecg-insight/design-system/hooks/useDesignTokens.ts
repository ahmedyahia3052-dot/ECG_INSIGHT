import { useMemo } from "react";
import { useWindowDimensions } from "react-native";

import { useOptionalThemeEngine } from "../theme-engine";
import { designAnimationTokens } from "../tokens/animation";
import { resolveBreakpoint } from "../tokens/breakpoints";
import { designColorTokens } from "../tokens/colors";
import { opacityTokens } from "../tokens/opacity";
import { borderRadiusTokens } from "../tokens/radii";
import { shadowTokens } from "../tokens/shadows";
import { designSpacingTokens } from "../tokens/spacing";
import { zIndexLayers } from "../tokens/zIndex";
import { typographyTokens } from "../typography";

export type DesignTokens = {
  animation: typeof designAnimationTokens;
  breakpoint: ReturnType<typeof resolveBreakpoint>;
  colors: typeof designColorTokens;
  opacity: typeof opacityTokens;
  radii: typeof borderRadiusTokens;
  shadows: typeof shadowTokens;
  spacing: typeof designSpacingTokens;
  typography: typeof typographyTokens;
  viewportWidth: number;
  zIndex: typeof zIndexLayers;
};

export function createDesignTokens(viewportWidth: number): DesignTokens {
  return {
    animation: designAnimationTokens,
    breakpoint: resolveBreakpoint(viewportWidth),
    colors: designColorTokens,
    opacity: opacityTokens,
    radii: borderRadiusTokens,
    shadows: shadowTokens,
    spacing: designSpacingTokens,
    typography: typographyTokens,
    viewportWidth,
    zIndex: zIndexLayers,
  };
}

export function useDesignTokens(): DesignTokens {
  const { width } = useWindowDimensions();
  const themeEngine = useOptionalThemeEngine();
  return useMemo(() => {
    const base = createDesignTokens(width);
    if (!themeEngine) return base;
    const clinical = themeEngine.resolvedTheme.clinical;
    return {
      ...base,
      colors: {
        ...base.colors,
        medical: {
          ...base.colors.medical,
          primary: clinical.primary,
          secondary: clinical.primaryDark,
          accent: clinical.primary,
          success: clinical.success,
          warning: clinical.warning,
          critical: clinical.critical,
        },
        surface: {
          ...base.colors.surface,
          background: clinical.background,
          sidebar: clinical.surface,
          workspace: clinical.card,
          toolbar: clinical.cardAlt,
          card: clinical.card,
        },
        text: {
          primary: clinical.text,
          secondary: clinical.muted,
          inverse: base.colors.text.inverse,
        },
        border: {
          default: clinical.border,
          strong: base.colors.border.strong,
          focus: clinical.primary,
        },
      },
    };
  }, [themeEngine, width]);
}
