import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Badge, Card, EmptyState, Field, formatDate, medicalTheme, PageSection, patientDisplayName, PrimaryButton, SectionHeader } from "@/components/enterprise/EnterpriseUI";
import { useAuth } from "@/context/AuthContext";
import { analyzeCaseWithRealAI, getAIExplainability, getAIHistory, getAIResult, submitDoctorReview, type AIAnalysisResult } from "@/services/ai";
import { listCases } from "@/services/clinical";
import { finalizeReport, generateReport, type ClinicalReport } from "@/services/reports";

export default function EcgAnalysisScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { authToken } = useAuth();
  const token = authToken?.token;
  const [selectedCaseId, setSelectedCaseId] = useState("");
  const [doctorDiagnosis, setDoctorDiagnosis] = useState("");
  const [doctorComments, setDoctorComments] = useState("");
  const [reviewReport, setReviewReport] = useState<ClinicalReport | null>(null);
  const [reviewMessage, setReviewMessage] = useState("");

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
  const selectedAnalysisQuery = useQuery({
    enabled: !!token && !!selectedCaseId,
    queryFn: () => getAIResult(token!, selectedCaseId),
    queryKey: ["enterprise-ai-result", token, selectedCaseId],
    retry: false,
  });
  const explainabilityQuery = useQuery({
    enabled: !!token && !!selectedCaseId,
    queryFn: () => getAIExplainability(token!, selectedCaseId),
    queryKey: ["enterprise-ai-explainability", token, selectedCaseId],
    retry: false,
  });

  const analyzeMutation = useMutation({
    mutationFn: (caseId: string) => analyzeCaseWithRealAI(token!, caseId),
    onSuccess: (payload) => {
      setReviewReport(payload.report);
      setReviewMessage(`Real AI analysis completed. Report generated: ${payload.report.reportNumber}`);
      void queryClient.invalidateQueries({ queryKey: ["enterprise-analysis-cases", token] });
      void queryClient.invalidateQueries({ queryKey: ["enterprise-ai-history", token] });
      void queryClient.invalidateQueries({ queryKey: ["enterprise-ai-result", token] });
      void queryClient.invalidateQueries({ queryKey: ["enterprise-ai-explainability", token] });
    },
  });
  const reportMutation = useMutation({
    mutationFn: (caseId: string) => generateReport(token!, caseId),
    onSuccess: (payload) => {
      setReviewReport(payload.report);
      setReviewMessage(`Report generated: ${payload.report.reportNumber}`);
      void queryClient.invalidateQueries({ queryKey: ["enterprise-reports", token] });
    },
  });
  const reviewMutation = useMutation({
    mutationFn: (input: { approved?: boolean; finalize?: boolean; reject?: boolean }) => {
      const severity = selectedAnalysisQuery.data?.analysis?.severity;
      return submitDoctorReview(token!, selectedCaseId, {
        approved: input.approved,
        comments: input.reject ? `Rejected: ${doctorComments}` : doctorComments,
        diagnosis: doctorDiagnosis.trim() || selectedAnalysisQuery.data?.analysis?.diagnosis,
        interpretation: doctorComments.trim() || selectedAnalysisQuery.data?.analysis?.interpretation,
        severity: severity ? severity.toUpperCase() as "CRITICAL" | "MILD" | "MODERATE" | "NORMAL" | "SEVERE" : undefined,
      });
    },
    onSuccess: (payload) => {
      setReviewMessage(`Doctor review saved. Case status: ${payload.review.status}.`);
      void queryClient.invalidateQueries({ queryKey: ["enterprise-analysis-cases", token] });
      void queryClient.invalidateQueries({ queryKey: ["enterprise-ai-history", token] });
      void queryClient.invalidateQueries({ queryKey: ["enterprise-ai-result", token, selectedCaseId] });
    },
  });
  const finalizeMutation = useMutation({
    mutationFn: async () => {
      const generated = reviewReport ?? (await generateReport(token!, selectedCaseId)).report;
      return finalizeReport(token!, generated.id);
    },
    onSuccess: (payload) => {
      setReviewReport(payload.report);
      setReviewMessage(`Report finalized: ${payload.report.reportNumber}`);
      void queryClient.invalidateQueries({ queryKey: ["enterprise-reports", token] });
    },
  });

  const cases = casesQuery.data?.cases ?? [];
  const analyses = historyQuery.data?.analyses ?? [];
  const selectedAnalysis = selectedAnalysisQuery.data?.analysis ?? analyses.find((item) => item.caseId === selectedCaseId) ?? null;
  const explainability = explainabilityQuery.data?.explainability ?? null;

  return (
    <PageSection>
      <Card style={styles.workflow}>
        <SectionHeader title="ECG Analysis Workflow" subtitle="Capture or upload ECG, preview, analyze, validate, save, and generate report." />
        <View style={styles.steps}>
          {["Draft", "AI Analyzed", "Under Review", "Approved", "Finalized"].map((step, index) => (
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
              <Text style={styles.rowMeta}>{patientDisplayName(item.patient)} • {item.ecgType} • {formatDate(item.uploadDate)} • {workflowState(item.status, item.aiStatus)}</Text>
              </View>
              <Badge label={item.priority} tone={item.priority === "critical" ? "critical" : item.priority === "high" ? "warning" : "primary"} />
              <View style={styles.actions}>
                <PrimaryButton label={analyzeMutation.isPending ? "Analyzing..." : "Analyze Real AI"} onPress={() => analyzeMutation.mutate(item.id)} variant="outline" />
                <PrimaryButton label="Review" onPress={() => {
                  setSelectedCaseId(item.id);
                  setDoctorDiagnosis(item.finalDiagnosis ?? "");
                }} variant="outline" />
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
                <Text style={styles.rowMeta}>{analysis.rhythm} • HR {analysis.heartRate} • Confidence {confidencePercent(analysis.confidenceScore)}% • {modelVersionLabel(analysis.aiVersion)}</Text>
              </View>
              <Badge label={severityBand(analysis.severity)} tone={analysis.severity === "critical" || analysis.severity === "severe" ? "critical" : analysis.severity === "normal" ? "success" : "warning"} />
              <PrimaryButton label="Open Review" onPress={() => {
                setSelectedCaseId(analysis.caseId);
                setDoctorDiagnosis(analysis.diagnosis);
              }} variant="outline" />
            </View>
          )) : <EmptyState title="No AI history" message="Completed AI analysis results will appear here." />}
        </Card>
      </View>

      <View style={styles.grid}>
        <Card style={styles.panelWide}>
          <SectionHeader title="Doctor Review Workflow" subtitle="Edit diagnosis, add comments, approve/reject, and finalize the clinical report." />
          {!selectedCaseId ? <EmptyState title="No case selected" message="Choose a case from Cases Ready For Review or AI Results to begin doctor review." /> : null}
          {selectedCaseId ? (
            <View style={styles.reviewStack}>
              <View style={styles.resultHeader}>
                <Badge label={workflowStateForAnalysis(selectedAnalysis)} tone="primary" />
                {selectedAnalysis ? <Badge label={severityBand(selectedAnalysis.severity)} tone={selectedAnalysis.severity === "critical" || selectedAnalysis.severity === "severe" ? "critical" : "warning"} /> : null}
              </View>
              {selectedAnalysis ? <AnalysisSummary analysis={selectedAnalysis} /> : <Text style={styles.muted}>Analysis result is loading or still queued.</Text>}
              <View style={styles.grid}>
                <Field label="Doctor Diagnosis" onChangeText={setDoctorDiagnosis} value={doctorDiagnosis} />
                <Field label="Doctor Comments / Interpretation" onChangeText={setDoctorComments} value={doctorComments} />
              </View>
              <View style={styles.actions}>
                <PrimaryButton label="Save Review" onPress={() => reviewMutation.mutate({})} variant="outline" />
                <PrimaryButton label="Approve" onPress={() => reviewMutation.mutate({ approved: true })} />
                <PrimaryButton label="Reject" onPress={() => reviewMutation.mutate({ reject: true })} variant="danger" />
                <PrimaryButton label="Finalize Report" onPress={() => finalizeMutation.mutate()} variant="outline" />
              </View>
              {reviewMessage ? <Text style={styles.success}>{reviewMessage}</Text> : null}
            </View>
          ) : null}
        </Card>

        <Card style={styles.panel}>
          <SectionHeader title="AI Explainability Panel" subtitle="Abnormal leads, detected features, interpretation rationale, and clinical reasoning." />
          {!selectedCaseId ? <EmptyState title="No explainability selected" message="Select a reviewed AI result to inspect clinical reasoning." /> : null}
          {selectedCaseId && explainabilityQuery.isLoading ? <Text style={styles.muted}>Loading explainability...</Text> : null}
          {explainability ? (
            <View style={styles.reviewStack}>
              <View style={styles.leadGrid}>
                {explainability.leadHighlights.map((lead) => (
                  <View key={`${lead.lead}-${lead.finding}`} style={styles.leadCard}>
                    <Text style={styles.leadName}>{lead.lead}</Text>
                    <Text style={styles.rowMeta}>{lead.finding}</Text>
                  </View>
                ))}
              </View>
              {explainability.panel.map((item) => (
                <View key={item.label} style={styles.reasonRow}>
                  <Text style={styles.reasonLabel}>{item.label}</Text>
                  <Text style={styles.reasonValue}>{item.value}</Text>
                </View>
              ))}
            </View>
          ) : selectedCaseId && !explainabilityQuery.isLoading ? <EmptyState title="Explainability pending" message="Run AI analysis to generate abnormal lead highlights and rationale." /> : null}
        </Card>
      </View>
    </PageSection>
  );
}

