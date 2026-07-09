import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { Badge, Card, EmptyState, formatDate, medicalTheme, PageSection, PrimaryButton, roleLabel, SectionHeader } from "@/components/enterprise/EnterpriseUI";
import type { DashboardScreenContract } from "@/types/screens/dashboard";

type Props = {
  contract: DashboardScreenContract;
};

/** Legacy presentation — replaced by Bolt Dashboard on import. Presentation only; no API calls. */
export function DashboardLegacyPresentation({ contract }: Props) {
  const { actions, data } = contract;
  const loadingKpis = data.kpis.some((item) => item.loading);

  return (
    <PageSection>
      <Card style={styles.hero}>
        <View style={styles.heroContent}>
          <Text style={styles.kicker}>Enterprise Clinical Command Center</Text>
          <Text style={styles.heroTitle}>{data.snapshot.greeting}, {data.user.name ?? "Doctor"}</Text>
          <Text style={styles.heroText}>
            {data.user.institution ?? "ECG Insight Organization"} • {roleLabel(data.user.role)} • {data.snapshot.timeLabel}
          </Text>
          <View style={styles.heroBadges}>
            <Badge label="System Online" tone="success" />
            <Badge label="Database Online" tone="success" />
            <Badge label="AI Engine Online" tone="success" />
            <Badge label={data.subscriptionLabel} tone="primary" />
          </View>
        </View>
        <View style={styles.heroActions}>
          <PrimaryButton icon="upload-cloud" label="Upload ECG" onPress={actions.onUploadEcg} />
          <PrimaryButton icon="activity" label="Analyze ECG" onPress={actions.onAnalyzeEcg} variant="outline" />
          <PrimaryButton icon="message-square" label="Open AI Copilot" onPress={actions.onOpenCopilot} variant="outline" />
          <PrimaryButton icon="user-plus" label="Add Patient" onPress={actions.onAddPatient} variant="outline" />
          <PrimaryButton icon="file-plus" label="Generate Report" onPress={actions.onGenerateReport} variant="outline" />
        </View>
      </Card>

      <View style={styles.statGrid}>
        {data.kpis.map((item) => (
          <Card key={item.label} style={styles.kpiCard}>
            <Text style={styles.kpiValue}>{loadingKpis && item.loading ? "…" : item.value}</Text>
            <Text style={styles.kpiLabel}>{item.label}</Text>
            {item.trend ? <Badge label={item.trend} tone={item.tone === "critical" ? "critical" : item.tone === "warning" ? "warning" : "success"} /> : null}
          </Card>
        ))}
      </View>

      <View style={styles.grid}>
        <Card style={styles.panel}>
          <SectionHeader title="Recent ECG Cases" subtitle="Patient, date, AI result, and status." />
          {data.recentCases.length ? data.recentCases.map((item) => (
            <View key={item.id} style={styles.row}>
              <Feather name="activity" size={18} color={medicalTheme.primary} />
              <View style={styles.rowMain}>
                <Text style={styles.rowTitle}>{item.title}</Text>
                <Text style={styles.rowMeta}>{item.meta ? formatDate(item.meta) : ""}</Text>
              </View>
              {item.badges?.[0] ? <Badge label={item.badges[0].label} tone={item.badges[0].tone} /> : null}
            </View>
          )) : <EmptyState title="No ECG cases" message="Upload an ECG to start the clinical workflow." />}
        </Card>

        <Card style={styles.panel}>
          <SectionHeader title="Recent Patients" subtitle="Newest registry records." />
          {data.recentPatients.length ? data.recentPatients.map((item) => (
            <View key={item.id} style={styles.row}>
              <View style={styles.rowMain}>
                <Text style={styles.rowTitle}>{item.title}</Text>
                <Text style={styles.rowMeta}>{item.meta}</Text>
              </View>
            </View>
          )) : <EmptyState title="No patients" message="Create a patient record to attach ECG history and reports." />}
        </Card>

        <Card style={styles.panel}>
          <SectionHeader title="Critical Alerts" subtitle="High priority clinical and system notifications." />
          {data.notifications.length ? data.notifications.map((item) => (
            <View key={item.id} style={styles.row}>
              <Feather name="bell" size={18} color={medicalTheme.primary} />
              <View style={styles.rowMain}>
                <Text style={styles.rowTitle}>{item.title}</Text>
                <Text style={styles.rowMeta}>{item.meta}</Text>
              </View>
            </View>
          )) : <EmptyState title="No alerts" message="Critical clinical alerts will appear here." />}
        </Card>

        <Card style={styles.panel}>
          <SectionHeader title="AI Performance" subtitle="Live metrics from clinical validation benchmark runs." />
          <Metric label="Accuracy" value={data.aiMetrics.accuracyLabel} />
          <Metric label="Precision" value={data.aiMetrics.precisionLabel} />
          <Metric label="Recall" value={data.aiMetrics.recallLabel} />
          <Metric label="Avg Processing" value={data.aiMetrics.avgProcessingMs} />
          <Metric label="AI Engine" value={data.aiMetrics.engineStatus} />
        </Card>

        <Card style={styles.panel}>
          <SectionHeader title="System Activity Timeline" subtitle="Recent actions across clinical workflows." />
          {data.timeline.map((item) => (
            <View key={item.title} style={styles.row}>
              <Feather name={item.icon as keyof typeof Feather.glyphMap} size={16} color={medicalTheme.primary} />
              <View style={styles.rowMain}>
                <Text style={styles.rowTitle}>{item.title}</Text>
                <Text style={styles.rowMeta}>{item.text}</Text>
              </View>
            </View>
          ))}
        </Card>

        <Card style={styles.panel}>
          <SectionHeader title="Today's Clinical Summary" subtitle="Operational snapshot for clinical leadership." />
          {data.summary.map((item) => <Metric key={item.label} label={item.label} value={item.value} />)}
        </Card>
      </View>
    </PageSection>
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

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 16 },
  hero: { flexDirection: "row", flexWrap: "wrap", gap: 18, justifyContent: "space-between", padding: 20 },
  heroActions: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  heroBadges: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  heroContent: { flex: 1, minWidth: 280 },
  heroText: { color: medicalTheme.muted, fontSize: 14, lineHeight: 21 },
  heroTitle: { color: medicalTheme.text, fontSize: 32, fontWeight: "900", marginVertical: 8 },
  kicker: { color: medicalTheme.primary, fontSize: 12, fontWeight: "900", letterSpacing: 1, textTransform: "uppercase" },
  kpiCard: { flex: 1, gap: 8, minWidth: 190 },
  kpiLabel: { color: medicalTheme.muted, fontSize: 12, fontWeight: "800" },
  kpiValue: { color: medicalTheme.text, fontSize: 26, fontWeight: "900" },
  metric: { backgroundColor: medicalTheme.surface, borderColor: medicalTheme.border, borderRadius: 14, borderWidth: 1, marginBottom: 8, padding: 14 },
  metricLabel: { color: medicalTheme.muted, fontSize: 12, fontWeight: "800" },
  metricValue: { color: medicalTheme.text, fontSize: 18, fontWeight: "900", marginTop: 5 },
  panel: { flex: 1, gap: 12, minWidth: 310 },
  row: { alignItems: "center", borderBottomColor: medicalTheme.border, borderBottomWidth: 1, flexDirection: "row", gap: 12, paddingVertical: 10 },
  rowMain: { flex: 1, minWidth: 0 },
  rowMeta: { color: medicalTheme.muted, fontSize: 12, lineHeight: 17 },
  rowTitle: { color: medicalTheme.text, fontSize: 14, fontWeight: "900" },
  statGrid: { flexDirection: "row", flexWrap: "wrap", gap: 14 },
});
