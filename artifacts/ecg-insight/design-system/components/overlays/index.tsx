import React, { memo, type PropsWithChildren } from "react";
import { Modal, Pressable, View } from "react-native";

import { useDesignTokens } from "../../hooks/useDesignTokens";
import { Text } from "../../primitives/Text";
import { Stack } from "../../primitives/Stack";

type OverlayItem = { id: string; label: string };

export const DropdownMenu = memo(function DropdownMenu({ items, label }: { items: OverlayItem[]; label: string }) {
  const tokens = useDesignTokens();
  return (
    <View
      accessibilityLabel={label}
      style={{
        backgroundColor: tokens.colors.surface.card,
        borderColor: tokens.colors.border.default,
        borderRadius: tokens.radii.card,
        borderWidth: 1,
        padding: tokens.spacing.inset.sm,
      }}
      testID="ds-dropdown-menu"
    >
      {items.map((item) => (
        <Text key={item.id} variant="body">{item.label}</Text>
      ))}
    </View>
  );
});

export const Popover = memo(function Popover({ children, title }: PropsWithChildren<{ title: string }>) {
  const tokens = useDesignTokens();
  return (
    <View
      style={{
        backgroundColor: tokens.colors.surface.card,
        borderColor: tokens.colors.border.default,
        borderRadius: tokens.radii.card,
        borderWidth: 1,
        padding: tokens.spacing.inset.md,
        ...tokens.shadows.md,
      }}
      testID="ds-popover"
    >
      <Text variant="subtitle">{title}</Text>
      {children}
    </View>
  );
});

export const Tooltip = memo(function Tooltip({ children, label }: PropsWithChildren<{ label: string }>) {
  const tokens = useDesignTokens();
  return (
    <View accessibilityLabel={label} testID="ds-tooltip">
      {children}
      <View
        style={{
          alignSelf: "flex-start",
          backgroundColor: tokens.colors.gray[900],
          borderRadius: tokens.radii.sm,
          marginTop: tokens.spacing.stack.tight,
          paddingHorizontal: tokens.spacing.inset.sm,
          paddingVertical: tokens.spacing.inset.xs,
        }}
      >
        <Text style={{ color: tokens.colors.text.primary }} variant="caption">{label}</Text>
      </View>
    </View>
  );
});

export const ModalOverlay = memo(function ModalOverlay({ children, onClose, open, title }: PropsWithChildren<{ onClose: () => void; open: boolean; title: string }>) {
  const tokens = useDesignTokens();
  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={open}>
      <Pressable accessibilityRole="button" onPress={onClose} style={{ backgroundColor: `rgba(0,0,0,${tokens.opacity.overlay})`, flex: 1, justifyContent: "center", padding: tokens.spacing.inset.lg }}>
        <Pressable onPress={(event) => event.stopPropagation()}>
          <Stack
            gap={12}
            style={{
              backgroundColor: tokens.colors.surface.dialog,
              borderColor: tokens.colors.border.default,
              borderRadius: tokens.radii.dialog,
              borderWidth: 1,
              padding: tokens.spacing.inset.lg,
            }}
          >
            <Text variant="title">{title}</Text>
            {children}
          </Stack>
        </Pressable>
      </Pressable>
    </Modal>
  );
});
