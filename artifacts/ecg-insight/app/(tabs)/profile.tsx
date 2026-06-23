import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { RoleBadge } from "@/components/ui/Badge";
import { getDashboardStats } from "@/data/mockData";

const ROLE_LABEL: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  doctor: "Doctor",
  student: "Student",
};

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, logout, canAccess, isImpersonating, stopImpersonation } = useAuth();
  const [notifications, setNotifications] = useState(true);
  const [criticalAlerts, setCriticalAlerts] = useState(true);
  const [emailDigest, setEmailDigest] = useState(false);

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  const stats = user
    ? getDashboardStats(user.id)
    : { totalCases: 0, thisWeek: 0, accuracyRate: 95, criticalAlerts: 0 };

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          await logout();
          router.replace("/(auth)/login");
        },
      },
    ]);
  };

  if (!user) return null;

  const tierColor =
    user.role === "super_admin"
      ? "#7C3AED"
      : user.role === "admin"
      ? "#06B6D4"
      : colors.primary;

  return (
    <ScrollView
      style={[styles.flex, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.scroll,
        { paddingTop: topInset + 12, paddingBottom: bottomInset + 100 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.pageTitle, { color: colors.text }]}>Profile</Text>

      {/* Impersonation banner */}
      {isImpersonating && (
        <View style={[styles.impBanner]}>
          <Text style={{ fontSize: 14 }}>👤</Text>
          <Text style={styles.impText}>
            Impersonating — not your real account
          </Text>
          <TouchableOpacity
            style={styles.impStop}
            onPress={stopImpersonation}
          >
            <Text style={styles.impStopText}>Stop</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Avatar card */}
      <View style={[styles.avatarCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={[styles.avatar, { backgroundColor: tierColor }]}>
          <Text style={styles.avatarText}>{user.avatarInitials}</Text>
        </View>
        <View style={styles.avatarInfo}>
          <Text style={[styles.avatarName, { color: colors.text }]}>{user.name}</Text>
          <Text style={[styles.avatarEmail, { color: colors.textSecondary }]}>{user.email}</Text>
          <View style={styles.badgeRow}>
            <RoleBadge role={user.role} />
            {!user.emailVerified && (
              <View style={[styles.unverifiedBadge]}>
                <Text style={styles.unverifiedText}>Email unverified</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        {[
          { label: "Analyses", value: stats.totalCases, icon: "activity" as const },
          { label: "This Week", value: stats.thisWeek, icon: "calendar" as const },
          { label: "Accuracy", value: `${stats.accuracyRate}%`, icon: "check-circle" as const },
        ].map((s) => (
          <View
            key={s.label}
            style={[styles.statBox, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <Feather name={s.icon} size={14} color={colors.primary} />
            <Text style={[styles.statValue, { color: colors.text }]}>{s.value}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* Admin panel button — admin+ only */}
      {canAccess("admin") && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            Administration
          </Text>
          <TouchableOpacity
            style={[styles.adminBtn, { backgroundColor: colors.surface, borderColor: tierColor + "50" }]}
            onPress={() => router.push("/admin/" as any)}
            activeOpacity={0.8}
          >
            <View style={[styles.adminBtnIcon, { backgroundColor: tierColor + "15" }]}>
              <Feather name="shield" size={18} color={tierColor} />
            </View>
            <View style={styles.adminBtnText}>
              <Text style={[styles.adminBtnTitle, { color: colors.text }]}>
                {user.role === "super_admin" ? "Super Admin Panel" : "Admin Panel"}
              </Text>
              <Text style={[styles.adminBtnSub, { color: colors.textSecondary }]}>
                {user.role === "super_admin"
                  ? "Users, subscriptions, impersonation & system config"
                  : "User management, subscriptions & analytics"}
              </Text>
            </View>
            <Feather name="chevron-right" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      )}

      {/* Account info */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Account</Text>
        <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {[
            { icon: "user" as const, label: "Full Name", value: user.name },
            { icon: "mail" as const, label: "Email", value: user.email },
            { icon: "briefcase" as const, label: "Role", value: ROLE_LABEL[user.role] ?? user.role },
            ...(user.specialization ? [{ icon: "award" as const, label: "Specialization", value: user.specialization }] : []),
            ...(user.institution ? [{ icon: "home" as const, label: "Institution", value: user.institution }] : []),
          ].map((item, idx, arr) => (
            <View
              key={item.label}
              style={[
                styles.infoRow,
                idx < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
              ]}
            >
              <View style={[styles.itemIcon, { backgroundColor: colors.primaryLight }]}>
                <Feather name={item.icon} size={14} color={colors.primary} />
              </View>
              <View style={styles.itemText}>
                <Text style={[styles.itemLabel, { color: colors.textSecondary }]}>{item.label}</Text>
                <Text style={[styles.itemValue, { color: colors.text }]}>{item.value}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Subscription */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Subscription</Text>
        <View style={[styles.subCard, { borderColor: colors.primary + "40" }]}>
          <View style={styles.subRow}>
            <Text style={{ fontSize: 24 }}>
              {user.role === "super_admin" || user.role === "admin" ? "🏢" : "⭐"}
            </Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.subPlan, { color: colors.text }]}>
                {user.role === "super_admin" || user.role === "admin"
                  ? "Enterprise"
                  : user.role === "doctor"
                  ? "Professional"
                  : "Free Plan"}
              </Text>
              <Text style={[styles.subDetail, { color: colors.textSecondary }]}>
                {user.role === "student"
                  ? "Upgrade for unlimited analyses"
                  : "Active · Renews annually"}
              </Text>
            </View>
            {user.role === "student" && (
              <TouchableOpacity
                style={[styles.upgradeBtn, { backgroundColor: colors.primary }]}
              >
                <Text style={styles.upgradeBtnText}>Upgrade</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {/* Notifications */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Notifications</Text>
        <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {[
            {
              icon: "bell" as const,
              label: "Push Notifications",
              iconColor: colors.primary,
              value: notifications,
              onChange: (v: boolean) => { setNotifications(v); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); },
              trackTrue: colors.primary,
              border: true,
            },
            {
              icon: "alert-circle" as const,
              label: "Critical Alerts",
              iconColor: colors.destructive,
              value: criticalAlerts,
              onChange: (v: boolean) => { setCriticalAlerts(v); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); },
              trackTrue: colors.destructive,
              border: true,
            },
            {
              icon: "mail" as const,
              label: "Email Digest",
              iconColor: colors.accent,
              value: emailDigest,
              onChange: (v: boolean) => { setEmailDigest(v); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); },
              trackTrue: colors.accent,
              border: false,
            },
          ].map((item) => (
            <View
              key={item.label}
              style={[
                styles.toggleRow,
                item.border && { borderBottomWidth: 1, borderBottomColor: colors.border },
              ]}
            >
              <View style={styles.toggleInfo}>
                <Feather name={item.icon} size={16} color={item.iconColor} />
                <Text style={[styles.toggleLabel, { color: colors.text }]}>{item.label}</Text>
              </View>
              <Switch
                value={item.value}
                onValueChange={item.onChange}
                trackColor={{ false: colors.border, true: item.trackTrue }}
                thumbColor="#fff"
              />
            </View>
          ))}
        </View>
      </View>

      {/* Support */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Support</Text>
        <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {[
            { icon: "help-circle" as const, label: "Help & Documentation" },
            { icon: "shield" as const, label: "Privacy Policy" },
            { icon: "file-text" as const, label: "Terms of Service" },
          ].map((item, idx, arr) => (
            <TouchableOpacity
              key={item.label}
              style={[
                styles.linkRow,
                idx < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
              ]}
              activeOpacity={0.7}
              onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
            >
              <Feather name={item.icon} size={16} color={colors.textSecondary} />
              <Text style={[styles.linkLabel, { color: colors.text }]}>{item.label}</Text>
              <Feather name="chevron-right" size={14} color={colors.textSecondary} />
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Sign Out */}
      <TouchableOpacity
        style={[styles.logoutBtn, { borderColor: colors.destructive }]}
        onPress={handleLogout}
        activeOpacity={0.8}
      >
        <Feather name="log-out" size={16} color={colors.destructive} />
        <Text style={[styles.logoutText, { color: colors.destructive }]}>Sign Out</Text>
      </TouchableOpacity>

      <Text style={[styles.version, { color: colors.textSecondary }]}>
        ECG Insight v1.0.0 · Sprint 1 · AI Model v2.4
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { paddingHorizontal: 16, gap: 14 },
  pageTitle: { fontSize: 22, fontFamily: "Inter_700Bold" },
  impBanner: {
    backgroundColor: "#FEF3C7",
    borderWidth: 1,
    borderColor: "#FDE68A",
    borderRadius: 12,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  impText: { flex: 1, fontSize: 12, color: "#92400E", fontFamily: "Inter_500Medium" },
  impStop: { backgroundColor: "#D97706", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  impStopText: { color: "#fff", fontSize: 12, fontFamily: "Inter_600SemiBold" },
  avatarCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 22, fontFamily: "Inter_700Bold", color: "#fff" },
  avatarInfo: { flex: 1, gap: 4 },
  avatarName: { fontSize: 16, fontFamily: "Inter_700Bold" },
  avatarEmail: { fontSize: 12, fontFamily: "Inter_400Regular" },
  badgeRow: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  unverifiedBadge: {
    backgroundColor: "#FEF3C7",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  unverifiedText: { fontSize: 10, color: "#D97706", fontFamily: "Inter_600SemiBold" },
  statsRow: { flexDirection: "row", gap: 8 },
  statBox: {
    flex: 1,
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  statValue: { fontSize: 18, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 10, fontFamily: "Inter_400Regular", textAlign: "center" },
  section: { gap: 8 },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    paddingLeft: 2,
  },
  adminBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  adminBtnIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  adminBtnText: { flex: 1, gap: 3 },
  adminBtnTitle: { fontSize: 14, fontFamily: "Inter_700Bold" },
  adminBtnSub: { fontSize: 12, fontFamily: "Inter_400Regular" },
  sectionCard: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  itemIcon: { width: 30, height: 30, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  itemText: { flex: 1, gap: 1 },
  itemLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  itemValue: { fontSize: 14, fontFamily: "Inter_500Medium" },
  subCard: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    backgroundColor: "transparent",
  },
  subRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  subPlan: { fontSize: 15, fontFamily: "Inter_700Bold" },
  subDetail: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  upgradeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  upgradeBtnText: { color: "#fff", fontSize: 13, fontFamily: "Inter_600SemiBold" },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
  },
  toggleInfo: { flexDirection: "row", alignItems: "center", gap: 10 },
  toggleLabel: { fontSize: 14, fontFamily: "Inter_500Medium" },
  linkRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  linkLabel: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium" },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    marginTop: 4,
  },
  logoutText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  version: { textAlign: "center", fontSize: 11, fontFamily: "Inter_400Regular" },
});
