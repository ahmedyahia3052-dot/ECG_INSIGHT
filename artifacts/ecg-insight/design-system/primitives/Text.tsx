import React, { memo } from "react";
import { Text as RNText, type TextProps } from "react-native";

import { useDesignTokens } from "../hooks/useDesignTokens";
import { typographyVariants, type TypographyVariant } from "../typography/scale";

type Props = TextProps & {
  tone?: "default" | "muted" | "inverse";
  variant?: TypographyVariant;
};

export const Text = memo(function Text({ children, style, tone = "default", variant = "body", ...rest }: Props) {
  const tokens = useDesignTokens();
  const color =
    tone === "muted" ? tokens.colors.text.secondary : tone === "inverse" ? tokens.colors.text.inverse : tokens.colors.text.primary;
  return (
    <RNText accessibilityRole="text" style={[typographyVariants[variant] as TextProps["style"], { color }, style]} {...rest}>
      {children}
    </RNText>
  );
});
