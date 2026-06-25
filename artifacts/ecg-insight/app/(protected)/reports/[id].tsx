import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import React from "react";
import { Platform, StyleSheet, Text, View } from "react-native";

import { Badge, Card, EmptyState, formatDate, medicalTheme, PageSection, PrimaryButton, SectionHeader } from "@/components/enterprise/EnterpriseUI";
import { useAuth } from "@/context/AuthContext";
import { downloadReportPdf, emailReport, finalizeReport, getReport, signReport } from "@/services/reports";

export default function ReportDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { authToken, user } = useAuth();
  const token = authToken?.token;

  const reportQuery = useQuery({
    enabled: !!token && !!id,
    queryFn: () => getReport(token!, id),
    queryKey: ["enterprise-report-detail", token, id],
    retry: false,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["enterprise-report-detail", token, id] });
  const finalizeMutation = useMutation({ mutationFn: () => finalizeReport(token!, id), onSuccess: invalidate });
  const signMutation = useMutation({ mutationFn: () => signReport(token!, id), onSuccess: invalidate });
  const emailMutation = useMutation({
    mutationFn: () => emailReport(token!, id, { recipient: user?.email ?? "doctor@hospital.com", message: "Clinical ECG report attached." }),
  });

  const report = reportQuery.data?.report;
  if (reportQuery.isLoading) return <Text style={styles.muted}>Loading report...</Text>;
  if (!report) return <EmptyState title="Report not found" message="The requested report could not be loaded." />;

  return (
    <PageSection>
      <Card style={styles.hero}>
        <View style={styles.heroMain}>
          <Text style={styles.title}>{report.reportNumber}</Text>
          <Text style={styles.muted}>{report.physicianName} • {formatDate(report.reportingDate)} • {report.organizationName ?? "ECG Insight"}</Text>
          <View style={styles.badges}>
            <Badge label={report.status} tone={report.status === "signed" ? "success" : "warning"} />
            <Badge label={report.severityClassification ?? "Unclassified"} tone="primary" />
          </View>
        </View>
        <View style={styles.actions}>
          <PrimaryButton label="Finalize" onPress={() => finalizeMutation.mutate()} variant="outline" />
          <PrimaryButton label="Sign" onPress={() => signMutation.mutate()} variant="outline" />
          <PrimaryButton label="Export PDF" onPress={() => void openReportPdf(token, report.id)} />
          <PrimaryButton label="Email" onPress={() => emailMutation.mutate()} variant="outline" />
        </View>
      </Card>

      <View style={styles.grid}>
        <Card style={styles.panel}>
          <SectionHeader title="Clinical Interpretation" />
          <Info label="Clinical Indication" value={report.clinicalIndication ?? "Not recorded"} />
          <Info label="Rhythm" value={report.rhythmInterpretation ?? "Pending"} />
          <Info label="Final Impression" value={report.finalPhysicianImpression ?? "Pending physician impression"} />
          <Info label="AI Findings" value={report.aiFindings ?? "No AI findings attached"} />
        </Card>
        <Card style={styles.panel}>
          <SectionHeader title="Recommendations" />
          {(report.recommendations.length ? report.recommendations : ["No recommendations recorded."]).map((item) => <Info key={item} label="Recommendation" value={item} />)}
          {(report.urgentActions.length ? report.urgentActions : ["No urgent actions recorded."]).map((item) => <Info key={item} label="Urgent Action" value={item} />)}
        </Card>
      </View>
    </PageSection>
  );
}

async function openReportPdf(token: string | undefined, reportId: string) {
  if (!token || Platform.OS !== "web" || typeof window === "undefined") return;
  const blob = await downloadReportPdf(token, reportId);
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener,noreferrer");
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
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
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 16 },
  hero: { alignItems: "flex-start", flexDirection: "row", flexWrap: "wrap", gap: 16, justifyContent: "space-between" },
  heroMain: { flex: 1, minWidth: 260 },
  info: { borderBottomColor: medicalTheme.border, borderBottomWidth: 1, gap: 4, paddingVertical: 10 },
  infoLabel: { color: medicalTheme.muted, fontSize: 12, fontWeight: "800" },
  infoValue: { color: medicalTheme.text, fontSize: 14, fontWeight: "800", lineHeight: 20 },
  muted: { color: medicalTheme.muted, fontSize: 13, fontWeight: "700" },
  panel: { flex: 1, gap: 8, minWidth: 310 },
  title: { color: medicalTheme.text, fontSize: 30, fontWeight: "900" },
});