function AnalysisSummary({ analysis }: { analysis: AIAnalysisResult }) {
  return (
    <View style={styles.analysisCard}>
      <Text style={styles.rowTitle}>{analysis.diagnosis}</Text>
      <Text style={styles.rowMeta}>AI Diagnosis • {analysis.rhythm} • HR {analysis.heartRate} • Confidence {confidencePercent(analysis.confidenceScore)}%</Text>
      <Text style={styles.rowMeta}>Model Version • {modelVersionLabel(analysis.aiVersion)}</Text>
      <Text style={styles.body}>{analysis.interpretation}</Text>
      <View style={styles.disclaimerBox}>
        <Text style={styles.disclaimerTitle}>Clinical Disclaimer</Text>
        <Text style={styles.disclaimerText}>AI predictions are decision-support only and require physician review before diagnosis, treatment, or occupational fitness decisions.</Text>
      </View>
      <View style={styles.recommendationList}>
        {analysis.recommendations.map((item) => <Text key={item} style={styles.recommendation}>• {item}</Text>)}
        {analysis.urgentActions.map((item) => <Text key={item} style={styles.urgent}>• {item}</Text>)}
      </View>
    </View>
  );
}

function modelVersionLabel(value: string) {
  if (value.includes("onnx_runtime")) return value.split(":").slice(-2).join(" • ");
  if (value.includes("rule")) return "Rule-based fallback";
  if (value.includes("mock")) return "Mock provider";
  return value;
}

