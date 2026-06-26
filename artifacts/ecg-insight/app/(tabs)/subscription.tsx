import { useMutation, useQuery } from "@tanstack/react-query";
import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import {
  addPaymentMethod,
  cancelMySubscription,
  changePlan,
  createCheckoutSession,
  getMySubscription,
  listPaymentMethods,
  listSubscriptionPlans,
  type PaymentGateway,
  type SubscriptionPlanCode,
} from "@/services/subscriptions";
import { BoltBadge, BoltButton, BoltCard, BoltEmpty, BoltHero, BoltScreen, BoltStat } from "@/components/bolt/BoltUI";

export default function SubscriptionScreen() {
  const colors = useColors();
  const { authToken } = useAuth();
  const token = authToken?.token;
  const [gateway, setGateway] = useState<PaymentGateway>("PAYMOB");
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
  const paymentMethodsQuery = useQuery({
    enabled: !!token,
    queryFn: async () => listPaymentMethods(token!),
    queryKey: ["bolt-payment-methods", token],
    retry: false,
  });
  const checkoutMutation = useMutation({
    mutationFn: async (plan: SubscriptionPlanCode) =>
      createCheckoutSession(token!, { idempotencyKey: `checkout-${plan}-${Date.now()}`, plan, provider: gateway }),
  });
  const planMutation = useMutation({
    mutationFn: async ({ direction, plan }: { direction: "downgrade" | "upgrade"; plan: SubscriptionPlanCode }) => changePlan(token!, plan, direction),
    onSuccess: () => mineQuery.refetch(),
  });
  const cancelMutation = useMutation({
    mutationFn: async () => cancelMySubscription(token!, false),
    onSuccess: () => mineQuery.refetch(),
  });
  const methodMutation = useMutation({
    mutationFn: async () =>
      addPaymentMethod(token!, {
        isDefault: true,
        label: gateway === "BANK_TRANSFER" ? "Manual bank transfer" : `${gateway} primary method`,
        provider: gateway,
        type: gateway === "BANK_TRANSFER" || gateway === "INSTAPAY" ? "manual" : "card",
      }),
    onSuccess: () => paymentMethodsQuery.refetch(),
  });

  const mine = mineQuery.data;
  const plans = plansQuery.data?.plans.filter((plan) => String(plan.code) !== "lifetime") ?? [];

  return (
    <BoltScreen>
      <BoltHero
        eyebrow="Commercial subscription platform"
        subtitle="Pricing, plan limits, billing status, usage quota, and lifetime access are loaded from live subscription APIs."
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
                : `Next reset: ${mine?.quota.nextResetAt?.slice(0, 10) ?? "pending"} · Users ${mine?.quota.limits?.maxUsers ?? "Unlimited"} · Storage ${mine?.quota.limits?.storageQuotaMb ?? "Unlimited"} MB`}
            </Text>
          </BoltCard>
        </>
      )}

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Available Public Plans</Text>
      <BoltCard style={styles.card}>
        <Text style={[styles.title, { color: colors.text }]}>Checkout Gateway</Text>
        <View style={styles.gatewayRow}>
          {(["PAYMOB", "STRIPE", "BANK_TRANSFER", "INSTAPAY"] as PaymentGateway[]).map((item) => (
            <View key={item} style={styles.gatewayButton}>
              <BoltButton label={item.replace("_", " ")} onPress={() => setGateway(item)} variant={gateway === item ? "primary" : "outline"} />
            </View>
          ))}
        </View>
        <Text style={[styles.meta, { color: colors.textSecondary }]}>
          Payment settings: {(paymentMethodsQuery.data?.methods ?? []).length} saved method(s). Use Paymob/Stripe for card checkout, or bank transfer/InstaPay for manual approval.
        </Text>
        <BoltButton icon="credit-card" label={methodMutation.isPending ? "Saving..." : "Save selected payment method"} loading={methodMutation.isPending} onPress={() => methodMutation.mutate()} variant="outline" />
      </BoltCard>
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
              {plan.analysisQuota === null ? "Unlimited analyses" : `${plan.analysisQuota} analyses/month`} · {plan.maxUsers ?? "Unlimited"} users · {plan.maxOrganizations ?? "Unlimited"} orgs · {plan.storageQuotaMb ?? "Unlimited"} MB
            </Text>
            <Text style={[styles.meta, { color: colors.textSecondary }]}>
              Trial {plan.trialDays} days · Grace {plan.gracePeriodDays} days · AI {Object.entries(plan.aiFeatureAccess ?? {}).filter(([, enabled]) => Boolean(enabled)).map(([feature]) => feature).join(", ") || "basic"}
            </Text>
            <View style={styles.gatewayRow}>
              <View style={styles.gatewayButton}>
                <BoltButton icon="credit-card" label={checkoutMutation.isPending ? "Creating checkout..." : "Checkout"} loading={checkoutMutation.isPending} onPress={() => checkoutMutation.mutate(plan.code)} />
              </View>
              <View style={styles.gatewayButton}>
                <BoltButton label="Upgrade" onPress={() => planMutation.mutate({ direction: "upgrade", plan: plan.code })} variant="outline" />
              </View>
              <View style={styles.gatewayButton}>
                <BoltButton label="Downgrade" onPress={() => planMutation.mutate({ direction: "downgrade", plan: plan.code })} variant="outline" />
              </View>
            </View>
          </BoltCard>
        ))
      )}
      <BoltCard style={styles.card}>
        <Text style={[styles.title, { color: colors.text }]}>Subscription Controls</Text>
        <Text style={[styles.meta, { color: colors.textSecondary }]}>Cancel at period end, retry failed invoices from billing history, and manage payment recovery through the financial center.</Text>
        <BoltButton icon="x-circle" label={cancelMutation.isPending ? "Scheduling..." : "Cancel at period end"} loading={cancelMutation.isPending} onPress={() => cancelMutation.mutate()} variant="outline" />
      </BoltCard>
    </BoltScreen>
  );
}

const styles = StyleSheet.create({
  card: { gap: 8 },
  cardHeader: { alignItems: "center", flexDirection: "row", gap: 10, justifyContent: "space-between" },
  gatewayButton: { minWidth: 132 },
  gatewayRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  meta: { fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 20 },
  price: { fontFamily: "Inter_700Bold", fontSize: 16 },
  sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 18 },
  statsRow: { flexDirection: "row", gap: 10 },
  title: { flex: 1, fontFamily: "Inter_700Bold", fontSize: 18 },
});
