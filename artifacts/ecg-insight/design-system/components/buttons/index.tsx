import { Feather } from "@expo/vector-icons";
import React, { memo } from "react";
import { ActivityIndicator, Pressable, StyleSheet, type PressableProps, type StyleProp, type ViewStyle } from "react-native";

import { useDesignTokens } from "../../hooks/useDesignTokens";
import type { EnterpriseIconId } from "../../icons/registry";
import { resolveEnterpriseIcon } from "../../icons/registry";
import { Text } from "../../primitives/Text";

type ButtonProps = Omit<PressableProps, "children"> & {
  icon?: EnterpriseIconId;
  label: string;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
};

type VariantProps = ButtonProps & {
  backgroundColor: string;
  borderColor: string;
  labelColor: string;
  variant: string;
};

function BaseButton({ backgroundColor, borderColor, disabled, icon, label, labelColor, loading, style, variant, ...rest }: VariantProps) {
  const tokens = useDesignTokens();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      disabled={disabled || loading}
      style={({ hovered, pressed }) => [
        styles.base,
        {
          backgroundColor,
          borderColor,
          borderRadius: tokens.radii.clinical,
          opacity: disabled ? tokens.opacity.disabled : pressed ? tokens.opacity.strong : hovered ? tokens.opacity.medium : tokens.opacity.opaque,
          paddingHorizontal: tokens.spacing.inset.lg,
          paddingVertical: tokens.spacing.inset.sm,
        },
        style,
      ]}
      testID={`ds-button-${variant}`}
      {...rest}
    >
      {loading ? <ActivityIndicator color={labelColor} size="small" /> : null}
      {!loading && icon ? <Feather color={labelColor} name={resolveEnterpriseIcon(icon)} size={14} /> : null}
      <Text style={{ color: labelColor }} variant="subtitle">
        {label}
      </Text>
    </Pressable>
  );
}

export const PrimaryButton = memo(function PrimaryButton(props: ButtonProps) {
  const tokens = useDesignTokens();
  return (
    <BaseButton
      {...props}
      backgroundColor={tokens.colors.medical.primary}
      borderColor={tokens.colors.medical.primary}
      labelColor={tokens.colors.text.inverse}
      variant="primary"
    />
  );
});

export const SecondaryButton = memo(function SecondaryButton(props: ButtonProps) {
  const tokens = useDesignTokens();
  return (
    <BaseButton
      {...props}
      backgroundColor={tokens.colors.surface.toolbar}
      borderColor={tokens.colors.border.default}
      labelColor={tokens.colors.text.primary}
      variant="secondary"
    />
  );
});

export const GhostButton = memo(function GhostButton(props: ButtonProps) {
  const tokens = useDesignTokens();
  return (
    <BaseButton
      {...props}
      backgroundColor="transparent"
      borderColor="transparent"
      labelColor={tokens.colors.medical.primary}
      variant="ghost"
    />
  );
});

export const DangerButton = memo(function DangerButton(props: ButtonProps) {
  const tokens = useDesignTokens();
  return (
    <BaseButton
      {...props}
      backgroundColor={tokens.colors.medical.critical}
      borderColor={tokens.colors.medical.critical}
      labelColor={tokens.colors.text.primary}
      variant="danger"
    />
  );
});

export const IconButton = memo(function IconButton({ accessibilityLabel, icon, ...rest }: Omit<ButtonProps, "label"> & { accessibilityLabel: string; icon: EnterpriseIconId }) {
  const tokens = useDesignTokens();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => ({
        alignItems: "center",
        backgroundColor: tokens.colors.surface.toolbar,
        borderColor: tokens.colors.border.default,
        borderRadius: tokens.radii.clinical,
        borderWidth: 1,
        height: tokens.spacing.scale[32],
        justifyContent: "center",
        opacity: pressed ? tokens.opacity.strong : tokens.opacity.opaque,
        width: tokens.spacing.scale[32],
      })}
      testID="ds-button-icon"
      {...rest}
    >
      <Feather color={tokens.colors.text.primary} name={resolveEnterpriseIcon(icon)} size={16} />
    </Pressable>
  );
});

export const LoadingButton = memo(function LoadingButton(props: ButtonProps) {
  return <PrimaryButton {...props} loading />;
});

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 36,
  },
});
