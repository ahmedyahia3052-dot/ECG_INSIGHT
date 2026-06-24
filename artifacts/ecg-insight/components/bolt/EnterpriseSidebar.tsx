import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { BlurView } from "expo-blur";
import { usePathname, useRouter } from "expo-router";
import React from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { BoltBadge, BoltBrand, type BoltIcon } from "./BoltUI";

interface NavItem {
  icon: BoltIcon;
  label: string;
  route: string;
  adminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { icon: "grid", label: "Dashboard", route: "/(tabs)" },
  { icon: "activity", label: "ECG Analysis", route: "/(tabs)/ecg-waveform" },
  { icon: "upload-cloud", label: "Upload ECG", route: "/(tabs)/upload" },
  { icon: "users", label: "Patients", route: "/(tabs)/history" },
  { icon: "file-text", label: "Reports", route: "/(tabs)/reports-dashboard" },
  { icon: "bar-chart-2", label: "Analytics", route: "/(tabs)/population-analytics" },
  { icon: "bell", label: "Notifications", route: "/(tabs)/notification-center" },
  { icon: "credit-card", label: "Billing & Subscription", route: "/(tabs)/subscription" },
  { icon: "briefcase", label: "Team Management", route: "/(tabs)/workforce-dashboard" },
  { icon: "shield", label: "Admin Dashboard", route: "/admin/", adminOnly: true },
  { icon: "award", label: "License Management", route: "/admin/licenses", adminOnly: true },
  { icon: "settings", label: "Profile & Settings", route: "/(tabs)/profile" },
];

export function EnterpriseSidebar({
  collapsed,
  onClose,
  onToggleCollapse,
  visible = true,
}: {
  collapsed: boolean;
  onClose?: () => void;
  onToggleCollapse?: () => void;
  visible?: boolean;
}) {
  const colors = useColors();
  const pathname = usePathname();
  const router = useRouter();
  const { canAccess } = useAuth();

  if (!visible) return null;

  const width = collapsed ? 76 : 276;
  const items = NAV_ITEMS.filter((item) => !item.adminOnly || canAccess("admin"));

  return (
    <BlurView
      intensity={Platform.OS === "web" ? 70 : 92}
      tint="dark"
      style={[
        styles.sidebar,
        {
          borderColor: colors.gradientBorder,
          shadowColor: colors.primary,
          width,
        },
      ]}
    >
      <View style={styles.header}>
        <BoltBrand compact={collapsed} />
        {onToggleCollapse ? (
          <Pressable accessibilityRole="button" onPress={onToggleCollapse} style={styles.collapseButton}>
            <Feather name={collapsed ? "chevrons-right" : "chevrons-left"} size={16} color={colors.primary} />
          </Pressable>
        ) : null}
      </View>
      <View style={styles.nav}>
        {items.map((item) => {
          const active = pathname === item.route || (item.route !== "/(tabs)" && pathname.startsWith(item.route.replace("/(tabs)", "")));
          return (
            <Pressable
              key={item.label}
              accessibilityRole="button"
              accessibilityLabel={item.label}
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                router.push(item.route as never);
                onClose?.();
              }}
              style={({ pressed }) => [
                styles.navItem,
                {
                  backgroundColor: active ? colors.primary + "18" : pressed ? colors.primary + "10" : "transparent",
                  borderColor: active ? colors.primary + "55" : "transparent",
                  justifyContent: collapsed ? "center" : "flex-start",
                },
              ]}
            >
              {active ? <View style={[styles.activeRail, { backgroundColor: colors.primary }]} /> : null}
              <Feather name={item.icon} size={18} color={active ? colors.primary : colors.textSecondary} />
              {!collapsed ? (
                <Text style={[styles.navText, { color: active ? colors.text : colors.textSecondary }]} numberOfLines={1}>
                  {item.label}
                </Text>
              ) : null}
            </Pressable>
          );
        })}
      </View>
      {!collapsed ? (
        <View style={[styles.statusCard, { borderColor: colors.primary + "33" }]}>
          <BoltBadge icon="shield" label="Enterprise Secure" tone="success" />
          <Text style={[styles.statusText, { color: colors.textSecondary }]}>
            APIs, subscriptions, ECG AI and admin controls preserved.
          </Text>
        </View>
      ) : null}
    </BlurView>
  );
}

const styles = StyleSheet.create({
  activeRail: { borderRadius: 999, bottom: 9, left: 0, position: "absolute", top: 9, width: 4 },
  collapseButton: { padding: 8 },
  header: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", paddingBottom: 8 },
  nav: { gap: 4 },
  navItem: {
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    minHeight: 44,
    overflow: "hidden",
    paddingHorizontal: 12,
  },
  navText: { flex: 1, fontFamily: "Inter_700Bold", fontSize: 13 },
  sidebar: {
    borderRadius: 28,
    borderWidth: 1,
    bottom: 20,
    elevation: 14,
    gap: 14,
    left: 18,
    overflow: "hidden",
    padding: 14,
    position: "absolute",
    shadowOffset: { height: 18, width: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 28,
    top: 20,
    zIndex: 50,
  },
  statusCard: { borderRadius: 18, borderWidth: 1, gap: 8, marginTop: "auto", padding: 12 },
  statusText: { fontFamily: "Inter_400Regular", fontSize: 11, lineHeight: 16 },
});
