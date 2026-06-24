import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { getAIStatistics } from "@/services/ai";
import { apiCaseToEcgCase, listCases } from "@/services/clinical";
import { listNotifications } from "@/services/collaboration";
import { getMySubscription } from "@/services/subscriptions";
import {
  BoltBadge,
  BoltButton,
  BoltCard,
  BoltEmpty,
  BoltHero,
  BoltNavCard,
  BoltScreen,
  BoltStat,
} from "@/components/bolt/BoltUI";

export default function DashboardScreen() {
  const colors = useColors();
  const router = useRouter();
  const { authToken, canAccess, isImpersonating, stopImpersonation, user } = useAuth();
  const token = authToken?.token;

  const casesQuery = useQuery({
    enabled: !!token,
    queryFn: async () => listCases(token!, new URLSearchParams({ page: "1", pageSize: "6" })),
    queryKey: ["bolt-dashboard-cases", token],
  });
  const aiStatsQuery = useQuery({
    enabled: !!token && canAccess("admin"),
    queryFn: async () => getAIStatistics(token!),
    queryKey: ["bolt-ai-statistics", token],
    retry: false,
  });
  const subscriptionQuery = useQuery({
    enabled: !!token,
    queryFn: async () => getMySubscription(token!),
    queryKey: ["bolt-my-subscription", token],
    retry: false,
  });
  const notificationsQuery = useQuery({
    enabled: !!token,
    queryFn: async () => listNotifications(token!, new URLSearchParams({ pageSize: "20" })),
    queryKey: ["bolt-notifications", token],
    retry: false,
  });

  const cases = casesQuery.data?.cases.map(apiCaseToEcgCase) ?? [];
  const critical = cases.filter((item) => item.status === "critical").length;
  const reviewed = cases.filter((item) => item.confidence > 0).length;
  const notifications = notificationsQuery.data?.notifications ?? [];
  const unread = notifications.filter((item) => {
    const record = item as { read?: boolean; readAt?: string | null };
    return !record.read && !record.readAt;
  }).length;
  const aiStats = aiStatsQuery.data?.statistics;
  const planName = subscriptionQuery.data?.lifetimeAccess.granted
    ? "Lifetime"
    : subscriptionQuery.data?.plan.name ?? (user?.subscriptionTier ?? "free").toUpperCase();

  return (
    <BoltScreen>
      {isImpersonating ? (
        <BoltCard style={styles.banner}>
          <Text style={[styles.bannerText, { color: "#92400E" }]}>Viewing as {user?.name}</Text>
          <BoltButton label="Exit" onPress={stopImpersonation} variant="outline" />
        </BoltCard>
      ) : null}

      <BoltHero
        actions={<BoltButton icon="upload-cloud" label="Upload ECG" onPress={() => router.push("/(tabs)/upload")} />}
        eyebrow="Clinical command center"
        subtitle={`Welcome back, ${user?.name ?? "Clinician"}. Your Bolt-inspired dashboard is connected to live ECG cases, AI statistics, notifications, and subscription APIs.`}
        title="Dashboard"
      />

      <View style={styles.statsRow}>
        <BoltStat icon="file-text" label="Recent Cases" value={casesQuery.isLoading ? "..." : cases.length} />
        <BoltStat accent={colors.warning} icon="clock" label="Pending Reviews" value={Math.max(cases.length - reviewed, 0)} />
      </View>
      <View style={styles.statsRow}>
        <BoltStat accent={colors.destructive} icon="alert-triangle" label="Critical Cases" value={critical} />
        <BoltStat accent={colors.success} icon="activity" label="AI Confidence" value={`${aiStats?.averageConfidence ?? "Live"}${aiStats ? "%" : ""}`} />
      </View>

      <BoltCard style={styles.analytics}>
        <View style={styles.cardHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Subscription Status</Text>
          <BoltBadge label={String(planName)} />
        </View>
        <Text style={[styles.muted, { color: colors.textSecondary }]}>
          {subscriptionQuery.data?.lifetimeAccess.granted
            ? "Special Lifetime Access · unlimited ECG analyses"
            : `${subscriptionQuery.data?.quota.remaining ?? "Live"} analyses remaining · quota enforcement is active`}
        </Text>
      </BoltCard>

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
        <BoltEmpty title="Live cases unavailable" message="The API returned an error. No mock data is displayed in production UI." />
      ) : cases.length === 0 ? (
        <BoltEmpty title={casesQuery.isLoading ? "Loading cases..." : "No ECG cases yet"} message="Upload an ECG to create the first live clinical case." />
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

const styles = StyleSheet.create({
  analytics: { gap: 8 },
  banner: { alignItems: "center", flexDirection: "row", gap: 10 },
  bannerText: { flex: 1, fontFamily: "Inter_700Bold", fontSize: 13 },
  cardHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  caseCard: { alignItems: "center", flexDirection: "row", gap: 10 },
  caseMain: { flex: 1, gap: 4 },
  caseName: { fontFamily: "Inter_700Bold", fontSize: 15 },
  muted: { fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 19 },
  navGrid: { gap: 10 },
  sectionHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 18 },
  statsRow: { flexDirection: "row", gap: 10 },
});
