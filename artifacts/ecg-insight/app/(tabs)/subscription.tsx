import { useQuery } from "@tanstack/react-query";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { getMySubscription, listSubscriptionPlans } from "@/services/subscriptions";
import { BoltBadge, BoltCard, BoltEmpty, BoltHero, BoltScreen, BoltStat } from "@/components/bolt/BoltUI";

export default function SubscriptionScreen() {
  const colors = useColors();
  const { authToken } = useAuth();
  const token = authToken?.token;
  const mineQuery = useQuery({
    enabled: !!token,
    queryFn: async () => getMySubscription(token!),
    queryKey: ["bolt-subscription-me", token],
    retry: false,
  });
  const plansQuery = useQuery({
    enabled: !!token,
    queryFn: async () => listSubscriptionPlans(token!),
    queryKey: ["bolt-public-subscription-plans", token],
    retry: false,
  });

  const mine = mineQuery.data;
  const plans = plansQuery.data?.plans.filter((plan) => String(plan.code) !== "lifetime") ?? [];

  return (
    <BoltScreen>
      <BoltHero
        eyebrow="Commercial subscription platform"
        subtitle="Public plans, user quota, and lifetime access state are loaded from existing subscription APIs. Lifetime remains hidden from public plans."
        title="Subscription"
      />

      {mineQuery.isError ? (
        <BoltEmpty title="Subscription unavailable" message="Unable to load your live subscription status." />
      ) : (
        <>
          <View style={styles.statsRow}>
            <BoltStat icon="activity" label="Used" value={mine?.quota.used ?? "..."} />
            <BoltStat icon="zap" label="Remaining" value={mine?.quota.remaining ?? "Unlimited"} />
          </View>
          <BoltCard highlight style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={[styles.title, { color: colors.text }]}>
                {mine?.lifetimeAccess.granted ? "Special Lifetime Access" : mine?.plan.name ?? "Current Plan"}
              </Text>
              <BoltBadge label={mine?.quota.canAnalyze ? "Can analyze" : "Quota blocked"} tone={mine?.quota.canAnalyze ? "success" : "danger"} />
            </View>
            <Text style={[styles.meta, { color: colors.textSecondary }]}>
              {mine?.lifetimeAccess.granted
                ? "Unlimited analyses with no expiration."
                : `Next reset: ${mine?.quota.nextResetAt?.slice(0, 10) ?? "pending"}`}
            </Text>
          </BoltCard>
        </>
      )}

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Available Public Plans</Text>
      {plansQuery.isError ? (
        <BoltEmpty title="Plans unavailable" message="Unable to load public plans from the subscription API." />
      ) : plans.length === 0 ? (
        <BoltEmpty title={plansQuery.isLoading ? "Loading plans..." : "No public plans"} message="No active public plans are currently available." />
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
              {plan.analysisQuota === null ? "Unlimited analyses" : `${plan.analysisQuota} analyses`} · {plan.multiUser ? "Multi-user" : "Single user"}
            </Text>
          </BoltCard>
        ))
      )}
    </BoltScreen>
  );
}

const styles = StyleSheet.create({
  card: { gap: 8 },
  cardHeader: { alignItems: "center", flexDirection: "row", gap: 10, justifyContent: "space-between" },
  meta: { fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 20 },
  price: { fontFamily: "Inter_700Bold", fontSize: 16 },
  sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 18 },
  statsRow: { flexDirection: "row", gap: 10 },
  title: { flex: 1, fontFamily: "Inter_700Bold", fontSize: 18 },
});
