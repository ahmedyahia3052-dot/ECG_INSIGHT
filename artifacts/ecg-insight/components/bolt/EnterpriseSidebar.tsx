import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { usePathname, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useMemo, useRef } from "react";
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
  const widthAnim = useRef(new Animated.Value(collapsed ? 84 : 304)).current;

  const overlayMode = placement === "overlay";
  const width = overlayMode ? windowWidth : collapsed ? 84 : 304;
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
      <BlurView intensity={8} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={StyleSheet.absoluteFill}>
        <LinearGradient
          colors={["rgba(8,15,25,0.97)", "rgba(8,15,25,0.92)", "rgba(3,10,18,0.96)"]}
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
        {onToggleCollapse ? (
          <Pressable accessibilityRole="button" onPress={onToggleCollapse} style={styles.collapseButton}>
            <Feather name={collapsed ? "chevrons-right" : "chevrons-left"} size={16} color="#67E8F9" />
          </Pressable>
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
        {items.map((item) => {
          const active = pathname === item.route || (item.route !== "/(tabs)" && pathname.startsWith(item.route.replace("/(tabs)", "")));
          const pulseScale = activePulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });
          const pulseOpacity = activePulse.interpolate({ inputRange: [0, 1], outputRange: [0.44, 0.86] });
          return (
            <Pressable
              key={item.label}
              accessibilityRole="button"
              accessibilityLabel={item.label}
              onPress={() => {
                void triggerHaptic("selection");
                router.push(item.route as never);
                onClose?.();
              }}
              style={({ hovered, pressed }) => [
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
                <Feather name={item.icon} size={18} color={active ? "#67E8F9" : "#B6C7D8"} />
              </Animated.View>
              {!collapsed ? (
                <Text style={[styles.navText, { color: active ? "#F8FAFC" : "#C8D7E5" }]} numberOfLines={1}>
                  {item.label}
                </Text>
              ) : null}
            </Pressable>
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
  brandText: { flex: 1 },
  brandTitle: { color: "#F8FAFC", fontFamily: "Inter_700Bold", fontSize: 19 },
  collapseButton: {
    alignItems: "center",
    backgroundColor: "rgba(0,229,255,0.1)",
    borderColor: "rgba(103,232,249,0.26)",
    borderRadius: 12,
    borderWidth: 1,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  footer: { borderColor: "rgba(103,232,249,0.16)", borderTopWidth: 1, gap: 6, paddingTop: 12 },
  footerAction: { alignItems: "center", borderRadius: 14, flexDirection: "row", gap: 10, minHeight: 40, paddingHorizontal: 12 },
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
  nav: { gap: 6, paddingBottom: 12, paddingTop: 4 },
  navItem: {
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    minHeight: 46,
    overflow: "hidden",
    paddingHorizontal: 12,
    shadowOffset: { height: 10, width: 0 },
    shadowRadius: 20,
  },
  navText: { flex: 1, fontFamily: "Inter_700Bold", fontSize: 13.5 },
  onlineDot: { backgroundColor: "#34D399", borderRadius: 999, height: 7, width: 7 },
  onlineRow: { alignItems: "center", flexDirection: "row", gap: 6, marginTop: 5 },
  onlineText: { color: "#8FE8C7", fontFamily: "Inter_600SemiBold", fontSize: 11 },
  sidebar: {
    backgroundColor: "rgba(8,15,25,0.92)",
    borderRadius: 30,
    borderWidth: 1,
    elevation: 14,
    gap: 14,
    overflow: "hidden",
    padding: 14,
    shadowOffset: { height: 18, width: 0 },
    shadowOpacity: 0.24,
    shadowRadius: 32,
  },
  overlaySidebar: { borderRadius: 0, bottom: 0, left: 0, position: "absolute", top: 0, zIndex: 50 },
  pushSidebar: { alignSelf: "stretch", marginBottom: 20, marginLeft: 18, marginTop: 20, position: "relative" },
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
