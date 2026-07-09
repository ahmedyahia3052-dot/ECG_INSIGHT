import React, { memo } from "react";
import { View } from "react-native";

import { useDesignTokens } from "../../hooks/useDesignTokens";
import { Text } from "../../primitives/Text";

export const Avatar = memo(function Avatar({ initials, size = 32 }: { initials: string; size?: number }) {
  const tokens = useDesignTokens();
  return (
    <View
      accessibilityLabel={`Avatar ${initials}`}
      style={{
        alignItems: "center",
        backgroundColor: tokens.colors.medical.primary,
        borderRadius: tokens.radii.full,
        height: size,
        justifyContent: "center",
        width: size,
      }}
      testID="ds-avatar"
    >
      <Text style={{ color: tokens.colors.text.inverse, fontSize: size * 0.35 }} variant="caption">{initials}</Text>
    </View>
  );
});

export const AvatarFallback = Avatar;
