import React, { memo } from "react";
import { View, type ViewProps, type ViewStyle } from "react-native";

import { useDesignTokens } from "../hooks/useDesignTokens";
import { mergeStyles } from "../utilities/style";

type Props = ViewProps & {
  direction?: "column" | "row";
  gap?: keyof typeof import("../tokens/spacing").spacingScale;
};

export const Stack = memo(function Stack({ children, direction = "column", gap = 8, style, ...rest }: Props) {
  const tokens = useDesignTokens();
  const stackStyle: ViewStyle = {
    flexDirection: direction,
    gap: tokens.spacing.scale[gap],
  };
  return (
    <View style={mergeStyles(stackStyle, style)} {...rest}>
      {children}
    </View>
  );
});