function confidencePercent(value: number) {
  return Math.round(value <= 1 ? value * 100 : value);
}

function severityBand(severity: AIAnalysisResult["severity"]) {
  if (severity === "critical") return "CRITICAL";
  if (severity === "severe") return "HIGH";
  if (severity === "moderate") return "MODERATE";
  return "LOW";
}

function workflowState(status: string, aiStatus: string) {
  if (status === "finalized") return "Finalized";
  if (status === "reviewed") return "Under Review";
  if (aiStatus === "completed") return "AI Analyzed";
  return "Draft";
}

function workflowStateForAnalysis(analysis: AIAnalysisResult | null) {
  if (!analysis) return "Draft";
  if (analysis.status === "completed") return "AI Analyzed";
  return analysis.status;
}

const styles = StyleSheet.create({
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  analysisCard: { backgroundColor: medicalTheme.surface, borderColor: medicalTheme.border, borderRadius: 14, borderWidth: 1, gap: 8, padding: 14 },
  body: { color: medicalTheme.text, fontSize: 13, lineHeight: 20 },
  caseRow: { alignItems: "center", borderBottomColor: medicalTheme.border, borderBottomWidth: 1, flexDirection: "row", flexWrap: "wrap", gap: 12, paddingVertical: 12 },
  disclaimerBox: { backgroundColor: "#2A1D08", borderColor: medicalTheme.warning, borderRadius: 12, borderWidth: 1, gap: 4, padding: 12 },
  disclaimerText: { color: medicalTheme.text, fontSize: 12, lineHeight: 18 },
  disclaimerTitle: { color: medicalTheme.warning, fontSize: 12, fontWeight: "900", textTransform: "uppercase" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 16 },
  leadCard: { backgroundColor: "#0B2134", borderColor: medicalTheme.primary, borderRadius: 12, borderWidth: 1, minWidth: 74, padding: 10 },
  leadGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  leadName: { color: medicalTheme.primary, fontSize: 15, fontWeight: "900" },
  muted: { color: medicalTheme.muted, fontSize: 13, fontWeight: "700" },
  panel: { flex: 1, gap: 10, minWidth: 320 },
  panelWide: { flex: 1.4, gap: 12, minWidth: 360 },
  reasonLabel: { color: medicalTheme.muted, fontSize: 11, fontWeight: "900", textTransform: "uppercase" },
  reasonRow: { backgroundColor: medicalTheme.surface, borderColor: medicalTheme.border, borderRadius: 12, borderWidth: 1, gap: 4, padding: 12 },
  reasonValue: { color: medicalTheme.text, fontSize: 13, fontWeight: "700", lineHeight: 19 },
  recommendation: { color: medicalTheme.text, fontSize: 12, lineHeight: 18 },
  recommendationList: { gap: 4 },
  resultHeader: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  reviewStack: { gap: 12 },
  rowMain: { flex: 1, minWidth: 240 },
  rowMeta: { color: medicalTheme.muted, fontSize: 12, lineHeight: 18 },
  rowTitle: { color: medicalTheme.text, fontSize: 14, fontWeight: "900" },
  step: { alignItems: "center", backgroundColor: medicalTheme.surface, borderColor: medicalTheme.border, borderRadius: 14, borderWidth: 1, flex: 1, gap: 7, minWidth: 140, padding: 12 },
  stepNumber: { color: medicalTheme.primary, fontSize: 22, fontWeight: "900" },
  stepText: { color: medicalTheme.text, fontSize: 12, fontWeight: "800", textAlign: "center" },
  steps: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  success: { color: medicalTheme.success, fontSize: 13, fontWeight: "900" },
  urgent: { color: medicalTheme.critical, fontSize: 12, fontWeight: "900", lineHeight: 18 },
  workflow: { gap: 16 },
});
