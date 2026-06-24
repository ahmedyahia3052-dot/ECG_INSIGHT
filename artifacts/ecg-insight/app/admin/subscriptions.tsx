import { useQuery } from "@tanstack/react-query";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { getSubscriptionAnalytics, listLicenses, listSubscriptionPlans } from "@/services/subscriptions";
import { BoltBadge, BoltCard, BoltEmpty, BoltHero, BoltScreen, BoltStat } from "@/components/bolt/BoltUI";

export default function AdminSubscriptionsScreen() {
  const colors = useColors();
  const { authToken, user } = useAuth();
  const token = authToken?.token;
  const plansQuery = useQuery({
    enabled: !!token && user?.role === "super_admin",
    queryFn: async () => listSubscriptionPlans(token!),
    queryKey: ["bolt-admin-plans", token],
  });
  const analyticsQuery = useQuery({
    enabled: !!token && user?.role === "super_admin",
    queryFn: async () => getSubscriptionAnalytics(token!),
    queryKey: ["bolt-admin-subscription-analytics-page", token],
  });
  const licensesQuery = useQuery({
    enabled: !!token && user?.role === "super_admin",
    queryFn: async () => listLicenses(token!),
    queryKey: ["bolt-admin-licenses-summary", token],
  });

  if (user?.role !== "super_admin") {
    return (
      <BoltScreen>
        <BoltEmpty title="Super Admin Access Required" message="Subscription administration remains hidden from public users." />
      </BoltScreen>
    );
  }

  const analytics = analyticsQuery.data?.analytics;
  const plans = plansQuery.data?.plans.filter((plan) => String(plan.code) !== "lifetime") ?? [];
  const licenses = licensesQuery.data?.licenses ?? [];

  return (
    <BoltScreen>
      <BoltHero
        eyebrow="Revenue and licensing"
        subtitle="Live subscription plans, revenue analytics, payment status summaries, and private license records. Lifetime remains hidden from public plans."
        title="Subscription Management"
      />
      <View style={styles.statsRow}>
        <BoltStat icon="users" label="Active Users" value={analytics?.activeUsers ?? "..."} />
        <BoltStat icon="dollar-sign" label="Monthly Revenue" value={`$${((analytics?.monthlyRevenueCents ?? 0) / 100).toLocaleString()}`} />
      </View>
      <View style={styles.statsRow}>
        <BoltStat icon="activity" label="Daily Analyses" value={analytics?.dailyAnalyses ?? "..."} />
        <BoltStat icon="award" label="Private Licenses" value={licenses.length} />
      </View>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Public Plans</Text>
      {plansQuery.isError ? (
        <BoltEmpty title="Plans unavailable" message="Unable to load subscription plans." />
      ) : plans.length === 0 ? (
        <BoltEmpty title={plansQuery.isLoading ? "Loading plans..." : "No public plans"} message="No active public plans returned by the API." />
      ) : (
        plans.map((plan) => (
          <BoltCard key={plan.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={[styles.title, { color: colors.text }]}>{plan.name}</Text>
              <BoltBadge label={plan.active ? "Active" : "Inactive"} tone={plan.active ? "success" : "muted"} />
            </View>
            <Text style={[styles.price, { color: colors.primary }]}>
              ${(plan.priceCents / 100).toLocaleString()} {plan.currency} · {plan.billingCycle}
            </Text>
            <Text style={[styles.meta, { color: colors.textSecondary }]}>
              {plan.analysisQuota === null ? "Unlimited analyses" : `${plan.analysisQuota} analyses`} · {plan.teamManagement ? "Team management" : "Standard access"}
            </Text>
          </BoltCard>
        ))
      )}

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Payment Status</Text>
      {(analytics?.paymentStatusSummary ?? []).map((item) => (
        <BoltCard key={item.status} style={styles.paymentRow}>
          <Text style={[styles.title, { color: colors.text }]}>{item.status}</Text>
          <BoltBadge label={String(item.count)} />
        </BoltCard>
      ))}

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Private Licenses</Text>
      {licenses.slice(0, 8).map((license) => (
        <BoltCard key={license.id} style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={[styles.title, { color: colors.text }]}>{license.userName}</Text>
            <BoltBadge label={license.status} tone={license.status === "ACTIVE" ? "success" : "muted"} />
          </View>
          <Text style={[styles.meta, { color: colors.textSecondary }]}>{license.email} · {license.subscriptionType}</Text>
        </BoltCard>
      ))}
    </BoltScreen>
  );
}

const styles = StyleSheet.create({
  card: { gap: 8 },
  cardHeader: { alignItems: "center", flexDirection: "row", gap: 10, justifyContent: "space-between" },
  meta: { fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 20 },
  paymentRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  price: { fontFamily: "Inter_700Bold", fontSize: 16 },
  sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 18 },
  statsRow: { flexDirection: "row", gap: 10 },
  title: { flex: 1, fontFamily: "Inter_700Bold", fontSize: 16 },
});
