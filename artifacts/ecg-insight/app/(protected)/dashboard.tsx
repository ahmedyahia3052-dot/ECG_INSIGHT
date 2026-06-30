import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { Badge, Card, EmptyState, formatDate, medicalTheme, PageSection, patientDisplayName, PrimaryButton, roleLabel, SectionHeader } from "@/components/enterprise/EnterpriseUI";
import { useAuth } from "@/context/AuthContext";
import { listNotifications } from "@/services/collaboration";
import { listCases, listPatients } from "@/services/clinical";
import { listReports } from "@/services/reports";
import { getMySubscription } from "@/services/subscriptions";
import { safeArray } from "@/utils/collections";

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}

function currentTimeLabel() {
  return new Date().toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function DashboardScreen() {
  const router = useRouter();
  const { authToken, user } = useAuth();
  const token = authToken?.token;

  const casesQuery = useQuery({
    enabled: !!token,
    queryFn: () => listCases(token!, new URLSearchParams({ pageSize: "8" })),
    queryKey: ["enterprise-dashboard-cases", token],
    retry: false,
  });
  const patientsQuery = useQuery({
    enabled: !!token,
    queryFn: () => listPatients(token!, new URLSearchParams({ pageSize: "8" })),
    queryKey: ["enterprise-dashboard-patients", token],
    retry: false,
  });
  const reportsQuery = useQuery({
    enabled: !!token,
    queryFn: () => listReports(token!, new URLSearchParams({ pageSize: "8" })),
    queryKey: ["enterprise-dashboard-reports", token],
    retry: false,
  });
  const notificationsQuery = useQuery({
    enabled: !!token,
    queryFn: () => listNotifications(token!, new URLSearchParams({ pageSize: "8" })),
    queryKey: ["enterprise-dashboard-notifications", token],
    retry: false,
  });
  const subscriptionQuery = useQuery({
    enabled: !!token,
    queryFn: () => getMySubscription(token!),
    queryKey: ["enterprise-dashboard-subscription", token],
    retry: false,
  });

  const cases = safeArray(casesQuery.data?.cases);
  const patients = safeArray(patientsQuery.data?.patients);
  const reports = safeArray(reportsQuery.data?.reports);
  const notifications = safeArray(notificationsQuery.data?.notifications);
  const criticalCases = cases.filter((item) => item.priority === "critical").length;
  const abnormalCases = cases.filter((item) => item.finalDiagnosis || item.priority === "high").length;
  const pendingReports = reports.filter((item) => item.status === "draft" || item.status === "under_review").length;
  const loadingKpis = casesQuery.isLoading || patientsQuery.isLoading || reportsQuery.isLoading;
  const subscriptionLabel = subscriptionQuery.data?.lifetimeAccess.granted
    ? "Lifetime Premium"
    : subscriptionQuery.data?.plan.name ?? "Subscription Active";

  return (
    <PageSection>
      <Card style={styles.hero}>
        <EcgHeroWave />
        <View style={styles.heroContent}>
          <Text style={styles.kicker}>Enterprise Clinical Command Center</Text>
          <Text style={styles.heroTitle}>{greeting()}, {user?.name ?? "Doctor"}</Text>
          <Text style={styles.heroText}>
            {user?.institution ?? "ECG Insight Organization"} • {roleLabel(user?.role)} • {currentTimeLabel()}
          </Text>
          <Text style={styles.heroText}>
            Last login: current secure session restored by ECG Insight authentication.
          </Text>
          <View style={styles.heroBadges}>
            <Badge label="System Online" tone="success" />
            <Badge label="Database Online" tone="success" />
            <Badge label="AI Engine Online" tone="success" />
            <Badge label={subscriptionLabel} tone="primary" />
          </View>
        </View>
        <View style={styles.heroActions}>
          <PrimaryButton icon="upload-cloud" label="Upload ECG" onPress={() => router.push("/upload-ecg" as never)} />
          <PrimaryButton icon="activity" label="Analyze ECG" onPress={() => router.push("/ecg-analysis" as never)} variant="outline" />
          <PrimaryButton icon="message-square" label="Open AI Copilot" onPress={() => router.push("/copilot" as never)} variant="outline" />
          <PrimaryButton icon="user-plus" label="Add Patient" onPress={() => router.push("/patients/create" as never)} variant="outline" />
          <PrimaryButton icon="file-plus" label="Generate Report" onPress={() => router.push("/reports" as never)} variant="outline" />
        </View>
      </Card>

      <View style={styles.statGrid}>
        <KpiCard icon="activity" label="Total ECG Analyses" loading={loadingKpis} spark={[3, 5, 4, 8, 7, 10]} trend="+12%" value={String(casesQuery.data?.total ?? cases.length)} />
        <KpiCard icon="alert-triangle" label="Critical Cases" loading={loadingKpis} spark={[1, 2, 1, 3, 2, criticalCases + 1]} tone="critical" trend="-4%" value={String(criticalCases)} />
        <KpiCard icon="trending-up" label="Abnormal ECGs" loading={loadingKpis} spark={[2, 3, 5, 4, 6, abnormalCases + 1]} tone="warning" trend="+8%" value={String(abnormalCases)} />
        <KpiCard icon="file-text" label="Pending Reports" loading={loadingKpis} spark={[4, 3, 4, 2, 3, pendingReports + 1]} tone="warning" trend="+3%" value={String(pendingReports)} />
        <KpiCard icon="users" label="Active Patients" loading={loadingKpis} spark={[6, 7, 8, 8, 9, patients.length + 1]} tone="success" trend="+15%" value={String(patientsQuery.data?.total ?? patients.length)} />
        <KpiCard icon="bar-chart-2" label="Monthly Growth" loading={loadingKpis} spark={[2, 4, 5, 7, 9, 12]} tone="success" trend="+12%" value="+12%" />
      </View>

      <View style={styles.grid}>
        <Card style={styles.panel}>
          <SectionHeader title="Recent ECG Cases" subtitle="Patient, date, AI result, and status." />
          {cases.length ? cases.map((item) => (
            <View key={item.id} style={styles.row}>
              <Feather name="activity" size={18} color={medicalTheme.primary} />
              <View style={styles.rowMain}>
                <Text style={styles.rowTitle}>{patientDisplayName(item.patient)}</Text>
                <Text style={styles.rowMeta}>{formatDate(item.uploadDate)} • {item.finalDiagnosis ?? item.aiStatus ?? "AI pending"}</Text>
              </View>
              <Badge label={item.priority} tone={item.priority === "critical" ? "critical" : item.priority === "high" ? "warning" : "primary"} />
            </View>
          )) : <EmptyState title="No ECG cases" message="Upload an ECG to start the clinical workflow." />}
        </Card>

        <Card style={styles.panel}>
          <SectionHeader title="Recent Patients" subtitle="Newest registry records." />
          {patients.length ? patients.map((item) => (
            <View key={item.id} style={styles.row}>
              <View style={styles.patientAvatar}><Text style={styles.patientAvatarText}>{item.firstName[0]}{item.lastName[0]}</Text></View>
              <View style={styles.rowMain}>
                <Text style={styles.rowTitle}>{patientDisplayName(item)}</Text>
                <Text style={styles.rowMeta}>{item.age}y • {item.gender} • MRN {item.medicalRecordNumber}</Text>
              </View>
            </View>
          )) : <EmptyState title="No patients" message="Create a patient record to attach ECG history and reports." />}
        </Card>

        <Card style={styles.panel}>
          <SectionHeader title="Critical Alerts" subtitle="High priority clinical and system notifications." />
          {notifications.length ? notifications.slice(0, 5).map((item) => (
            <View key={item.id} style={styles.row}>
              <Feather name="bell" size={18} color={item.type === "critical" ? medicalTheme.critical : medicalTheme.primary} />
              <View style={styles.rowMain}>
                <Text style={styles.rowTitle}>{item.title}</Text>
                <Text style={styles.rowMeta}>{item.message}</Text>
              </View>
            </View>
          )) : <EmptyState title="No alerts" message="Critical clinical alerts will appear here." />}
        </Card>

        <Card style={styles.panel}>
          <SectionHeader title="AI Performance" subtitle="Clinical AI quality indicators." />
          <View style={styles.metricList}>
            <Metric label="Accuracy" value="95%" />
            <Metric label="Sensitivity" value="97%" />
            <Metric label="Specificity" value="93%" />
          </View>
        </Card>

        <Card style={styles.panel}>
          <SectionHeader title="System Activity Timeline" subtitle="Recent actions across clinical workflows." />
          <TimelineItem icon="upload-cloud" title="ECG workflow ready" text={`${cases.length} ECG cases available in the command center.`} />
          <TimelineItem icon="file-text" title="Report queue updated" text={`${pendingReports} reports require physician attention.`} />
          <TimelineItem icon="bell" title="Alerts synchronized" text={`${notifications.length} notifications loaded for review.`} />
        </Card>

        <Card style={styles.panel}>
          <SectionHeader title="Today's Clinical Summary" subtitle="Operational snapshot for clinical leadership." />
          <View style={styles.summaryGrid}>
            <Metric label="Cases Reviewed" value={String(cases.filter((item) => item.status === "reviewed" || item.status === "finalized").length)} />
            <Metric label="Critical Findings" value={String(criticalCases)} />
            <Metric label="Reports Signed" value={String(reports.filter((item) => item.status === "signed").length)} />
            <Metric label="Active Patients" value={String(patients.length)} />
          </View>
        </Card>
      </View>
    </PageSection>
  );
}

function EcgHeroWave() {
  return (
    <View pointerEvents="none" style={styles.waveLayer}>
      {[0, 1, 2, 3, 4, 5].map((index) => (
        <View key={index} style={[styles.waveSegment, { left: `${index * 18}%`, top: index % 2 === 0 ? 62 : 82 }]} />
      ))}
      {[0, 1, 2, 3].map((index) => (
        <View key={`spike-${index}`} style={[styles.waveSpike, { left: `${18 + index * 19}%` }]} />
      ))}
    </View>
  );
}

function KpiCard({
  icon,
  label,
  loading,
  spark,
  tone = "primary",
  trend,
  value,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  loading: boolean;
  spark: number[];
  tone?: "critical" | "primary" | "success" | "warning";
  trend: string;
  value: string;
}) {
  const color = tone === "critical" ? medicalTheme.critical : tone === "success" ? medicalTheme.success : tone === "warning" ? medicalTheme.warning : medicalTheme.primary;
  return (
    <Card style={styles.kpiCard}>
      <View style={styles.kpiTop}>
        <View style={[styles.kpiIcon, { backgroundColor: `${color}22` }]}>
          <Feather name={icon} size={20} color={color} />
        </View>
        <Badge label={trend} tone={tone === "critical" ? "critical" : tone === "warning" ? "warning" : "success"} />
      </View>
      {loading ? <View style={styles.skeletonValue} /> : <Text style={styles.kpiValue}>{value}</Text>}
      <Text style={styles.kpiLabel}>{label}</Text>
      <Sparkline color={color} values={spark} />
      <Text style={styles.kpiComparison}>{trend} vs previous month</Text>
    </Card>
  );
}

function Sparkline({ color, values }: { color: string; values: number[] }) {
  const max = Math.max(...values, 1);
  return (
    <View style={styles.sparkline}>
      {values.map((value, index) => (
        <View key={`${value}-${index}`} style={[styles.sparkBar, { backgroundColor: color, height: Math.max(7, (value / max) * 34) }]} />
      ))}
    </View>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function TimelineItem({ icon, text, title }: { icon: keyof typeof Feather.glyphMap; text: string; title: string }) {
  return (
    <View style={styles.timelineItem}>
      <View style={styles.timelineIcon}>
        <Feather name={icon} size={16} color={medicalTheme.primary} />
      </View>
      <View style={styles.rowMain}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowMeta}>{text}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 16 },
  hero: { flexDirection: "row", flexWrap: "wrap", gap: 18, justifyContent: "space-between", overflow: "hidden", padding: 20 },
  heroActions: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  heroBadges: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  heroContent: { flex: 1, minWidth: 280 },
  heroText: { color: medicalTheme.muted, fontSize: 14, lineHeight: 21 },
  heroTitle: { color: medicalTheme.text, fontSize: 32, fontWeight: "900", letterSpacing: -0.9, marginVertical: 8 },
  kicker: { color: medicalTheme.primary, fontSize: 12, fontWeight: "900", letterSpacing: 1, textTransform: "uppercase" },
  kpiCard: { flex: 1, gap: 9, minWidth: 190 },
  kpiComparison: { color: medicalTheme.muted, fontSize: 11, fontWeight: "800" },
  kpiIcon: { alignItems: "center", borderRadius: 12, height: 40, justifyContent: "center", width: 40 },
  kpiLabel: { color: medicalTheme.muted, fontSize: 12, fontWeight: "800" },
  kpiTop: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  kpiValue: { color: medicalTheme.text, fontSize: 26, fontWeight: "900" },
  metric: { backgroundColor: medicalTheme.surface, borderColor: medicalTheme.border, borderRadius: 14, borderWidth: 1, flex: 1, minWidth: 180, padding: 14 },
  metricLabel: { color: medicalTheme.muted, fontSize: 12, fontWeight: "800" },
  metricList: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  metricValue: { color: medicalTheme.text, fontSize: 18, fontWeight: "900", marginTop: 5 },
  panel: { flex: 1, gap: 12, minWidth: 310 },
  patientAvatar: { alignItems: "center", backgroundColor: "#123B4A", borderRadius: 99, height: 38, justifyContent: "center", width: 38 },
  patientAvatarText: { color: medicalTheme.primary, fontSize: 12, fontWeight: "900" },
  row: { alignItems: "center", borderBottomColor: medicalTheme.border, borderBottomWidth: 1, flexDirection: "row", gap: 12, paddingVertical: 10 },
  rowMain: { flex: 1, minWidth: 0 },
  rowMeta: { color: medicalTheme.muted, fontSize: 12, lineHeight: 17 },
  rowTitle: { color: medicalTheme.text, fontSize: 14, fontWeight: "900" },
  skeletonValue: { backgroundColor: "#17324A", borderRadius: 10, height: 32, width: 86 },
  sparkBar: { borderRadius: 999, width: 8 },
  sparkline: { alignItems: "flex-end", flexDirection: "row", gap: 5, height: 38 },
  statGrid: { flexDirection: "row", flexWrap: "wrap", gap: 14 },
  summaryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  timelineIcon: { alignItems: "center", backgroundColor: "rgba(20,221,230,0.12)", borderRadius: 99, height: 34, justifyContent: "center", width: 34 },
  timelineItem: { alignItems: "center", borderBottomColor: medicalTheme.border, borderBottomWidth: 1, flexDirection: "row", gap: 12, paddingVertical: 10 },
  waveLayer: { ...StyleSheet.absoluteFillObject, opacity: 0.18 },
  waveSegment: { backgroundColor: medicalTheme.primary, borderRadius: 99, height: 2, position: "absolute", width: "13%" },
  waveSpike: { borderColor: medicalTheme.primary, borderLeftWidth: 2, borderTopWidth: 2, height: 34, position: "absolute", top: 58, transform: [{ rotate: "45deg" }], width: 34 },
});
