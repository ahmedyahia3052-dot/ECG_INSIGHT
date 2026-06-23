import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { RecentCaseCard } from "@/components/dashboard/RecentCaseCard";
import AccuracyChart from "@/components/dashboard/AccuracyChart";
import NotificationsPanel from "@/components/dashboard/NotificationsPanel";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  getCasesByUser,
  getDashboardStats,
  MOCK_CASES,
  NOTIFICATIONS,
} from "@/data/mockData";

function ImpersonationBanner() {
  const colors = useColors();
  const { isImpersonating, user, stopImpersonation } = useAuth();
  if (!isImpersonating) return null;
  return (
    <View
      style={{
        backgroundColor: "#FEF3C7",
        borderWidth: 1,
        borderColor: "#FDE68A",
        borderRadius: 12,
        padding: 10,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginBottom: 4,
      }}
    >
      <Text style={{ fontSize: 14 }}>👤</Text>
      <Text style={{ flex: 1, fontSize: 12, color: "#92400E", fontFamily: "Inter_500Medium" }}>
        Viewing as <Text style={{ fontFamily: "Inter_700Bold" }}>{user?.name}</Text>
      </Text>
      <TouchableOpacity
        onPress={stopImpersonation}
        style={{ backgroundColor: "#D97706", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 }}
      >
        <Text style={{ color: "#fff", fontSize: 12, fontFamily: "Inter_600SemiBold" }}>Exit</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, canAccess } = useAuth();
  const router = useRouter();
  const [showNotifications, setShowNotifications] = useState(false);

  const cases = user ? getCasesByUser(user.id) : MOCK_CASES.slice(0, 5);
  const stats = user
    ? getDashboardStats(user.id)
    : { totalCases: 10, thisWeek: 4, accuracyRate: 95, criticalAlerts: 1, normalCount: 6, abnormalCount: 4 };

  const recentCases = cases.slice(0, 4);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  const unreadNotifs = NOTIFICATIONS.filter((n) => {
    if (n.targetRole && user && !n.targetRole.includes(user.role)) return false;
    return !n.read;
  }).length;

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <>
      <ScrollView
        style={[styles.flex, { backgroundColor: colors.background }]}
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: topInset + 12, paddingBottom: bottomInset + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <ImpersonationBanner />

        {/* Top Bar */}
        <View style={styles.topBar}>
          <View style={styles.greeting}>
            <Text style={[styles.greetText, { color: colors.textSecondary }]}>
              {greeting()},
            </Text>
            <Text style={[styles.name, { color: colors.text }]}>
              {user?.name?.split(" ")[0] ?? "Clinician"}
            </Text>
          </View>
          <View style={styles.topActions}>
            {canAccess("admin") && (
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => router.push("/admin/" as any)}
                activeOpacity={0.7}
              >
                <Feather name="shield" size={16} color={colors.primary} />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowNotifications(true);
              }}
              activeOpacity={0.7}
            >
              <Feather name="bell" size={16} color={colors.text} />
              {unreadNotifs > 0 && (
                <View style={[styles.badge, { backgroundColor: colors.destructive }]}>
                  <Text style={styles.badgeText}>{unreadNotifs > 9 ? "9+" : unreadNotifs}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Role chip */}
        {user && (
          <View style={styles.roleRow}>
            <View
              style={[
                styles.roleChip,
                {
                  backgroundColor:
                    user.role === "super_admin"
                      ? "#7C3AED20"
                      : user.role === "admin"
                      ? "#06B6D420"
                      : colors.primaryLight,
                },
              ]}
            >
              <Text
                style={[
                  styles.roleText,
                  {
                    color:
                      user.role === "super_admin"
                        ? "#7C3AED"
                        : user.role === "admin"
                        ? "#0891B2"
                        : colors.primary,
                  },
                ]}
              >
                {user.role === "super_admin"
                  ? "🛡️ Super Admin"
                  : user.role === "admin"
                  ? "⚙️ Admin"
                  : user.role === "doctor"
                  ? "🩺 " + (user.specialization ?? "Doctor")
                  : "📚 Medical Student"}
              </Text>
            </View>
            {user.institution && (
              <Text style={[styles.institution, { color: colors.textSecondary }]} numberOfLines={1}>
                {user.institution}
              </Text>
            )}
          </View>
        )}

        {/* Critical alert banner */}
        {stats.criticalAlerts > 0 && (
          <TouchableOpacity
            style={[
              styles.alertBanner,
              { backgroundColor: colors.destructive + "12", borderColor: colors.destructive + "30" },
            ]}
            onPress={() => router.push("/(tabs)/history" as any)}
            activeOpacity={0.8}
          >
            <Feather name="alert-circle" size={16} color={colors.destructive} />
            <Text style={[styles.alertText, { color: colors.destructive }]}>
              {stats.criticalAlerts} critical case{stats.criticalAlerts > 1 ? "s" : ""} require immediate attention
            </Text>
            <Feather name="chevron-right" size={14} color={colors.destructive} />
          </TouchableOpacity>
        )}

        {/* KPI stats */}
        <View style={styles.statsRow}>
          <StatsCard icon="activity" label="Total Analyses" value={stats.totalCases} sub="All time" />
          <StatsCard icon="calendar" label="This Week" value={stats.thisWeek} sub="+2 from last week" accent />
        </View>
        <View style={styles.statsRow}>
          <StatsCard
            icon="check-circle"
            label="Accuracy Rate"
            value={`${stats.accuracyRate}%`}
            sub="AI model v2.4"
          />
          <StatsCard
            icon="alert-triangle"
            label="Critical Alerts"
            value={stats.criticalAlerts}
            sub={stats.criticalAlerts > 0 ? "Action required" : "All clear"}
            danger={stats.criticalAlerts > 0}
          />
        </View>
        <View style={styles.statsRow}>
          <StatsCard
            icon="check-square"
            label="Normal"
            value={stats.normalCount}
            sub="No intervention needed"
          />
          <StatsCard
            icon="alert-octagon"
            label="Abnormal"
            value={stats.abnormalCount}
            sub="Requires review"
            danger={stats.abnormalCount > 0}
          />
        </View>

        {/* Accuracy trend chart */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Accuracy Trend
          </Text>
          <AccuracyChart />
        </View>

        {/* Recent Cases */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Cases</Text>
            <TouchableOpacity onPress={() => router.push("/(tabs)/history" as any)}>
              <Text style={[styles.seeAll, { color: colors.primary }]}>See all</Text>
            </TouchableOpacity>
          </View>

          {recentCases.length === 0 ? (
            <EmptyState
              icon="inbox"
              title="No cases yet"
              description="Upload your first ECG to get started with AI analysis"
              actionLabel="Upload ECG"
              onAction={() => router.push("/(tabs)/upload" as any)}
            />
          ) : (
            <View style={styles.caseList}>
              {recentCases.map((c) => (
                <RecentCaseCard key={c.id} ecgCase={c} />
              ))}
            </View>
          )}
        </View>

        {/* Upload CTA */}
        <TouchableOpacity
          style={[styles.uploadCta, { backgroundColor: colors.primary }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push("/(tabs)/upload" as any);
          }}
          activeOpacity={0.85}
        >
          <Feather name="upload-cloud" size={18} color="#fff" />
          <Text style={styles.ctaText}>Analyze New ECG</Text>
          <Feather name="arrow-right" size={16} color="#fff" />
        </TouchableOpacity>
      </ScrollView>

      <NotificationsPanel
        visible={showNotifications}
        onClose={() => setShowNotifications(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { paddingHorizontal: 16, gap: 14 },
  topBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  greeting: { gap: 2 },
  greetText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  name: { fontSize: 22, fontFamily: "Inter_700Bold" },
  topActions: { flexDirection: "row", gap: 8 },
  actionBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  badge: {
    position: "absolute",
    top: 4,
    right: 4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  badgeText: { color: "#fff", fontSize: 9, fontFamily: "Inter_700Bold" },
  roleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  roleChip: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  roleText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  institution: { fontSize: 12, fontFamily: "Inter_400Regular", flex: 1 },
  alertBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  alertText: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium" },
  statsRow: { flexDirection: "row", gap: 10 },
  section: { gap: 10 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  seeAll: { fontSize: 13, fontFamily: "Inter_500Medium" },
  caseList: { gap: 8 },
  uploadCta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 14,
  },
  ctaText: {
    flex: 1,
    textAlign: "center",
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
});
