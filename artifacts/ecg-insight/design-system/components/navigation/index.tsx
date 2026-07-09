import { Feather } from "@expo/vector-icons";
import React, { memo } from "react";
import { Pressable, View } from "react-native";

import { useDesignTokens } from "../../hooks/useDesignTokens";
import type { EnterpriseIconId } from "../../icons/registry";
import { resolveEnterpriseIcon } from "../../icons/registry";
import { Text } from "../../primitives/Text";
import { Stack } from "../../primitives/Stack";

export type NavItemConfig = {
  href: string;
  icon: EnterpriseIconId;
  id: string;
  label: string;
};

export const Sidebar = memo(function Sidebar({ items }: { items: NavItemConfig[] }) {
  const tokens = useDesignTokens();
  return (
    <View
      style={{
        backgroundColor: tokens.colors.surface.sidebar,
        borderColor: tokens.colors.border.default,
        borderRightWidth: 1,
        minWidth: 240,
        padding: tokens.spacing.inset.md,
      }}
      testID="ds-sidebar"
    >
      <Stack gap={4}>
        {items.map((item) => (
          <NavItem key={item.id} active={false} item={item} />
        ))}
      </Stack>
    </View>
  );
});

export const SidebarRail = memo(function SidebarRail() {
  const tokens = useDesignTokens();
  return <View style={{ backgroundColor: tokens.colors.border.default, width: 1 }} testID="ds-sidebar-rail" />;
});

export const NavItem = memo(function NavItem({ active, item }: { active: boolean; item: NavItemConfig }) {
  const tokens = useDesignTokens();
  return (
    <Pressable
      accessibilityRole="link"
      style={{
        alignItems: "center",
        backgroundColor: active ? tokens.colors.surface.toolbar : "transparent",
        borderRadius: tokens.radii.clinical,
        flexDirection: "row",
        gap: tokens.spacing.stack.tight,
        paddingHorizontal: tokens.spacing.inset.sm,
        paddingVertical: tokens.spacing.inset.sm,
      }}
      testID={`ds-nav-item-${item.id}`}
    >
      <Feather color={active ? tokens.colors.medical.primary : tokens.colors.text.secondary} name={resolveEnterpriseIcon(item.icon)} size={16} />
      <Text tone={active ? "default" : "muted"} variant="body">{item.label}</Text>
    </Pressable>
  );
});

export const NavGroup = memo(function NavGroup({ items, label }: { items: NavItemConfig[]; label: string }) {
  return (
    <Stack gap={8} testID="ds-nav-group">
      <Text tone="muted" variant="caption">{label}</Text>
      {items.map((item) => (
        <NavItem key={item.id} active={false} item={item} />
      ))}
    </Stack>
  );
});

export const Tabs = memo(function Tabs({ tabs, value }: { tabs: Array<{ id: string; label: string }>; value: string }) {
  const tokens = useDesignTokens();
  return (
    <Stack direction="row" gap={8} testID="ds-tabs">
      {tabs.map((tab) => {
        const active = tab.id === value;
        return (
          <View
            key={tab.id}
            style={{
              borderBottomColor: active ? tokens.colors.medical.primary : "transparent",
              borderBottomWidth: 2,
              paddingBottom: tokens.spacing.inset.xs,
              paddingHorizontal: tokens.spacing.inset.sm,
            }}
          >
            <Text tone={active ? "default" : "muted"} variant="subtitle">{tab.label}</Text>
          </View>
        );
      })}
    </Stack>
  );
});

export const TopNavbar = memo(function TopNavbar({ title }: { title: string }) {
  const tokens = useDesignTokens();
  return (
    <View
      style={{
        alignItems: "center",
        backgroundColor: tokens.colors.surface.toolbar,
        borderBottomColor: tokens.colors.border.default,
        borderBottomWidth: 1,
        flexDirection: "row",
        justifyContent: "space-between",
        minHeight: 56,
        paddingHorizontal: tokens.spacing.inset.lg,
      }}
      testID="ds-top-navbar"
    >
      <Text variant="title">{title}</Text>
    </View>
  );
});
