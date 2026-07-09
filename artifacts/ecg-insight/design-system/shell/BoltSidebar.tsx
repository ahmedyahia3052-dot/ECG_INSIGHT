import { Feather } from "@expo/vector-icons";
import React, { memo, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { AppNavItem } from "@/types/navigation";

import { Avatar } from "../components/media";
import { useDesignTokens } from "../hooks/useDesignTokens";
import { Text } from "../primitives/Text";
import { Stack } from "../primitives/Stack";
import { roleLabel } from "./shell-utils";
import type { ShellUser } from "./types";

type Props = {
  compact: boolean;
  isMobile: boolean;
  navItems: AppNavItem[];
  onLogout: () => void;
  onNavigate: (href: string) => void;
  onToggleCollapsed: () => void;
  pathname: string;
  unreadCount: number;
  user: ShellUser | null;
};

export const BoltSidebar = memo(function BoltSidebar({
  compact,
  isMobile,
  navItems,
  onLogout,
  onNavigate,
  onToggleCollapsed,
  pathname,
  unreadCount,
  user,
}: Props) {
  const tokens = useDesignTokens();
  const insets = useSafeAreaInsets();
  const [hoveredNav, setHoveredNav] = useState<string | null>(null);

  return (
    <View
      style={{
        backgroundColor: tokens.colors.surface.sidebar,
        borderColor: tokens.colors.border.default,
        borderRightWidth: 1,
        paddingTop: isMobile ? insets.top + 18 : tokens.spacing.inset.lg,
        width: compact ? 82 : 306,
        ...(isMobile ? { bottom: 0, left: 0, position: "absolute", top: 0, zIndex: 10 } : {}),
      }}
      testID="bolt-sidebar"
    >
      <Stack direction="row" gap={12} style={{ alignItems: "center", paddingHorizontal: compact ? 0 : tokens.spacing.inset.lg, justifyContent: compact ? "center" : "flex-start" }}>
        <View style={{ alignItems: "center", backgroundColor: tokens.colors.medical.primary, borderRadius: tokens.radii.card, height: 40, justifyContent: "center", width: 40 }}>
          <Feather color={tokens.colors.text.inverse} name="activity" size={20} />
        </View>
        {!compact ? (
          <View>
            <Text variant="heading">ECG Insight</Text>
            <Text tone="muted" variant="small">Medical AI Platform</Text>
          </View>
        ) : null}
      </Stack>

      <Stack
        direction="row"
        gap={12}
        style={{
          alignItems: "center",
          backgroundColor: tokens.colors.surface.card,
          borderColor: tokens.colors.border.default,
          borderRadius: tokens.radii.dialog,
          borderWidth: 1,
          justifyContent: compact ? "center" : "flex-start",
          margin: tokens.spacing.inset.lg,
          padding: tokens.spacing.inset.sm,
        }}
      >
        <Avatar initials={user?.avatarInitials ?? "DR"} size={42} />
        {!compact ? (
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text numberOfLines={1} variant="subtitle">{user?.name ?? "Clinical User"}</Text>
            <Text numberOfLines={1} tone="muted" variant="caption">{roleLabel(user?.role)} • Online</Text>
          </View>
        ) : null}
      </Stack>

      {!isMobile ? (
        <Pressable
          accessibilityLabel={compact ? "Expand sidebar" : "Collapse sidebar"}
          accessibilityRole="button"
          onPress={onToggleCollapsed}
          style={{
            alignItems: "center",
            alignSelf: "center",
            backgroundColor: tokens.colors.surface.toolbar,
            borderColor: tokens.colors.border.default,
            borderRadius: tokens.radii.full,
            borderWidth: 1,
            flexDirection: "row",
            gap: tokens.spacing.stack.tight,
            marginBottom: tokens.spacing.inset.sm,
            minHeight: 38,
            paddingHorizontal: tokens.spacing.inset.sm,
          }}
        >
          <Feather color={tokens.colors.medical.primary} name={compact ? "chevrons-right" : "chevrons-left"} size={17} />
          {!compact ? <Text style={{ color: tokens.colors.medical.primary }} variant="caption">Collapse</Text> : null}
        </Pressable>
      ) : null}

      <ScrollView showsVerticalScrollIndicator style={{ flex: 1 }}>
        <Stack gap={16} style={{ padding: compact ? tokens.spacing.inset.sm : tokens.spacing.inset.lg }}>
          {(["CLINICAL", "WORKSPACE", "DEVELOPER"] as const).map((group) => {
            const groupItems = navItems.filter((item) => item.group === group);
            if (!groupItems.length) return null;
            return (
              <Stack gap={8} key={group}>
                {!compact ? <Text tone="muted" variant="small">{group}</Text> : null}
                {groupItems.map((item) => {
                  const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`));
                  const hovered = hoveredNav === `${item.group}-${item.href}-${item.title}`;
                  return (
                    <Pressable
                      accessibilityLabel={`Open ${item.title}`}
                      accessibilityRole="button"
                      key={`${item.group}-${item.href}-${item.title}`}
                      onHoverIn={() => setHoveredNav(`${item.group}-${item.href}-${item.title}`)}
                      onHoverOut={() => setHoveredNav(null)}
                      onPress={() => onNavigate(item.href)}
                      style={{
                        alignItems: "center",
                        backgroundColor: active ? tokens.colors.surface.toolbar : hovered ? `${tokens.colors.medical.primary}14` : "transparent",
                        borderColor: active ? tokens.colors.border.focus : hovered ? `${tokens.colors.medical.primary}38` : "transparent",
                        borderRadius: tokens.radii.dialog,
                        borderWidth: 1,
                        flexDirection: "row",
                        gap: 11,
                        justifyContent: compact ? "center" : "flex-start",
                        minHeight: 44,
                        paddingHorizontal: compact ? 0 : tokens.spacing.inset.sm,
                        width: compact ? 48 : undefined,
                      }}
                    >
                      {active ? (
                        <View style={{ backgroundColor: tokens.colors.medical.primary, borderRadius: tokens.radii.full, bottom: 8, left: 0, position: "absolute", top: 8, width: 3 }} />
                      ) : null}
                      <Feather color={active || hovered ? tokens.colors.medical.primary : tokens.colors.text.secondary} name={item.icon} size={18} />
                      {!compact ? <Text tone={active ? "default" : "muted"} variant="body">{item.title}</Text> : null}
                      {item.href === "/notifications" && unreadCount ? (
                        <View style={{ backgroundColor: tokens.colors.medical.critical, borderRadius: 99, height: 8, marginLeft: compact ? 0 : "auto", width: 8 }} />
                      ) : null}
                      {compact && hovered ? (
                        <View style={{ backgroundColor: tokens.colors.surface.card, borderColor: tokens.colors.border.default, borderRadius: tokens.radii.sm, borderWidth: 1, left: 58, paddingHorizontal: 10, paddingVertical: 7, position: "absolute", zIndex: 30 }}>
                          <Text variant="caption">{item.title}</Text>
                        </View>
                      ) : null}
                    </Pressable>
                  );
                })}
              </Stack>
            );
          })}
        </Stack>
      </ScrollView>

      <Pressable
        accessibilityLabel="Log out"
        accessibilityRole="button"
        onPress={onLogout}
        style={{
          alignItems: "center",
          borderColor: tokens.colors.border.default,
          borderRadius: tokens.radii.dialog,
          borderWidth: 1,
          flexDirection: "row",
          gap: 10,
          justifyContent: compact ? "center" : "flex-start",
          margin: tokens.spacing.inset.lg,
          minHeight: 46,
          paddingHorizontal: compact ? 0 : tokens.spacing.inset.sm,
        }}
      >
        <Feather color={tokens.colors.medical.critical} name="log-out" size={18} />
        {!compact ? <Text style={{ color: tokens.colors.medical.critical }} variant="subtitle">Logout</Text> : null}
      </Pressable>
    </View>
  );
});

export const BoltMobileDrawer = memo(function BoltMobileDrawer({
  children,
  onClose,
  open,
}: {
  children: React.ReactNode;
  onClose: () => void;
  open: boolean;
}) {
  const tokens = useDesignTokens();
  if (!open) return null;
  return (
    <View style={{ ...{ bottom: 0, left: 0, position: "absolute", right: 0, top: 0, zIndex: 50 } }} testID="bolt-mobile-drawer">
      <Pressable accessibilityLabel="Close navigation" onPress={onClose} style={{ ...{ bottom: 0, left: 0, position: "absolute", right: 0, top: 0, backgroundColor: `rgba(2,6,23,${tokens.opacity.overlay})` } }} />
      {children}
    </View>
  );
});
