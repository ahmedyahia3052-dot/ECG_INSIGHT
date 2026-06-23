import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React from "react";
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
import { EmptyState } from "@/components/ui/EmptyState";
import { getCasesByUser, getDashboardStats, MOCK_CASES } from "@/data/mockData";

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const router = useRouter();

  const cases = user ? getCasesByUser(user.id) : MOCK_CASES.slice(0, 5);
  const stats = user ? getDashboardStats(user.id) : { totalCases: 10, thisWeek: 4, accuracyRate: 95, criticalAlerts: 1 };

  const recentCases = cases.slice(0, 4);
  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <ScrollView
      style={[styles.flex, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.scroll, { paddingTop: topInset + 12, paddingBottom: bottomInset + 90 }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.topBar}>
        <View style={styles.greeting}>
          <Text style={[styles.greetText, { color: colors.mutedForeground }]}>
            {greeting()},
          </Text>
          <Text style={[styles.name, { color: colors.foreground }]}>
            {user?.name ?? "Clinician"}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.notifBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          activeOpacity={0.7}
          onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
        >
          <Feather name="bell" size={18} color={colors.foreground} />
          {stats.criticalAlerts > 0 && (
            <View style={[styles.badge, { backgroundColor: colors.destructive }]}>
              <Text style={styles.badgeText}>{stats.criticalAlerts}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {stats.criticalAlerts > 0 && (
        <TouchableOpacity
          style={[styles.alertBanner, { backgroundColor: colors.destructive + "12", borderColor: colors.destructive + "30" }]}
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

      <View style={styles.statsRow}>
        <StatsCard
          icon="activity"
          label="Total Analyses"
          value={stats.totalCases}
          sub="All time"
        />
        <StatsCard
          icon="calendar"
          label="This Week"
          value={stats.thisWeek}
          sub="+2 from last week"
          accent
        />
      </View>
      <View style={styles.statsRow}>
        <StatsCard
          icon="check-circle"
          label="Accuracy Rate"
          value={`${stats.accuracyRate}%`}
          sub="AI model v2.3"
        />
        <StatsCard
          icon="alert-triangle"
          label="Critical Alerts"
          value={stats.criticalAlerts}
          sub={stats.criticalAlerts > 0 ? "Action required" : "All clear"}
          danger={stats.criticalAlerts > 0}
        />
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Recent Cases</Text>
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
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { paddingHorizontal: 16, gap: 14 },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  greeting: { gap: 2 },
  greetText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  name: { fontSize: 20, fontFamily: "Inter_700Bold" },
  notifBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  badge: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  badgeText: { display: "none" },
  alertBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  alertText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  statsRow: { flexDirection: "row", gap: 10 },
  section: { gap: 12 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
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
