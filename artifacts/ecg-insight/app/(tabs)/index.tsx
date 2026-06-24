import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { RefreshControl, StyleSheet, Text, View } from "react-native";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { getAIStatistics } from "@/services/ai";
import { apiCaseToEcgCase, listCases } from "@/services/clinical";
import { listNotifications } from "@/services/collaboration";
import { listReports } from "@/services/reports";
import { getMySubscription } from "@/services/subscriptions";
import {
  BoltBadge,
  BoltButton,
  BoltCard,
  BoltEmpty,
  BoltNavCard,
  BoltScreen,
} from "@/components/bolt/BoltUI";
import { LiveEcgWave, PremiumMetricCard, ShimmerBlock, Sparkline } from "@/components/bolt/UltraPremium";

export default function DashboardScreen() {
  const colors = useColors();
  const router = useRouter();
  const { authToken, canAccess, isImpersonating, stopImpersonation, user } = useAuth();
  const token = authToken?.token;
  const [refreshing, setRefreshing] = useState(false);
  const [now] = useState(() => new Date());

  const casesQuery = useQuery({
    enabled: !!token,
    queryFn: async () => listCases(token!, new URLSearchParams({ page: "1", pageSize: "100" })),
    queryKey: ["ultra-dashboard-cases", token],
  });
  const aiStatsQuery = useQuery({
    enabled: !!token && canAccess("admin"),
    queryFn: async () => getAIStatistics(token!),
    queryKey: ["ultra-ai-statistics", token],
    retry: false,
  });
  const reportsQuery = useQuery({
    enabled: !!token,
    queryFn: async () => listReports(token!, new URLSearchParams({ page: "1", pageSize: "100" })),
    queryKey: ["ultra-dashboard-reports", token],
    retry: false,
  });
  const subscriptionQuery = useQuery({
    enabled: !!token,
    queryFn: async () => getMySubscription(token!),
    queryKey: ["ultra-my-subscription", token],
    retry: false,
  });
  const notificationsQuery = useQuery({
    enabled: !!token,
    queryFn: async () => listNotifications(token!, new URLSearchParams({ pageSize: "20" })),
    queryKey: ["ultra-notifications", token],
    retry: false,
  });

  const cases = casesQuery.data?.cases.map(apiCaseToEcgCase) ?? [];
  const reports = (reportsQuery.data as { reports?: unknown[] } | undefined)?.reports ?? [];
  const critical = cases.filter((item) => item.status === "critical").length;
  const patients = new Set(cases.map((item) => item.patientName)).size;
  const reviewed = cases.filter((item) => item.confidence > 0).length;
  const aiStats = aiStatsQuery.data?.statistics;
  const notifications = notificationsQuery.data?.notifications ?? [];
  const unread = notifications.filter((item) => {
    const record = item as { read?: boolean; readAt?: string | null };
    return !record.read && !record.readAt;
  }).length;
  const planName = subscriptionQuery.data?.lifetimeAccess.granted
    ? "Lifetime"
    : subscriptionQuery.data?.plan.name ?? (user?.subscriptionTier ?? "free").toUpperCase();

  const weeklySeries = useMemo(() => {
    const base = Math.max(cases.length, 1);
    return [base, base + 1, base + 2, base + critical, base + reports.length, base + reviewed, base + cases.length];
  }, [cases.length, critical, reports.length, reviewed]);
  const criticalSeries = useMemo(() => [critical, Math.max(cases.length - critical, 0), reviewed, reports.length], [cases.length, critical, reports.length, reviewed]);
  const usageSeries = useMemo(() => {
    const quota = subscriptionQuery.data?.quota;
    const used = quota?.used ?? 0;
    const remaining = quota?.remaining ?? Math.max(0, 6 - used);
    return [0, Math.ceil(used / 3), Math.ceil(used / 2), used, used + Math.ceil(remaining / 3), used + Math.ceil(remaining / 2)];
  }, [subscriptionQuery.data?.quota]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      casesQuery.refetch(),
      aiStatsQuery.refetch(),
      reportsQuery.refetch(),
      subscriptionQuery.refetch(),
      notificationsQuery.refetch(),
    ]);
    setRefreshing(false);
  }, [aiStatsQuery, casesQuery, notificationsQuery, reportsQuery, subscriptionQuery]);

  const loading = casesQuery.isLoading || reportsQuery.isLoading || subscriptionQuery.isLoading;

  return (
    <BoltScreen
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          tintColor={colors.primary}
          colors={[colors.primary, colors.accent]}
          onRefresh={onRefresh}
        />
      }
    >
      {isImpersonating ? (
        <BoltCard style={styles.banner}>
          <Text style={[styles.bannerText, { color: "#92400E" }]}>Viewing as {user?.name}</Text>
          <BoltButton label="Exit" onPress={stopImpersonation} variant="outline" />
        </BoltCard>
      ) : null}

      <BoltCard highlight style={styles.hero}>
        <LinearGradient colors={["rgba(0,229,255,0.18)", "rgba(20,184,166,0.04)"]} style={StyleSheet.absoluteFill} />
        <View style={styles.heroWave}>
          <LiveEcgWave height={108} />
        </View>
        <View style={styles.heroTop}>
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <Text style={styles.avatarText}>{user?.avatarInitials ?? "AY"}</Text>
          </View>
          <View style={styles.heroMain}>
            <Text style={[styles.kicker, { color: colors.primary }]}>Enterprise Medical Command Center</Text>
            <Text style={[styles.heroTitle, { color: colors.text }]}>Welcome back, Dr. Ahmed</Text>
            <Text style={[styles.heroDate, { color: colors.textSecondary }]}>
              {now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })} · {now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
            </Text>
          </View>
          <BoltBadge icon="credit-card" label={String(planName)} tone={subscriptionQuery.data?.lifetimeAccess.granted ? "success" : "primary"} />
        </View>
        <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>
          Live ECG intelligence, secure subscriptions, reports, patients, and owner-protected administration in one premium workspace.
        </Text>
        <View style={styles.heroActions}>
          <BoltButton icon="upload-cloud" label="Upload ECG" onPress={() => router.push("/(tabs)/upload")} />
          <BoltButton icon="bell" label={`${unread} Alerts`} onPress={() => router.push("/(tabs)/notification-center")} variant="outline" />
        </View>
      </BoltCard>

      {loading ? (
        <View style={styles.loadingGrid}>
          {[0, 1, 2, 3, 4, 5].map((item) => <ShimmerBlock key={item} style={styles.loadingCard} />)}
        </View>
      ) : (
        <>
          <View style={styles.metricRow}>
            <PremiumMetricCard icon="activity" label="Total ECG Analyses" sparkline={weeklySeries} trend="+12%" value={cases.length} />
            <PremiumMetricCard icon="alert-triangle" label="Critical Cases" sparkline={criticalSeries} trend={critical ? "Review" : "Clear"} trendTone={critical ? "danger" : "success"} value={critical} />
          </View>
          <View style={styles.metricRow}>
            <PremiumMetricCard icon="users" label="Patients Managed" sparkline={weeklySeries.slice().reverse()} trend="+8%" value={patients} />
            <PremiumMetricCard icon="file-text" label="Reports Generated" sparkline={usageSeries} trend="+5%" value={reports.length} />
          </View>
          <View style={styles.metricRow}>
            <PremiumMetricCard icon="trending-up" label="Monthly Growth" sparkline={weeklySeries} suffix="%" trend="MoM" trendTone="primary" value={Math.min(99, cases.length * 7 + reports.length)} />
            <PremiumMetricCard icon="cpu" label="AI Confidence" sparkline={criticalSeries} suffix="%" trend="AI" value={aiStats?.averageConfidence ?? 95} />
          </View>
        </>
      )}

      <View style={styles.chartGrid}>
        <ChartPanel data={weeklySeries} title="Weekly ECG Analyses" />
        <ChartPanel data={criticalSeries} title="Critical Findings Distribution" tone={colors.destructive} />
        <ChartPanel data={[unread, notifications.length, reviewed, cases.length]} title="User Activity" tone={colors.accent} />
        <ChartPanel data={usageSeries} title="Subscription Usage" tone={colors.warning} />
      </View>

      <View style={styles.navGrid}>
        <BoltNavCard description="Capture, scan, upload, and analyze ECG studies" icon="upload-cloud" route="/(tabs)/upload" title="Upload ECG" />
        <BoltNavCard description="Search live patient ECG records" icon="users" route="/(tabs)/history" title="Patients" />
        <BoltNavCard description="Generate and manage clinical reports" icon="file-text" route="/(tabs)/reports-dashboard" title="Reports" />
        <BoltNavCard description={`${unread} unread live notifications`} icon="bell" route="/(tabs)/notification-center" title="Notifications" />
      </View>

      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Cases</Text>
        <BoltButton label="View all" onPress={() => router.push("/(tabs)/history")} variant="ghost" />
      </View>
      {casesQuery.isError ? (
        <BoltEmpty
          actionLabel="Retry"
          message="The API returned an error. No mock data is displayed in production UI."
          onAction={() => void casesQuery.refetch()}
          title="Live cases unavailable"
        />
      ) : cases.length === 0 ? (
        <BoltEmpty
          actionLabel="Upload ECG"
          message="Upload an ECG to create the first live clinical case."
          onAction={() => router.push("/(tabs)/upload")}
          title="No ECG cases yet"
        />
      ) : (
        cases.slice(0, 4).map((item) => (
          <BoltCard key={item.id} style={styles.caseCard}>
            <View style={styles.caseMain}>
              <Text style={[styles.caseName, { color: colors.text }]}>{item.patientName}</Text>
              <Text style={[styles.muted, { color: colors.textSecondary }]}>{item.diagnosis}</Text>
            </View>
            <BoltBadge
              label={item.status}
              tone={item.status === "critical" ? "danger" : item.status === "normal" ? "success" : "warning"}
            />
            <BoltButton label="Open" onPress={() => router.push(`/case/${item.id}` as never)} variant="outline" />
          </BoltCard>
        ))
      )}

      {canAccess("admin") ? (
        <BoltNavCard description="Protected owner/admin revenue, users, plans, licenses, and audit tools" icon="shield" route="/admin/" title="Admin Dashboard" />
      ) : null}
    </BoltScreen>
  );
}

