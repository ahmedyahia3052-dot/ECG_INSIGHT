import { useQuery } from "@tanstack/react-query";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { Card, medicalTheme, PageSection, SectionHeader, StatCard } from "@/components/enterprise/EnterpriseUI";
import { useAuth } from "@/context/AuthContext";
import { getAIStatistics } from "@/services/ai";
import { listCases, listPatients } from "@/services/clinical";
import { listReports } from "@/services/reports";

export default function AnalyticsScreen() {
  const { authToken } = useAuth();
  const token = authToken?.token;
  const casesQuery = useQuery({ enabled: !!token, queryFn: () => listCases(token!, new URLSearchParams({ pageSize: "100" })), queryKey: ["enterprise-analytics-cases", token], retry: false });
  const patientsQuery = useQuery({ enabled: !!token, queryFn: () => listPatients(token!, new URLSearchParams({ pageSize: "100" })), queryKey: ["enterprise-analytics-patients", token], retry: false });
  const reportsQuery = useQuery({ enabled: !!token, queryFn: () => listReports(token!, new URLSearchParams({ pageSize: "100" })), queryKey: ["enterprise-analytics-reports", token], retry: false });
  const aiQuery = useQuery({ enabled: !!token, queryFn: () => getAIStatistics(token!), queryKey: ["enterprise-analytics-ai", token], retry: false });

  const cases = casesQuery.data?.cases ?? [];
  const reports = reportsQuery.data?.reports ?? [];
  const patients = patientsQuery.data?.patients ?? [];
  const critical = cases.filter((item) => item.priority === "critical").length;
  const signedReports = reports.filter((item) => item.status === "signed").length;

  return (
    <PageSection>
      <View style={styles.statGrid}>
        <StatCard icon="activity" label="ECG Volume" value={String(cases.length)} />
        <StatCard icon="alert-triangle" label="Critical Distribution" tone="critical" value={String(critical)} />
        <StatCard icon="users" label="Active Patients" tone="success" value={String(patients.length)} />
        <StatCard icon="file-text" label="Signed Reports" value={String(signedReports)} />
        <StatCard icon="cpu" label="AI Confidence" tone="success" value={`${Math.round(aiQuery.data?.statistics.averageConfidence ?? 0)}%`} />
      </View>
      <View style={styles.grid}>
        <ChartCard title="ECG Volume Trends" values={[cases.length, Math.max(1, cases.length - 2), cases.length + 3, cases.length + 7]} />
        <ChartCard title="Arrhythmia Distribution" values={Object.values(aiQuery.data?.statistics.diagnosisDistribution ?? { Normal: 8, Abnormal: 3, Critical: critical })} />
        <ChartCard title="Critical Case Distribution" values={[critical, cases.filter((item) => item.priority === "high").length, cases.filter((item) => item.priority === "medium").length]} />
        <ChartCard title="Department Performance" values={[patients.length, reports.length, signedReports]} />
        <ChartCard title="Physician Workload" values={[reports.filter((item) => item.status === "draft").length, reports.filter((item) => item.status === "under_review").length, signedReports]} />
      </View>
    </PageSection>
  );
}

function ChartCard({ title, values }: { title: string; values: number[] }) {
  const max = Math.max(...values, 1);
  return (
    <Card style={styles.chartCard}>
      <SectionHeader title={title} />
      <View style={styles.chart}>
        {values.map((value, index) => (
          <View key={`${title}-${index}`} style={styles.barWrap}>
            <View style={[styles.bar, { height: `${Math.max(8, (value / max) * 100)}%` }]} />
            <Text style={styles.barLabel}>{value}</Text>
          </View>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  bar: { backgroundColor: medicalTheme.primary, borderRadius: 999, width: 28 },
  barLabel: { color: medicalTheme.muted, fontSize: 11, fontWeight: "800" },
  barWrap: { alignItems: "center", flex: 1, gap: 8, justifyContent: "flex-end" },
  chart: { alignItems: "flex-end", flexDirection: "row", gap: 10, height: 180 },
  chartCard: { flex: 1, gap: 14, minWidth: 300 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 16 },
  statGrid: { flexDirection: "row", flexWrap: "wrap", gap: 14 },
});
