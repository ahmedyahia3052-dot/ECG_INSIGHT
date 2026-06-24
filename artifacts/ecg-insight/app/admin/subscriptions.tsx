import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import {
  getSubscriptionAnalytics,
  listLicenses,
  listSubscriptionPlans,
  type LicenseRecord,
  type SubscriptionAnalytics,
  type SubscriptionPlan,
} from "@/services/subscriptions";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function PlanCard({ plan }: { plan: SubscriptionPlan }) {
  const colors = useColors();
  const quota = plan.analysisQuota === null ? "Unlimited" : `${plan.analysisQuota} analyses`;

  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: colors.radius.lg,
        borderColor: colors.border,
        borderWidth: 1,
        gap: 8,
        marginBottom: 10,
        padding: 16,
      }}
    >
      <View style={{ alignItems: "center", flexDirection: "row", justifyContent: "space-between" }}>
        <View>
          <Text style={{ color: colors.text, fontSize: 17, fontWeight: "800" }}>{plan.name}</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{plan.code.toUpperCase()} · {plan.billingCycle}</Text>
        </View>
        <View style={{ backgroundColor: colors.primaryLight, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 4 }}>
          <Text style={{ color: colors.primary, fontSize: 12, fontWeight: "800" }}>{plan.active ? "ACTIVE" : "OFF"}</Text>
        </View>
      </View>
      <Text style={{ color: colors.textSecondary, fontSize: 13 }}>{plan.description}</Text>
      <Text style={{ color: colors.text, fontSize: 13, fontWeight: "700" }}>
        {quota} · ${(plan.priceCents / 100).toLocaleString()} {plan.currency}
      </Text>
      {(plan.multiUser || plan.teamManagement) && (
        <Text style={{ color: colors.primary, fontSize: 12, fontWeight: "700" }}>
          {plan.multiUser ? "Multi-user" : ""}{plan.multiUser && plan.teamManagement ? " · " : ""}{plan.teamManagement ? "Team management" : ""}
        </Text>
      )}
    </View>
  );
}

export default function SubscriptionsScreen() {
  const colors = useColors();
  const { authToken } = useAuth();
  const [analytics, setAnalytics] = useState<SubscriptionAnalytics | null>(null);
  const [licenses, setLicenses] = useState<LicenseRecord[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authToken?.token) return;
    (async () => {
      try {
        const [plansPayload, analyticsPayload, licensesPayload] = await Promise.all([
          listSubscriptionPlans(authToken.token),
          getSubscriptionAnalytics(authToken.token),
          listLicenses(authToken.token),
        ]);
        setPlans(plansPayload.plans.filter((plan) => String(plan.code) !== "lifetime"));
        setAnalytics(analyticsPayload.analytics);
        setLicenses(licensesPayload.licenses);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Unable to load subscription data.");
      }
    })();
  }, [authToken?.token]);

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: 16 },
    summaryCard: {
      backgroundColor: colors.primary,
      borderRadius: colors.radius.lg,
      padding: 20,
      marginBottom: 20,
      flexDirection: "row",
      alignItems: "center",
      gap: 16,
    },
    summaryIcon: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: "rgba(255,255,255,0.2)",
      alignItems: "center",
      justifyContent: "center",
    },
    mrrLabel: { fontSize: 13, color: "rgba(255,255,255,0.8)", marginBottom: 4 },
    mrrValue: { fontSize: 30, fontWeight: "900", color: "#fff" },
    mrrSub: { fontSize: 12, color: "rgba(255,255,255,0.7)" },
    sectionTitle: {
      fontSize: 13,
      fontWeight: "700",
      color: colors.textSecondary,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginBottom: 12,
    },
    metricGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 20 },
    metricCard: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: colors.radius.lg, borderWidth: 1, flex: 1, minWidth: "45%", padding: 14 },
    metricLabel: { color: colors.textSecondary, fontSize: 12, fontWeight: "600" },
    metricValue: { color: colors.text, fontSize: 22, fontWeight: "900", marginTop: 4 },
  });

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.summaryCard}>
          <View style={styles.summaryIcon}>
            <Text style={{ fontSize: 26 }}>💰</Text>
          </View>
          <View>
            <Text style={styles.mrrLabel}>Monthly Recurring Revenue</Text>
            <Text style={styles.mrrValue}>${((analytics?.monthlyRevenueCents ?? 0) / 100).toLocaleString()}</Text>
            <Text style={styles.mrrSub}>
              {analytics?.activeUsers ?? 0} active users · {analytics?.dailyAnalyses ?? 0} analyses today
            </Text>
          </View>
        </View>

        {error && <Text style={{ color: "#DC2626", marginBottom: 12 }}>{error}</Text>}

        <View style={styles.metricGrid}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Total Users</Text>
            <Text style={styles.metricValue}>{analytics?.totalUsers ?? "—"}</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Active Users</Text>
            <Text style={styles.metricValue}>{analytics?.activeUsers ?? "—"}</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Payments</Text>
            <Text style={styles.metricValue}>{analytics?.paymentStatusSummary.reduce((sum, item) => sum + item.count, 0) ?? "—"}</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Lifetime Licenses</Text>
            <Text style={styles.metricValue}>{licenses.length}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Subscription Plans</Text>
        {plans.map((plan) => <PlanCard key={plan.id} plan={plan} />)}

        <Text style={styles.sectionTitle}>Subscription Distribution</Text>
        {(analytics?.subscriptionDistribution ?? []).map((item) => (
          <Text key={String(item.plan)} style={{ color: colors.textSecondary, marginBottom: 6 }}>
            {String(item.plan)}: {item.count}
          </Text>
        ))}

        <Text style={styles.sectionTitle}>Lifetime Licenses</Text>
        {licenses.slice(0, 6).map((license) => (
          <Text key={license.id} style={{ color: colors.textSecondary, marginBottom: 6 }}>
            {license.user.name} · {license.user.email} · {license.status}
          </Text>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
