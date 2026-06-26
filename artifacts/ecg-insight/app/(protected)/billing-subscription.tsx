import { useQuery } from "@tanstack/react-query";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { Badge, Card, medicalTheme, PageSection, SectionHeader, StatCard } from "@/components/enterprise/EnterpriseUI";
import { useAuth } from "@/context/AuthContext";
import { getBillingHistory, getMySubscription, getUsageDashboard, listSubscriptionPlans } from "@/services/subscriptions";

export default function BillingSubscriptionScreen() {
  const { authToken } = useAuth();
  const token = authToken?.token;
  const subscriptionQuery = useQuery({ enabled: !!token, queryFn: () => getMySubscription(token!), queryKey: ["enterprise-my-subscription", token], retry: false });
  const plansQuery = useQuery({ enabled: !!token, queryFn: () => listSubscriptionPlans(token!), queryKey: ["enterprise-subscription-plans", token], retry: false });
  const billingQuery = useQuery({ enabled: !!token, queryFn: () => getBillingHistory(token!), queryKey: ["enterprise-billing-history", token], retry: false });
  const usageQuery = useQuery({ enabled: !!token, queryFn: () => getUsageDashboard(token!), queryKey: ["enterprise-usage-dashboard", token], retry: false });
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
      <Card style={styles.panel}>
        <SectionHeader title="Usage Dashboard" subtitle="Monthly ECG quota, plan limits, storage allowance, organization/user caps, and AI feature access." />
        <View style={styles.statGrid}>
          <StatCard icon="bar-chart-2" label="ECG Used" value={String(usageQuery.data?.quota.used ?? subscription?.quota.used ?? 0)} />
          <StatCard icon="users" label="Users" value={String(subscription?.quota.limits?.maxUsers ?? "Unlimited")} />
          <StatCard icon="briefcase" label="Organizations" value={String(subscription?.quota.limits?.maxOrganizations ?? "Unlimited")} />
          <StatCard icon="hard-drive" label="Storage" value={subscription?.quota.limits?.storageQuotaMb === null ? "Unlimited" : `${subscription?.quota.limits?.storageQuotaMb ?? 0} MB`} />
        </View>
        {(usageQuery.data?.usageTracking ?? subscription?.usageTracking ?? []).slice(0, 4).map((usage) => (
          <View key={usage.id} style={styles.planRow}>
            <View style={styles.main}>
              <Text style={styles.title}>{usage.metric.replace(/_/g, " ")}</Text>
              <Text style={styles.meta}>{usage.windowStart.slice(0, 10)} to {usage.windowEnd.slice(0, 10)}</Text>
            </View>
            <Badge label={`${usage.quantity}/${usage.quota ?? "Unlimited"}`} tone={usage.exceeded ? "critical" : "primary"} />
          </View>
        ))}
      </Card>
      <Card style={styles.panel}>
        <SectionHeader title="Billing History" subtitle="Invoices, payment state, and recent billing events." />
        {(billingQuery.data?.invoices ?? subscription?.invoices ?? []).slice(0, 5).map((invoice) => (
          <View key={invoice.id} style={styles.planRow}>
            <View style={styles.main}>
              <Text style={styles.title}>{invoice.invoiceNumber}</Text>
              <Text style={styles.meta}>Issued {invoice.issuedAt.slice(0, 10)} • Due {invoice.dueAt?.slice(0, 10) ?? "N/A"}</Text>
            </View>
            <Text style={styles.price}>{invoice.currency} {(invoice.amountCents / 100).toFixed(0)} • {invoice.status}</Text>
          </View>
        ))}
        {(billingQuery.data?.billingEvents ?? subscription?.billingHistory ?? []).slice(0, 5).map((event) => (
          <Text key={event.id} style={styles.meta}>{event.createdAt.slice(0, 10)} • {event.type.replace(/_/g, " ")} • {event.message}</Text>
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
