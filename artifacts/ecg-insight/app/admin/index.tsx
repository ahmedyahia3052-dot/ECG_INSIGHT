import { useQuery } from "@tanstack/react-query";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { getSuperAdminDashboard } from "@/services/superAdmin";
import { getSubscriptionAnalytics } from "@/services/subscriptions";
import { BoltBadge, BoltEmpty, BoltHero, BoltNavCard, BoltScreen, BoltStat } from "@/components/bolt/BoltUI";

export default function AdminDashboard() {
  const colors = useColors();
  const { authToken, isImpersonating, user } = useAuth();
  const token = authToken?.token;

  const dashboardQuery = useQuery({
    enabled: !!token && user?.role === "super_admin",
    queryFn: async () => getSuperAdminDashboard(token!),
    queryKey: ["bolt-super-admin-dashboard", token],
    retry: false,
  });
  const subscriptionQuery = useQuery({
    enabled: !!token && user?.role === "super_admin",
    queryFn: async () => getSubscriptionAnalytics(token!),
    queryKey: ["bolt-admin-subscription-analytics", token],
    retry: false,
  });

  if (user?.role !== "super_admin") {
    return (
      <BoltScreen>
        <BoltEmpty title="Super Admin Access Required" message="Owner and hidden admin features remain protected by existing role guards." />
      </BoltScreen>
    );
  }

  const dashboard = dashboardQuery.data?.dashboard;
  const analytics = subscriptionQuery.data?.analytics;

  return (
    <BoltScreen>
      <BoltHero
        eyebrow="Protected owner console"
        subtitle="Live users, revenue, subscriptions, licenses, and audit navigation. Existing owner identity, hidden admin features, and security policies are preserved."
        title="Admin Dashboard"
      />
      {isImpersonating ? (
        <View style={styles.impersonation}>
          <Text style={[styles.impersonationText, { color: "#92400E" }]}>Impersonation mode active</Text>
          <BoltBadge label="Exit from Profile" tone="warning" />
        </View>
      ) : null}

      <View style={styles.statsRow}>
        <BoltStat icon="users" label="Total Users" value={dashboard?.totalUsers ?? analytics?.totalUsers ?? "..."} />
        <BoltStat icon="user-check" label="Active Users" value={dashboard?.activeUsers ?? analytics?.activeUsers ?? "..."} />
      </View>
      <View style={styles.statsRow}>
        <BoltStat icon="activity" label="Daily ECG Analyses" value={dashboard?.dailyEcgAnalyses ?? analytics?.dailyAnalyses ?? "..."} />
        <BoltStat icon="dollar-sign" label="Monthly Revenue" value={`$${((dashboard?.revenueThisMonth ?? analytics?.monthlyRevenueCents ?? 0) / 100).toLocaleString()}`} />
      </View>
      <View style={styles.statsRow}>
        <BoltStat icon="credit-card" label="Enterprise Users" value={dashboard?.enterpriseUsers ?? "..."} />
        <BoltStat icon="award" label="Lifetime Users" value={dashboard?.lifetimeUsers ?? "..."} />
      </View>

      {(dashboardQuery.isError || subscriptionQuery.isError) ? (
        <Text style={[styles.error, { color: colors.destructive }]}>
          Some live admin metrics could not be loaded. Protected admin routes remain available.
        </Text>
      ) : null}

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Management</Text>
      <BoltNavCard description="View, activate, deactivate, change plans, grant lifetime, and impersonate users" icon="users" route="/admin/users" title="User Management" />
      <BoltNavCard description="Public subscription plans, analytics, payments, and license controls" icon="credit-card" route="/admin/subscriptions" title="Subscriptions" />
      <BoltNavCard description="Create, edit, activate, and deactivate commercial SaaS plans" icon="box" route="/admin/plans" title="Plan Management" />
      <BoltNavCard description="Revenue trend, payment status, growth, and ECG usage analytics" icon="trending-up" route="/admin/revenue" title="Revenue Dashboard" />
      <BoltNavCard description="Private lifetime and gifted license management" icon="award" route="/admin/licenses" title="License Dashboard" />
      <BoltNavCard description="Owner and super-admin action audit trail" icon="file-text" route="/admin/audit" title="Audit Log Viewer" />
      {isImpersonating ? (
        <BoltNavCard description="Stop impersonation from the user profile controls" icon="log-out" route="/(tabs)/profile" title="Exit Impersonation" />
      ) : null}
      {dashboard?.expiringSubscriptions.length ? (
        <>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Expiring Subscriptions</Text>
          {dashboard.expiringSubscriptions.slice(0, 5).map((item) => (
            <Text key={item.userId} style={[styles.meta, { color: colors.textSecondary }]}>
              {item.userEmail} · {item.plan} · {item.expirationDate?.slice(0, 10)}
            </Text>
          ))}
        </>
      ) : null}
    </BoltScreen>
  );
}

const styles = StyleSheet.create({
  error: { fontFamily: "Inter_700Bold", fontSize: 13 },
  impersonation: {
    alignItems: "center",
    backgroundColor: "#FEF3C7",
    borderColor: "#FDE68A",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    padding: 14,
  },
  impersonationText: { flex: 1, fontFamily: "Inter_700Bold", fontSize: 13 },
  meta: { fontFamily: "Inter_500Medium", fontSize: 13, lineHeight: 20 },
  sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 18 },
  statsRow: { flexDirection: "row", gap: 10 },
});
