import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { Badge, Card, EmptyState, formatDate, medicalTheme, PageSection, patientDisplayName, PrimaryButton, SectionHeader } from "@/components/enterprise/EnterpriseUI";
import { useAuth } from "@/context/AuthContext";
import { analyzeCase, getAIHistory } from "@/services/ai";
import { listCases } from "@/services/clinical";
import { generateReport } from "@/services/reports";

export default function EcgAnalysisScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { authToken } = useAuth();
  const token = authToken?.token;

  const casesQuery = useQuery({
    enabled: !!token,
    queryFn: () => listCases(token!, new URLSearchParams({ pageSize: "20" })),
    queryKey: ["enterprise-analysis-cases", token],
    retry: false,
  });
  const historyQuery = useQuery({
    enabled: !!token,
    queryFn: () => getAIHistory(token!),
    queryKey: ["enterprise-ai-history", token],
    retry: false,
  });

  const analyzeMutation = useMutation({
    mutationFn: (caseId: string) => analyzeCase(token!, caseId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["enterprise-analysis-cases", token] });
      void queryClient.invalidateQueries({ queryKey: ["enterprise-ai-history", token] });
    },
  });
  const reportMutation = useMutation({
    mutationFn: (caseId: string) => generateReport(token!, caseId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["enterprise-reports", token] }),
  });

  const cases = casesQuery.data?.cases ?? [];
  const analyses = historyQuery.data?.analyses ?? [];

  return (
    <PageSection>
      <Card style={styles.workflow}>
        <SectionHeader title="ECG Analysis Workflow" subtitle="Capture or upload ECG, preview, analyze, validate, save, and generate report." />
        <View style={styles.steps}>
          {["Capture/Upload ECG", "Preview", "Analyze", "AI Results", "Doctor Validation", "Save", "Generate Report"].map((step, index) => (
            <View key={step} style={styles.step}>
              <Text style={styles.stepNumber}>{index + 1}</Text>
              <Text style={styles.stepText}>{step}</Text>
            </View>
          ))}
        </View>
        <PrimaryButton icon="upload-cloud" label="Start Upload Workflow" onPress={() => router.push("/upload-ecg" as never)} />
      </Card>

      <View style={styles.grid}>
        <Card style={styles.panel}>
          <SectionHeader title="Cases Ready For Review" />
          {casesQuery.isLoading ? <Text style={styles.muted}>Loading cases...</Text> : null}
          {!casesQuery.isLoading && !cases.length ? <EmptyState title="No ECG cases" message="Upload an ECG to begin analysis." /> : null}
          {cases.map((item) => (
            <View key={item.id} style={styles.caseRow}>
              <View style={styles.rowMain}>
                <Text style={styles.rowTitle}>{item.caseId}</Text>
                <Text style={styles.rowMeta}>{patientDisplayName(item.patient)} • {item.ecgType} • {formatDate(item.uploadDate)}</Text>
              </View>
              <Badge label={item.priority} tone={item.priority === "critical" ? "critical" : item.priority === "high" ? "warning" : "primary"} />
              <View style={styles.actions}>
                <PrimaryButton label="Analyze" onPress={() => analyzeMutation.mutate(item.id)} variant="outline" />
                <PrimaryButton label="Generate Report" onPress={() => reportMutation.mutate(item.id)} variant="outline" />
              </View>
            </View>
          ))}
        </Card>
        <Card style={styles.panel}>
          <SectionHeader title="AI Results" subtitle="Latest AI interpretations and confidence scores." />
          {analyses.length ? analyses.slice(0, 8).map((analysis) => (
            <View key={analysis.id} style={styles.caseRow}>
              <View style={styles.rowMain}>
                <Text style={styles.rowTitle}>{analysis.diagnosis}</Text>
                <Text style={styles.rowMeta}>{analysis.rhythm} • HR {analysis.heartRate} • Confidence {Math.round(analysis.confidenceScore)}%</Text>
              </View>
              <Badge label={analysis.severity} tone={analysis.severity === "critical" || analysis.severity === "severe" ? "critical" : analysis.severity === "normal" ? "success" : "warning"} />
            </View>
          )) : <EmptyState title="No AI history" message="Completed AI analysis results will appear here." />}
        </Card>
      </View>
    </PageSection>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  caseRow: { alignItems: "center", borderBottomColor: medicalTheme.border, borderBottomWidth: 1, flexDirection: "row", flexWrap: "wrap", gap: 12, paddingVertical: 12 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 16 },
  muted: { color: medicalTheme.muted, fontSize: 13, fontWeight: "700" },
  panel: { flex: 1, gap: 10, minWidth: 320 },
  rowMain: { flex: 1, minWidth: 240 },
  rowMeta: { color: medicalTheme.muted, fontSize: 12, lineHeight: 18 },
  rowTitle: { color: medicalTheme.text, fontSize: 14, fontWeight: "900" },
  step: { alignItems: "center", backgroundColor: medicalTheme.surface, borderColor: medicalTheme.border, borderRadius: 14, borderWidth: 1, flex: 1, gap: 7, minWidth: 140, padding: 12 },
  stepNumber: { color: medicalTheme.primary, fontSize: 22, fontWeight: "900" },
  stepText: { color: medicalTheme.text, fontSize: 12, fontWeight: "800", textAlign: "center" },
  steps: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  workflow: { gap: 16 },
});
