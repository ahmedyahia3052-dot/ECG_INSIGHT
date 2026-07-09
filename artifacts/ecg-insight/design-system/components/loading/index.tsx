import React, { memo } from "react";
import { ActivityIndicator, View } from "react-native";

import { useDesignTokens } from "../../hooks/useDesignTokens";
import { Text } from "../../primitives/Text";

export const Spinner = memo(function Spinner({ label = "Loading" }: { label?: string }) {
  const tokens = useDesignTokens();
  return (
    <View accessibilityLabel={label} style={{ alignItems: "center", gap: tokens.spacing.stack.default, padding: tokens.spacing.inset.lg }}>
      <ActivityIndicator color={tokens.colors.medical.primary} size="large" />
      <Text tone="muted" variant="caption">{label}</Text>
    </View>
  );
});

export const Skeleton = memo(function Skeleton({ height = 16, width = "100%" }: { height?: number; width?: number | `${number}%` }) {
  const tokens = useDesignTokens();
  return (
    <View
      style={{
        backgroundColor: tokens.colors.surface.toolbar,
        borderRadius: tokens.radii.sm,
        height,
        opacity: tokens.opacity.muted,
        width,
      }}
      testID="ds-loading-skeleton"
    />
  );
});

export const LinearProgress = memo(function LinearProgress({ progress }: { progress: number }) {
  const tokens = useDesignTokens();
  const clamped = Math.max(0, Math.min(1, progress));
  return (
    <View style={{ backgroundColor: tokens.colors.surface.toolbar, borderRadius: tokens.radii.full, height: 6, overflow: "hidden", width: "100%" }}>
      <View style={{ backgroundColor: tokens.colors.medical.primary, height: "100%", width: `${clamped * 100}%` }} />
    </View>
  );
});

export const ProgressIndicator = memo(function ProgressIndicator({ label, progress }: { label: string; progress: number }) {
  const tokens = useDesignTokens();
  return (
    <View style={{ gap: tokens.spacing.stack.tight, width: "100%" }}>
      <Text variant="caption">{label}</Text>
      <LinearProgress progress={progress} />
    </View>
  );
});

export const EcgLoadingState = memo(function EcgLoadingState() {
  return <Spinner label="Loading ECG study…" />;
});
