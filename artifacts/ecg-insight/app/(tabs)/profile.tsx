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

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [notifications, setNotifications] = useState(true);
  const [criticalAlerts, setCriticalAlerts] = useState(true);

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  const stats = user ? getDashboardStats(user.id) : { totalCases: 10, thisWeek: 4, accuracyRate: 95, criticalAlerts: 1 };

  const handleLogout = () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out?",
      [
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
      ]
    );
  };

  if (!user) return null;

  const sections = [
    {
      title: "Account",
      items: [
        { icon: "user" as const, label: "Full Name", value: user.name },
        { icon: "mail" as const, label: "Email", value: user.email },
        { icon: "briefcase" as const, label: "Role", value: user.role },
        ...(user.specialization ? [{ icon: "award" as const, label: "Specialization", value: user.specialization }] : []),
        ...(user.institution ? [{ icon: "home" as const, label: "Institution", value: user.institution }] : []),
      ],
    },
  ];

  return (
    <ScrollView
      style={[styles.flex, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.scroll, { paddingTop: topInset + 12, paddingBottom: bottomInset + 90 }]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.pageTitle, { color: colors.foreground }]}>Profile</Text>

      <View style={[styles.avatarCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
          <Text style={styles.avatarText}>{user.avatarInitials}</Text>
        </View>
        <View style={styles.avatarInfo}>
          <Text style={[styles.avatarName, { color: colors.foreground }]}>{user.name}</Text>
          <Text style={[styles.avatarEmail, { color: colors.mutedForeground }]}>{user.email}</Text>
          <RoleBadge role={user.role} />
        </View>
      </View>

      <View style={styles.statsRow}>
        {[
          { label: "Total Analyses", value: stats.totalCases, icon: "activity" as const },
          { label: "This Week", value: stats.thisWeek, icon: "calendar" as const },
          { label: "Accuracy", value: `${stats.accuracyRate}%`, icon: "check-circle" as const },
        ].map((s) => (
          <View key={s.label} style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name={s.icon} size={14} color={colors.primary} />
            <Text style={[styles.statValue, { color: colors.foreground }]}>{s.value}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{s.label}</Text>
          </View>
        ))}
      </View>

      {sections.map((section) => (
        <View key={section.title} style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>{section.title}</Text>
          <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {section.items.map((item, idx) => (
              <View
                key={item.label}
                style={[
                  styles.infoRow,
                  idx < section.items.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                ]}
              >
                <View style={[styles.itemIcon, { backgroundColor: colors.primary + "12" }]}>
                  <Feather name={item.icon} size={14} color={colors.primary} />
                </View>
                <View style={styles.itemText}>
                  <Text style={[styles.itemLabel, { color: colors.mutedForeground }]}>{item.label}</Text>
                  <Text style={[styles.itemValue, { color: colors.foreground }]}>{item.value}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      ))}

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>Notifications</Text>
        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.toggleRow, { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
            <View style={styles.toggleInfo}>
              <Feather name="bell" size={16} color={colors.primary} />
              <Text style={[styles.toggleLabel, { color: colors.foreground }]}>Push Notifications</Text>
            </View>
            <Switch
              value={notifications}
              onValueChange={(v) => {
                setNotifications(v);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              trackColor={{ false: colors.muted, true: colors.primary }}
              thumbColor={"#fff"}
            />
          </View>
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Feather name="alert-circle" size={16} color={colors.destructive} />
              <Text style={[styles.toggleLabel, { color: colors.foreground }]}>Critical Alerts</Text>
            </View>
            <Switch
              value={criticalAlerts}
              onValueChange={(v) => {
                setCriticalAlerts(v);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              trackColor={{ false: colors.muted, true: colors.destructive }}
              thumbColor={"#fff"}
            />
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>Support</Text>
        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
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
              <Feather name={item.icon} size={16} color={colors.mutedForeground} />
              <Text style={[styles.linkLabel, { color: colors.foreground }]}>{item.label}</Text>
              <Feather name="chevron-right" size={14} color={colors.mutedForeground} />
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <TouchableOpacity
        style={[styles.logoutBtn, { borderColor: colors.destructive }]}
        onPress={handleLogout}
        activeOpacity={0.8}
      >
        <Feather name="log-out" size={16} color={colors.destructive} />
        <Text style={[styles.logoutText, { color: colors.destructive }]}>Sign Out</Text>
      </TouchableOpacity>

      <Text style={[styles.version, { color: colors.mutedForeground }]}>ECG Insight v1.0.0 · AI Model v2.3</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { paddingHorizontal: 16, gap: 14 },
  pageTitle: { fontSize: 22, fontFamily: "Inter_700Bold" },
  avatarCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
  },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 22, fontFamily: "Inter_700Bold", color: "#fff" },
  avatarInfo: { flex: 1, gap: 4 },
  avatarName: { fontSize: 16, fontFamily: "Inter_700Bold" },
  avatarEmail: { fontSize: 12, fontFamily: "Inter_400Regular" },
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
  sectionTitle: { fontSize: 11, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.6, paddingLeft: 2 },
  sectionCard: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  itemIcon: { width: 30, height: 30, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  itemText: { flex: 1, gap: 1 },
  itemLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  itemValue: { fontSize: 14, fontFamily: "Inter_500Medium" },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
  },
  toggleInfo: { flexDirection: "row", alignItems: "center", gap: 10 },
  toggleLabel: { fontSize: 14, fontFamily: "Inter_500Medium" },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
  },
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
