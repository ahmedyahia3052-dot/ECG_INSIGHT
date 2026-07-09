import React, { memo } from "react";
import { View } from "react-native";

import { useDesignTokens } from "../../hooks/useDesignTokens";
import { Text } from "../../primitives/Text";
import { Stack } from "../../primitives/Stack";

type AlertTone = "default" | "success" | "warning" | "critical" | "information";

function toneColor(tokens: ReturnType<typeof useDesignTokens>, tone: AlertTone) {
  if (tone === "success") return tokens.colors.medical.success;
  if (tone === "warning") return tokens.colors.medical.warning;
  if (tone === "critical") return tokens.colors.medical.critical;
  if (tone === "information") return tokens.colors.medical.information;
  return tokens.colors.medical.primary;
}

export const Alert = memo(function Alert({ message, title, tone = "default" }: { message: string; title: string; tone?: AlertTone }) {
  const tokens = useDesignTokens();
  const accent = toneColor(tokens, tone);
  return (
    <View
      style={{
        backgroundColor: tokens.colors.surface.card,
        borderColor: accent,
        borderLeftWidth: 4,
        borderRadius: tokens.radii.card,
        borderWidth: 1,
        padding: tokens.spacing.inset.md,
      }}
      testID={`ds-alert-${tone}`}
    >
      <Text variant="subtitle">{title}</Text>
      <Text tone="muted" variant="body">{message}</Text>
    </View>
  );
});

export const Toast = memo(function Toast({ message, tone = "default" }: { message: string; tone?: AlertTone }) {
  const tokens = useDesignTokens();
  return (
    <View
      style={{
        backgroundColor: tokens.colors.gray[900],
        borderRadius: tokens.radii.clinical,
        paddingHorizontal: tokens.spacing.inset.lg,
        paddingVertical: tokens.spacing.inset.sm,
      }}
      testID="ds-toast"
    >
      <Text style={{ color: tokens.colors.text.primary }} variant="body">{message}</Text>
    </View>
  );
});

export const ToastProvider = memo(function ToastProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
});

export const StatusIndicator = memo(function StatusIndicator({ label, tone = "default" }: { label: string; tone?: AlertTone }) {
  const tokens = useDesignTokens();
  const color = toneColor(tokens, tone);
  return (
    <Stack direction="row" gap={8}>
      <View style={{ backgroundColor: color, borderRadius: tokens.radii.full, height: 8, width: 8 }} />
      <Text variant="caption">{label}</Text>
    </Stack>
  );
});
