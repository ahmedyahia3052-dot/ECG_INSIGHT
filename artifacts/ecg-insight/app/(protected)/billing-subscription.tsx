import { useQuery } from "@tanstack/react-query";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { Badge, Card, medicalTheme, PageSection, SectionHeader, StatCard } from "@/components/enterprise/EnterpriseUI";
import { useAuth } from "@/context/AuthContext";
import { getMySubscription, listSubscriptionPlans } from "@/services/subscriptions";

export default function BillingSubscriptionScreen() {
  const { authToken } = useAuth();
  const token = authToken?.token;
  const subscriptionQuery = useQuery({ enabled: !!token, queryFn: () => getMySubscription(token!), queryKey: ["enterprise-my-subscription", token], retry: false });
  const plansQuery = useQuery({ enabled: !!token, queryFn: () => listSubscriptionPlans(token!), queryKey: ["enterprise-subscription-plans", token], retry: false });
  const subscription = subscriptionQuery.data;

  return (
    <PageSection>
      <View style={styles.statGrid}>
        <StatCard icon="credit-card" label="Current Plan" value={subscription?.plan.name ?? "Loading"} />
        <StatCard icon="activity" label="Quota Used" value={String(subscription?.quota.used ?? 0)} />
        <StatCard icon="zap" label="Remaining" tone="success" value={subscription?.quota.remaining === null ? "Unlimited" : String(subscription?.quota.remaining ?? 0)} />
      </View>
      <Card style={styles.panel}>
        <SectionHeader title="Subscription Status" subtitle="Billing, quota, lifetime access, and available plans." />
        <View style={styles.statusRow}>
          <Badge label={subscription?.lifetimeAccess.granted ? "Lifetime Premium" : "Standard Billing"} tone={subscription?.lifetimeAccess.granted ? "success" : "primary"} />
          <Text style={styles.meta}>Next quota reset: {subscription?.quota.nextResetAt ?? "Not available"}</Text>
        </View>
        {(plansQuery.data?.plans ?? []).map((plan) => (
          <View key={plan.id} style={styles.planRow}>
            <View style={styles.main}>
              <Text style={styles.title}>{plan.name}</Text>
              <Text style={styles.meta}>{plan.description ?? "Enterprise ECG Insight plan"} • {plan.billingCycle}</Text>
            </View>
            <Text style={styles.price}>{plan.priceCents === 0 ? "Free" : `${plan.currency} ${(plan.priceCents / 100).toFixed(0)}`}</Text>
          </View>
        ))}
      </Card>
    </PageSection>
  );
}

const styles = StyleSheet.create({
  main: { flex: 1, minWidth: 220 },
  meta: { color: medicalTheme.muted, fontSize: 12, lineHeight: 18 },
  panel: { gap: 12 },
  planRow: { alignItems: "center", borderBottomColor: medicalTheme.border, borderBottomWidth: 1, flexDirection: "row", flexWrap: "wrap", gap: 12, paddingVertical: 12 },
  price: { color: medicalTheme.primary, fontSize: 17, fontWeight: "900" },
  statGrid: { flexDirection: "row", flexWrap: "wrap", gap: 14 },
  statusRow: { gap: 8 },
  title: { color: medicalTheme.text, fontSize: 15, fontWeight: "900" },
});
