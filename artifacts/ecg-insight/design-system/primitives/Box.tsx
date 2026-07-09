import React, { memo } from "react";
import { View, type ViewProps, type ViewStyle } from "react-native";

import { useDesignTokens } from "../hooks/useDesignTokens";
import { mergeStyles } from "../utilities/style";

type Props = ViewProps & {
  padding?: keyof typeof import("../tokens/spacing").spacingScale;
  radius?: keyof typeof import("../tokens/radii").borderRadiusTokens;
  surface?: keyof typeof import("../tokens/colors").surfaceColors;
};

export const Box = memo(function Box({ children, padding, radius, style, surface = "card", ...rest }: Props) {
  const tokens = useDesignTokens();
  const boxStyle: ViewStyle = {
    backgroundColor: tokens.colors.surface[surface],
    borderColor: tokens.colors.border.default,
    borderRadius: radius ? tokens.radii[radius] : tokens.radii.card,
    borderWidth: 1,
    padding: padding ? tokens.spacing.scale[padding] : undefined,
  };
  return (
    <View style={mergeStyles(boxStyle, style)} {...rest}>
      {children}
    </View>
  );
});
