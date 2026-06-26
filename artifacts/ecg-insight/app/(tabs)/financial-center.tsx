import { Feather } from "@expo/vector-icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { getFinancialAdminCenter, getFinancialDashboard, reviewRefund } from "@/services/subscriptions";

export default function FinancialCenterScreen() {
  const colors = useColors();
  const { authToken } = useAuth();
  const token = authToken?.token;
  const dashboardQuery = useQuery({ enabled: !!token, queryFn: async () => getFinancialDashboard(token!), queryKey: ["financial-dashboard", token], retry: false });
  const adminQuery = useQuery({ enabled: !!token, queryFn: async () => getFinancialAdminCenter(token!), queryKey: ["financial-admin-center", token], retry: false });
  const refundMutation = useMutation({
    mutationFn: async (refundId: string) => reviewRefund(token!, refundId, { decision: "approve", reason: "Approved from financial center." }),
    onSuccess: () => adminQuery.refetch(),
  });
  const dashboard = dashboardQuery.data?.dashboard;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View>
          <Text style={[styles.eyebrow, { color: colors.primary }]}>Enterprise finance</Text>
          <Text style={[styles.title, { color: colors.text }]}>Financial Center</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Revenue, MRR, active subscriptions, churn, conversion, transactions, refunds, invoices, manual approval, and audit trail.</Text>
        </View>
        <View style={styles.grid}>
          <Metric icon="dollar-sign" label="Revenue" value={money(dashboard?.revenueCents ?? 0)} />
          <Metric icon="repeat" label="MRR" value={money(dashboard?.monthlyRecurringRevenueCents ?? 0)} />
          <Metric icon="users" label="Active subscriptions" value={String(dashboard?.activeSubscriptions ?? 0)} />
          <Metric icon="trending-down" label="Churn" value={`${dashboard?.churnRate ?? 0}%`} />
          <Metric icon="trending-up" label="Conversion" value={`${dashboard?.conversionRate ?? 0}%`} />
        </View>
        <Panel title="Transactions">
          {(adminQuery.data?.transactions ?? []).slice(0, 8).map((transaction) => (
            <Row key={transaction.id} title={`${transaction.provider} · ${transaction.status}`} value={money(transaction.amount)} subtitle={transaction.referenceNumber ?? transaction.paymentMethod} />
          ))}
        </Panel>
        <Panel title="Manual Payment Approval">
          {(adminQuery.data?.manualPayments ?? []).slice(0, 8).map((payment) => (
            <Row key={payment.id} title={`${payment.provider} · ${payment.status}`} value={money(payment.amountCents)} subtitle={payment.createdAt.slice(0, 10)} />
          ))}
        </Panel>
        <Panel title="Refund Management">
          {(adminQuery.data?.refunds ?? []).slice(0, 8).map((refund) => (
            <Row
              key={refund.id}
              action={refund.status === "REQUESTED" ? () => refundMutation.mutate(refund.id) : undefined}
              actionLabel={refundMutation.isPending ? "Approving..." : "Approve"}
              title={`${refund.status} · ${refund.reason ?? "No reason"}`}
              value={money(refund.amountCents)}
              subtitle={refund.createdAt.slice(0, 10)}
            />
          ))}
        </Panel>
        <Panel title="Invoices">
          {(adminQuery.data?.invoices ?? []).slice(0, 8).map((invoice) => (
            <Row key={invoice.id} title={`${invoice.invoiceNumber} · ${invoice.status}`} value={money(invoice.amountCents)} subtitle={`Issued ${invoice.issuedAt.slice(0, 10)}`} />
          ))}
        </Panel>
        <Panel title="Financial Audit Log">
          {(adminQuery.data?.auditLogs ?? []).slice(0, 10).map((entry) => (
            <Row key={entry.id} title={entry.action.replace(/_/g, " ")} value={entry.entityType} subtitle={entry.createdAt.slice(0, 19).replace("T", " ")} />
          ))}
        </Panel>
      </ScrollView>
    </SafeAreaView>
  );
}

function money(cents: number) {
  return `$${(cents / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function Metric({ icon, label, value }: { icon: keyof typeof Feather.glyphMap; label: string; value: string }) {
  const colors = useColors();
  return (
    <View style={[styles.metric, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Feather name={icon} color={colors.primary} size={20} />
      <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.metricValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

function Panel({ children, title }: { children: React.ReactNode; title: string }) {
  const colors = useColors();
  return (
    <View style={[styles.panel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.panelTitle, { color: colors.text }]}>{title}</Text>
      {children}
    </View>
  );
}

function Row({ action, actionLabel, subtitle, title, value }: { action?: () => void; actionLabel?: string; subtitle: string; title: string; value: string }) {
  const colors = useColors();
  return (
    <View style={[styles.row, { borderColor: colors.border }]}>
      <View style={styles.rowMain}>
        <Text style={[styles.rowTitle, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.rowSubtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
      </View>
      <Text style={[styles.rowValue, { color: colors.primary }]}>{value}</Text>
      {action ? <Text onPress={action} style={[styles.rowAction, { color: colors.success }]}>{actionLabel}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { gap: 14, padding: 20, paddingBottom: 120 },
  eyebrow: { fontSize: 12, fontWeight: "900", letterSpacing: 0.8, textTransform: "uppercase" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  metric: { borderRadius: 18, borderWidth: 1, flex: 1, gap: 6, minWidth: 150, padding: 14 },
  metricLabel: { fontSize: 11, fontWeight: "800", textTransform: "uppercase" },
  metricValue: { fontSize: 22, fontWeight: "900" },
  panel: { borderRadius: 20, borderWidth: 1, gap: 10, padding: 16 },
  panelTitle: { fontSize: 18, fontWeight: "900" },
  row: { alignItems: "center", borderRadius: 14, borderWidth: 1, flexDirection: "row", flexWrap: "wrap", gap: 10, padding: 10 },
  rowAction: { fontSize: 12, fontWeight: "900" },
  rowMain: { flex: 1, minWidth: 180 },
  rowSubtitle: { fontSize: 12, lineHeight: 18 },
  rowTitle: { fontSize: 13, fontWeight: "900" },
  rowValue: { fontSize: 14, fontWeight: "900" },
  subtitle: { fontSize: 14, lineHeight: 20, marginTop: 6 },
  title: { fontSize: 30, fontWeight: "900" },
});