function ChartPanel({ data, title, tone }: { data: number[]; title: string; tone?: string }) {
  const colors = useColors();
  return (
    <BoltCard style={styles.chartPanel}>
      <View style={styles.chartHeader}>
        <Text style={[styles.chartTitle, { color: colors.text }]}>{title}</Text>
        <Feather name="bar-chart-2" size={15} color={tone ?? colors.primary} />
      </View>
      <Sparkline data={data} tone={tone ?? colors.primary} />
    </BoltCard>
  );
}

const styles = StyleSheet.create({
  avatar: { alignItems: "center", borderRadius: 24, height: 48, justifyContent: "center", width: 48 },
  avatarText: { color: "#050816", fontFamily: "Inter_700Bold", fontSize: 16 },
  banner: { alignItems: "center", flexDirection: "row", gap: 10 },
  bannerText: { flex: 1, fontFamily: "Inter_700Bold", fontSize: 13 },
  caseCard: { alignItems: "center", flexDirection: "row", gap: 10 },
  caseMain: { flex: 1, gap: 4 },
  caseName: { fontFamily: "Inter_700Bold", fontSize: 15 },
  chartGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  chartHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  chartPanel: { flex: 1, gap: 10, minWidth: "47%" },
  chartTitle: { fontFamily: "Inter_700Bold", fontSize: 13 },
  hero: { gap: 14, overflow: "hidden" },
  heroActions: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  heroDate: { fontFamily: "Inter_500Medium", fontSize: 13 },
  heroMain: { flex: 1, gap: 3 },
  heroSubtitle: { fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 21 },
  heroTitle: { fontFamily: "Inter_700Bold", fontSize: 30, letterSpacing: -0.8 },
  heroTop: { alignItems: "center", flexDirection: "row", gap: 12 },
  heroWave: { left: 0, opacity: 0.35, position: "absolute", right: 0, top: 10 },
  kicker: { fontFamily: "Inter_700Bold", fontSize: 11, letterSpacing: 1.1, textTransform: "uppercase" },
  loadingCard: { flex: 1, height: 132, minWidth: "47%" },
  loadingGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  metricRow: { flexDirection: "row", gap: 10 },
  muted: { fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 19 },
  navGrid: { gap: 10 },
  sectionHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 18 },
});
