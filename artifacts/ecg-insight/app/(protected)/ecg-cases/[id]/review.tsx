import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Badge, Card, EmptyState, Field, formatDate, medicalTheme, PageSection, patientDisplayName, PrimaryButton, SectionHeader } from "@/components/enterprise/EnterpriseUI";
import { useAuth } from "@/context/AuthContext";
import { getAIExplainability, getAIResult, submitDoctorReview } from "@/services/ai";
import { approveCase, createCaseRevision, getCase, rejectCase, reviewCase } from "@/services/clinical";
import { generateReport } from "@/services/reports";

type Severity = "abnormal" | "critical" | "normal";

const severities: Severity[] = ["normal", "abnormal", "critical"];

export default function EcgCaseReviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { authToken } = useAuth();
  const token = authToken?.token;
  const [doctorDiagnosis, setDoctorDiagnosis] = useState("");
  const [clinicalComments, setClinicalComments] = useState("");
  const [recommendations, setRecommendations] = useState("");
  const [severity, setSeverity] = useState<Severity>("normal");
  const [message, setMessage] = useState("");

  const caseQuery = useQuery({
    enabled: !!token && !!id,
    queryFn: () => getCase(token!, id),
    queryKey: ["enterprise-ecg-case-review", token, id],
    retry: false,
  });
  const analysisQuery = useQuery({
    enabled: !!token && !!id,
    queryFn: () => getAIResult(token!, id),
    queryKey: ["enterprise-ecg-case-review-ai", token, id],
    retry: false,
  });
  const explainabilityQuery = useQuery({
    enabled: !!token && !!id,
    queryFn: () => getAIExplainability(token!, id),
    queryKey: ["enterprise-ecg-case-review-explainability", token, id],
    retry: false,
  });

  const ecgCase = caseQuery.data?.case;
  const analysis = analysisQuery.data?.analysis;
  const explainability = explainabilityQuery.data?.explainability;

  useEffect(() => {
    if (!ecgCase) return;
    setDoctorDiagnosis(ecgCase.doctorDiagnosis ?? ecgCase.finalDiagnosis ?? ecgCase.aiDiagnosis ?? analysis?.diagnosis ?? "");
    setClinicalComments(ecgCase.clinicalComments ?? ecgCase.clinicalNotes ?? analysis?.interpretation ?? "");
    setRecommendations(ecgCase.recommendations ?? analysis?.recommendations.join("\n") ?? "");
    setSeverity(ecgCase.severity ?? severityFromAnalysis(analysis?.severity));
  }, [analysis, ecgCase]);

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ["enterprise-ecg-case-review", token, id] });
    await queryClient.invalidateQueries({ queryKey: ["enterprise-ecg-case", token, id] });
    await queryClient.invalidateQueries({ queryKey: ["enterprise-ecg-cases", token] });
  };

  const saveMutation = useMutation({
    mutationFn: () => reviewCase(token!, id, { clinicalComments, doctorDiagnosis, recommendations, severity }),
    onSuccess: async () => {
      await submitDoctorReview(token!, id, {
        comments: clinicalComments,
        diagnosis: doctorDiagnosis,
        interpretation: clinicalComments,
        severity: severity === "critical" ? "CRITICAL" : severity === "abnormal" ? "MODERATE" : "NORMAL",
      }).catch(() => null);
      setMessage("Doctor review saved.");
      await invalidate();
    },
  });
  const approveMutation = useMutation({
    mutationFn: async () => {
      await saveMutation.mutateAsync();
      return approveCase(token!, id);
    },
    onSuccess: async () => {
      setMessage("ECG case approved.");
      await invalidate();
    },
  });
  const rejectMutation = useMutation({
    mutationFn: () => rejectCase(token!, id, { clinicalComments, reason: clinicalComments }),
    onSuccess: async () => {
      setMessage("ECG case rejected.");
      await invalidate();
    },
  });
  const reportMutation = useMutation({
    mutationFn: () => generateReport(token!, id),
    onSuccess: async (payload) => {
      setMessage(`Final report generated: ${payload.report.reportNumber}`);
      await invalidate();
    },
  });
  const revisionMutation = useMutation({
    mutationFn: () => createCaseRevision(token!, id),
    onSuccess: (payload) => {
      setMessage(`New revision created: ${payload.case.caseNumber ?? payload.case.caseId}`);
      router.push(`/ecg-cases/${payload.case.id}` as never);
    },
  });

  if (caseQuery.isLoading) return <Text style={styles.muted}>Loading review workspace...</Text>;
  if (!ecgCase) return <EmptyState title="ECG case not found" message="The selected ECG case could not be loaded for review." />;
  const readOnly = ecgCase.status === "finalized";

  return (
    <PageSection>
      <Card style={styles.hero}>
        <View style={styles.heroText}>
          <Text style={styles.title}>Doctor Review: {ecgCase.caseNumber ?? ecgCase.caseId}</Text>
          <Text style={styles.muted}>{patientDisplayName(ecgCase.patient)} • {formatDate(ecgCase.acquisitionDate ?? ecgCase.uploadDate)} • {ecgCase.ecgType}</Text>
          <View style={styles.actions}>
            <Badge label={ecgCase.status.replace(/_/g, " ")} tone="primary" />
            <Badge label={severity} tone={severity === "critical" ? "critical" : severity === "abnormal" ? "warning" : "success"} />
          </View>
        </View>
        <View style={styles.actions}>
          <PrimaryButton label="Back to Case" onPress={() => router.push(`/ecg-cases/${ecgCase.id}` as never)} variant="outline" />
          <PrimaryButton disabled={readOnly} label="Generate Report" onPress={() => reportMutation.mutate()} variant="outline" />
          {readOnly ? <PrimaryButton label="Create New Revision" onPress={() => revisionMutation.mutate()} /> : null}
        </View>
      </Card>

      <View style={styles.grid}>
        <Card style={styles.panel}>
          <SectionHeader title="AI Findings" subtitle="Diagnosis, confidence, and risk level from the AI engine." />
          <Info label="AI Diagnosis" value={ecgCase.aiDiagnosis ?? analysis?.diagnosis ?? "Pending"} />
          <Info label="Confidence" value={confidence(ecgCase.confidenceScore ?? analysis?.confidenceScore)} />
          <Info label="Risk Level" value={(ecgCase.severity ?? severityFromAnalysis(analysis?.severity)).toUpperCase()} />
          <Text style={styles.body}>{analysis?.interpretation ?? "AI interpretation will appear after analysis completes."}</Text>
        </Card>
        <Card style={styles.panel}>
          <SectionHeader title="Explainability" />
          {explainability ? (
            <>
              <Info label="Detected Abnormalities" value={explainability.panel.map((item) => `${item.label}: ${item.value}`).join("\n")} />
              <Info label="Evidence" value={explainability.leadHighlights.map((item) => `${item.lead}: ${item.finding}`).join(", ") || "No lead evidence."} />
            </>
          ) : <EmptyState title="Explainability pending" message="Run AI analysis before reviewing explainability." />}
        </Card>
      </View>

      <Card style={styles.form}>
        <SectionHeader title="Doctor Review" subtitle="Edit diagnosis, comments, severity, recommendations, then approve or reject." />
        <View style={styles.grid}>
          <Field editable={!readOnly} label="Doctor Diagnosis" onChangeText={setDoctorDiagnosis} value={doctorDiagnosis} />
          <Field editable={!readOnly} label="Clinical Comments" onChangeText={setClinicalComments} value={clinicalComments} />
          <Field editable={!readOnly} label="Final Recommendations" onChangeText={setRecommendations} value={recommendations} />
        </View>
        <View style={styles.actions}>
          {severities.map((item) => <PrimaryButton disabled={readOnly} key={item} label={item} onPress={() => setSeverity(item)} variant={severity === item ? "primary" : "outline"} />)}
        </View>
        <View style={styles.actions}>
          <PrimaryButton disabled={readOnly || saveMutation.isPending} label="Save Review" onPress={() => saveMutation.mutate()} variant="outline" />
          <PrimaryButton disabled={readOnly || approveMutation.isPending} label="Approve" onPress={() => approveMutation.mutate()} />
          <PrimaryButton disabled={readOnly || rejectMutation.isPending} label="Reject" onPress={() => rejectMutation.mutate()} variant="danger" />
        </View>
        {readOnly ? <Text style={styles.muted}>Finalized ECG cases are read-only. Create a new revision for additional analysis.</Text> : null}
        {message ? <Text style={styles.success}>{message}</Text> : null}
      </Card>
    </PageSection>
  );
}

function severityFromAnalysis(severity?: string): Severity {
  if (severity === "critical" || severity === "severe") return "critical";
  if (severity && severity !== "normal") return "abnormal";
  return "normal";
}

function confidence(value?: number) {
  if (value === undefined) return "Pending";
  return `${Math.round(value <= 1 ? value * 100 : value)}%`;
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
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  body: { color: medicalTheme.text, fontSize: 13, fontWeight: "700", lineHeight: 20 },
  form: { gap: 14 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 16 },
  hero: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: 16 },
  heroText: { flex: 1, minWidth: 260 },
  info: { borderBottomColor: medicalTheme.border, borderBottomWidth: 1, gap: 3, paddingVertical: 9 },
  infoLabel: { color: medicalTheme.muted, fontSize: 12, fontWeight: "800" },
  infoValue: { color: medicalTheme.text, fontSize: 14, fontWeight: "800" },
  muted: { color: medicalTheme.muted, fontSize: 13, fontWeight: "700" },
  panel: { flex: 1, gap: 10, minWidth: 320 },
  success: { color: medicalTheme.success, fontSize: 14, fontWeight: "900" },
  title: { color: medicalTheme.text, fontSize: 26, fontWeight: "900" },
});
