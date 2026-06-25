import { useQuery } from "@tanstack/react-query";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { Card, EmptyState, medicalTheme, PageSection, SectionHeader, StatCard } from "@/components/enterprise/EnterpriseUI";
import { useAuth } from "@/context/AuthContext";
import { listAlerts, listTasks } from "@/services/collaboration";
import { listCases, listPatients } from "@/services/clinical";
import { getSubscriptionAnalytics } from "@/services/subscriptions";

export default function AdminDashboardScreen() {
  const { authToken, canAccess } = useAuth();
  const token = authToken?.token;
  const allowed = canAccess(["admin", "super_admin"]);
  const patientsQuery = useQuery({ enabled: !!token && allowed, queryFn: () => listPatients(token!, new URLSearchParams({ pageSize: "1" })), queryKey: ["admin-patient-count", token], retry: false });
  const casesQuery = useQuery({ enabled: !!token && allowed, queryFn: () => listCases(token!, new URLSearchParams({ pageSize: "1" })), queryKey: ["admin-case-count", token], retry: false });
  const tasksQuery = useQuery({ enabled: !!token && allowed, queryFn: () => listTasks(token!), queryKey: ["admin-task-count", token], retry: false });
  const alertsQuery = useQuery({ enabled: !!token && allowed, queryFn: () => listAlerts(token!), queryKey: ["admin-alert-count", token], retry: false });
  const subscriptionQuery = useQuery({ enabled: !!token && allowed, queryFn: () => getSubscriptionAnalytics(token!), queryKey: ["admin-subscription-analytics", token], retry: false });

  if (!allowed) return <EmptyState title="Admin access required" message="Only administrators can open this dashboard." />;

  return (
    <PageSection>
      <View style={styles.statGrid}>
        <StatCard icon="users" label="Patients" value={String(patientsQuery.data?.total ?? 0)} />
        <StatCard icon="activity" label="ECG Cases" value={String(casesQuery.data?.total ?? 0)} />
        <StatCard icon="check-square" label="Tasks" value={String(tasksQuery.data?.tasks.length ?? 0)} />
        <StatCard icon="bell" label="Alerts" tone="warning" value={String(alertsQuery.data?.alerts.length ?? 0)} />
        <StatCard icon="dollar-sign" label="Monthly Revenue" value={`${((subscriptionQuery.data?.analytics.monthlyRevenueCents ?? 0) / 100).toFixed(0)}`} />
      </View>
      <Card style={styles.panel}>
        <SectionHeader title="Platform Health" subtitle="Administration dashboard for users, subscriptions, alerts, and workflow health." />
        <Info label="Active Users" value={String(subscriptionQuery.data?.analytics.activeUsers ?? 0)} />
        <Info label="Total Users" value={String(subscriptionQuery.data?.analytics.totalUsers ?? 0)} />
        <Info label="Daily Analyses" value={String(subscriptionQuery.data?.analytics.dailyAnalyses ?? 0)} />
        <Info label="Expiring Subscriptions" value={String(subscriptionQuery.data?.analytics.expiringSubscriptions.length ?? 0)} />
      </Card>
    </PageSection>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.info}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  info: { borderBottomColor: medicalTheme.border, borderBottomWidth: 1, gap: 4, paddingVertical: 10 },
  infoLabel: { color: medicalTheme.muted, fontSize: 12, fontWeight: "800" },
  infoValue: { color: medicalTheme.text, fontSize: 15, fontWeight: "900" },
  panel: { gap: 8 },
  statGrid: { flexDirection: "row", flexWrap: "wrap", gap: 14 },
});
