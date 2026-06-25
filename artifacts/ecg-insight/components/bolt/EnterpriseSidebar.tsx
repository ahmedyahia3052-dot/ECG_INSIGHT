import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { usePathname, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { type BoltIcon } from "./BoltUI";
import { useVisualExperience } from "@/context/VisualExperienceContext";

interface NavItem {
  icon: BoltIcon;
  label: string;
  route: string;
  adminOnly?: boolean;
  section: "Administration" | "Clinical" | "Workspace";
}

const NAV_ITEMS: NavItem[] = [
  { icon: "grid", label: "Dashboard", route: "/(tabs)", section: "Clinical" },
  { icon: "activity", label: "ECG Analysis", route: "/(tabs)/ecg-waveform", section: "Clinical" },
  { icon: "upload-cloud", label: "Upload ECG", route: "/(tabs)/upload", section: "Clinical" },
  { icon: "users", label: "Patients", route: "/(tabs)/history", section: "Clinical" },
  { icon: "file-text", label: "Reports", route: "/(tabs)/reports-dashboard", section: "Clinical" },
  { icon: "bar-chart-2", label: "Analytics", route: "/(tabs)/population-analytics", section: "Clinical" },
  { icon: "bell", label: "Notifications", route: "/(tabs)/notification-center", section: "Workspace" },
  { icon: "credit-card", label: "Billing & Subscription", route: "/(tabs)/subscription", section: "Workspace" },
  { icon: "briefcase", label: "Team Management", route: "/(tabs)/workforce-dashboard", section: "Workspace" },
  { icon: "shield", label: "Admin Dashboard", route: "/admin/", adminOnly: true, section: "Administration" },
  { icon: "award", label: "License Management", route: "/admin/licenses", adminOnly: true, section: "Administration" },
  { icon: "settings", label: "Profile & Settings", route: "/(tabs)/profile", section: "Workspace" },
];

function SidebarNavButton({
  active,
  activePulse,
  collapsed,
  item,
  onPress,
}: {
  active: boolean;
  activePulse: Animated.Value;
  collapsed: boolean;
  item: NavItem;
  onPress: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const pulseScale = activePulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });
  const pulseOpacity = activePulse.interpolate({ inputRange: [0, 1], outputRange: [0.44, 0.86] });

  return (
    <View style={styles.navItemWrap}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={item.label}
        accessibilityHint={`Navigate to ${item.label}`}
        focusable
        onHoverIn={() => setHovered(true)}
        onHoverOut={() => setHovered(false)}
        onLongPress={() => setHovered((value) => !value)}
        onPress={onPress}
        style={({ pressed }) => [
          styles.navItem,
          {
            borderColor: active ? "#22D3EEAA" : hovered ? "#22D3EE3A" : "transparent",
            elevation: hovered || active ? 8 : 0,
            justifyContent: collapsed ? "center" : "flex-start",
            shadowColor: active || hovered ? "#00E5FF" : "transparent",
            shadowOpacity: active ? 0.28 : hovered ? 0.18 : 0,
            transform: [{ scale: pressed ? 0.985 : hovered ? 1.012 : 1 }],
          },
        ]}
      >
        {active ? (
          <>
            <LinearGradient
              colors={["rgba(0,229,255,0.22)", "rgba(20,184,166,0.12)", "rgba(8,15,25,0)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <Animated.View style={[styles.activePulse, { opacity: pulseOpacity, transform: [{ scale: pulseScale }] }]} />
            <Animated.View style={[styles.activeRail, { opacity: pulseOpacity, transform: [{ scaleY: pulseScale }] }]} />
          </>
        ) : null}
        <Animated.View style={{ transform: [{ scale: active ? pulseScale : 1 }] }}>
          <Feather name={item.icon} size={19} color={active ? "#67E8F9" : "#B6C7D8"} />
        </Animated.View>
        {!collapsed ? (
          <Text style={[styles.navText, { color: active ? "#F8FAFC" : "#C8D7E5" }]} numberOfLines={1}>
            {item.label}
          </Text>
        ) : null}
      </Pressable>
      {collapsed && hovered && Platform.OS === "web" ? (
        <View pointerEvents="none" style={styles.tooltip}>
          <Text style={styles.tooltipText}>{item.label}</Text>
        </View>
      ) : null}
    </View>
  );
}

export function EnterpriseSidebar({
  collapsed,
  onClose,
  placement = "overlay",
  visible = true,
}: {
  collapsed: boolean;
  onClose?: () => void;
  onToggleCollapse?: () => void;
  placement?: "overlay" | "push";
  visible?: boolean;
}) {
  const colors = useColors();
  const pathname = usePathname();
  const router = useRouter();
  const { canAccess, logout, user } = useAuth();
  const { triggerHaptic } = useVisualExperience();
  const { width: windowWidth } = useWindowDimensions();
  const activePulse = useRef(new Animated.Value(0)).current;
  const entry = useRef(new Animated.Value(placement === "overlay" ? 0 : 1)).current;
  const widthAnim = useRef(new Animated.Value(collapsed ? 76 : 312)).current;

  const overlayMode = placement === "overlay";
  const width = overlayMode ? windowWidth : collapsed ? 76 : 312;
  const items = useMemo(() => NAV_ITEMS.filter((item) => !item.adminOnly || canAccess("admin")), [canAccess]);
  const userRole = user?.isOwner ? "Owner Account" : user?.role?.replace("_", " ") ?? "Clinical User";
  const initials = user?.avatarInitials || user?.name?.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "EC";

  useEffect(() => {
    Animated.spring(widthAnim, {
      damping: 22,
      mass: 0.9,
      stiffness: 180,
      toValue: width,
      useNativeDriver: false,
    }).start();
  }, [width, widthAnim]);

  useEffect(() => {
    Animated.timing(entry, {
      duration: overlayMode ? 220 : 160,
      easing: Easing.out(Easing.cubic),
      toValue: visible ? 1 : 0,
      useNativeDriver: true,
    }).start();
  }, [entry, overlayMode, visible]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(activePulse, {
          duration: 1200,
          easing: Easing.inOut(Easing.quad),
          toValue: 1,
          useNativeDriver: true,
        }),
        Animated.timing(activePulse, {
          duration: 1200,
          easing: Easing.inOut(Easing.quad),
          toValue: 0,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [activePulse]);

  if (!visible) return null;

  const translateX = overlayMode
    ? entry.interpolate({
        inputRange: [0, 1],
        outputRange: [-Math.min(windowWidth, 420), 0],
      })
    : 0;
  const opacity = overlayMode ? entry : 1;

  return (
    <Animated.View
      style={[
        styles.sidebar,
        placement === "push" ? styles.pushSidebar : styles.overlaySidebar,
        {
          borderColor: "#22D3EE55",
          shadowColor: Platform.OS === "web" ? "#00E5FF" : "#000",
          opacity,
          transform: [{ translateX }],
          width: widthAnim,
        },
      ]}
    >
      <BlurView intensity={12} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={StyleSheet.absoluteFill}>
        <LinearGradient
          colors={["rgba(15,23,42,0.94)", "rgba(15,23,42,0.82)", "rgba(8,15,25,0.92)"]}
          style={StyleSheet.absoluteFill}
        />
      </View>
      <View pointerEvents="none" style={styles.medicalGlow} />

      <View style={styles.header}>
        <View style={[styles.brandMark, { borderColor: "#22D3EE66" }]}>
          <Feather name="activity" size={collapsed ? 18 : 22} color="#67E8F9" />
        </View>
        {!collapsed ? (
          <View style={styles.brandText}>
            <Text style={styles.brandTitle}>ECG Insight</Text>
            <Text style={styles.brandSubtitle}>Medical AI Platform</Text>
          </View>
        ) : null}
      </View>

      {!collapsed ? (
        <View style={styles.userCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.userMeta}>
            <Text style={styles.userName} numberOfLines={1}>{user?.name ?? "ECG Clinician"}</Text>
            <Text style={styles.userRole} numberOfLines={1}>{userRole}</Text>
            <View style={styles.onlineRow}>
              <View style={styles.onlineDot} />
              <Text style={styles.onlineText}>Online</Text>
            </View>
          </View>
        </View>
      ) : null}

      <ScrollView contentContainerStyle={styles.nav} showsVerticalScrollIndicator={false}>
        {items.map((item, index) => {
          const active = pathname === item.route || (item.route !== "/(tabs)" && pathname.startsWith(item.route.replace("/(tabs)", "")));
          const previous = items[index - 1];
          return (
            <React.Fragment key={item.label}>
              {!collapsed && (!previous || previous.section !== item.section) ? (
                <Text style={styles.sectionLabel}>{item.section}</Text>
              ) : null}
              <SidebarNavButton
                active={active}
                activePulse={activePulse}
                collapsed={collapsed}
                item={item}
                onPress={() => {
                  void triggerHaptic("selection");
                  router.push(item.route as never);
                  onClose?.();
                }}
              />
            </React.Fragment>
          );
        })}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable accessibilityRole="button" onPress={() => router.push("/(tabs)/settings" as never)} style={styles.footerAction}>
          <Feather name="settings" size={17} color="#B6C7D8" />
          {!collapsed ? <Text style={styles.footerText}>Settings</Text> : null}
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => router.push("/(tabs)/profile" as never)} style={styles.footerAction}>
          <Feather name="user" size={17} color="#B6C7D8" />
          {!collapsed ? <Text style={styles.footerText}>Profile</Text> : null}
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            void triggerHaptic("warning");
            logout().catch(() => {});
            onClose?.();
          }}
          style={[styles.footerAction, styles.logoutAction]}
        >
          <Feather name="log-out" size={17} color="#FCA5A5" />
          {!collapsed ? <Text style={[styles.footerText, styles.logoutText]}>Logout</Text> : null}
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  activePulse: {
    borderColor: "rgba(103,232,249,0.42)",
    borderRadius: 18,
    borderWidth: 1,
    bottom: 3,
    left: 3,
    position: "absolute",
    right: 3,
    top: 3,
  },
  activeRail: { backgroundColor: "#67E8F9", borderRadius: 999, bottom: 9, left: 0, position: "absolute", top: 9, width: 4 },
  avatar: {
    alignItems: "center",
    backgroundColor: "rgba(0,229,255,0.14)",
    borderColor: "rgba(103,232,249,0.36)",
    borderRadius: 18,
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  avatarText: { color: "#E0F7FA", fontFamily: "Inter_700Bold", fontSize: 14 },
  brandMark: {
    alignItems: "center",
    backgroundColor: "rgba(0,229,255,0.12)",
    borderRadius: 18,
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  brandSubtitle: { color: "#8FB6C8", fontFamily: "Inter_600SemiBold", fontSize: 10, letterSpacing: 1.1, textTransform: "uppercase" },
  brandText: { flex: 1, minWidth: 0 },
  brandTitle: { color: "#F8FAFC", fontFamily: "Inter_700Bold", fontSize: 19 },
  footer: { borderColor: "rgba(103,232,249,0.16)", borderTopWidth: 1, gap: 6, paddingTop: 12 },
  footerAction: { alignItems: "center", borderRadius: 14, flexDirection: "row", gap: 10, minHeight: 48, paddingHorizontal: 12 },
  footerText: { color: "#C8D7E5", fontFamily: "Inter_700Bold", fontSize: 13 },
  header: { alignItems: "center", flexDirection: "row", gap: 10, paddingBottom: 8 },
  logoutAction: { backgroundColor: "rgba(239,68,68,0.08)" },
  logoutText: { color: "#FCA5A5" },
  medicalGlow: {
    backgroundColor: "rgba(0,229,255,0.08)",
    borderRadius: 120,
    height: 180,
    position: "absolute",
    right: -90,
    top: -70,
    width: 180,
  },
  nav: { gap: 6, overflow: "visible", paddingBottom: 12, paddingTop: 4 },
  navItem: {
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    minHeight: 48,
    overflow: "hidden",
    paddingHorizontal: 12,
    shadowOffset: { height: 10, width: 0 },
    shadowRadius: 20,
  },
  navItemWrap: { overflow: "visible", position: "relative" },
  navText: { flex: 1, fontFamily: "Inter_700Bold", fontSize: 13.5 },
  onlineDot: { backgroundColor: "#34D399", borderRadius: 999, height: 7, width: 7 },
  onlineRow: { alignItems: "center", flexDirection: "row", gap: 6, marginTop: 5 },
  onlineText: { color: "#8FE8C7", fontFamily: "Inter_600SemiBold", fontSize: 11 },
  sectionLabel: { color: "#6CBFD1", fontFamily: "Inter_700Bold", fontSize: 10, letterSpacing: 1.2, marginTop: 8, paddingHorizontal: 10, textTransform: "uppercase" },
  sidebar: {
    backgroundColor: "rgba(15,23,42,0.82)",
    borderRadius: 30,
    borderWidth: 1,
    elevation: 14,
    gap: 14,
    overflow: "visible",
    padding: 12,
    shadowOffset: { height: 18, width: 0 },
    shadowOpacity: 0.24,
    shadowRadius: 32,
  },
  overlaySidebar: { borderRadius: 0, bottom: 0, left: 0, position: "absolute", top: 0, zIndex: 50 },
  pushSidebar: { alignSelf: "stretch", marginBottom: 20, marginLeft: 18, marginTop: 20, position: "relative" },
  tooltip: {
    backgroundColor: "rgba(15,23,42,0.96)",
    borderColor: "rgba(0,255,255,0.18)",
    borderRadius: 12,
    borderWidth: 1,
    left: 64,
    minWidth: 132,
    paddingHorizontal: 10,
    paddingVertical: 8,
    position: "absolute",
    shadowColor: "#00E5FF",
    shadowOffset: { height: 8, width: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 18,
    top: 4,
    zIndex: 90,
  },
  tooltipText: { color: "#E0F7FA", fontFamily: "Inter_700Bold", fontSize: 12 },
  userCard: {
    alignItems: "center",
    backgroundColor: "rgba(15,35,52,0.72)",
    borderColor: "rgba(103,232,249,0.18)",
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    padding: 12,
  },
  userMeta: { flex: 1 },
  userName: { color: "#F8FAFC", fontFamily: "Inter_700Bold", fontSize: 14 },
  userRole: { color: "#9FB7C9", fontFamily: "Inter_500Medium", fontSize: 12, marginTop: 2, textTransform: "capitalize" },
});
