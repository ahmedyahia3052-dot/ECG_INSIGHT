import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { Badge, Card, EmptyState, formatDate, medicalTheme, PageSection, patientDisplayName, PrimaryButton, SectionHeader } from "@/components/enterprise/EnterpriseUI";
import { CaseCollaborationPanel } from "@/components/collaboration/CaseCollaborationPanel";
import { CDSSDecisionPanel } from "@/components/clinical/CDSSDecisionPanel";
import { LongitudinalECGPanel } from "@/components/clinical/LongitudinalECGPanel";
import { EcgProViewer } from "@/components/ecg/EcgProViewer";
import { useAuth } from "@/context/AuthContext";
import { analyzeCase, getAIExplainability, getAIResult } from "@/services/ai";
import { approveCase, createCaseRevision, getCase, rejectCase, updateCaseStatus } from "@/services/clinical";
import { getDigitalECG } from "@/services/ecgProcessing";
import { generateReport } from "@/services/reports";

export default function EcgCaseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { authToken } = useAuth();
  const token = authToken?.token;

  const caseQuery = useQuery({
    enabled: !!token && !!id,
    queryFn: () => getCase(token!, id),
    queryKey: ["enterprise-ecg-case", token, id],
    retry: false,
  });
  const analysisQuery = useQuery({
    enabled: !!token && !!id,
    queryFn: () => getAIResult(token!, id),
    queryKey: ["enterprise-ecg-case-ai", token, id],
    retry: false,
  });
  const explainabilityQuery = useQuery({
    enabled: !!token && !!id,
    queryFn: () => getAIExplainability(token!, id),
    queryKey: ["enterprise-ecg-case-explainability", token, id],
    retry: false,
  });
  const digitalEcgQuery = useQuery({
    enabled: !!token && !!id,
    queryFn: () => getDigitalECG(token!, id),
    queryKey: ["enterprise-ecg-case-digital", token, id],
    retry: false,
  });

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ["enterprise-ecg-case", token, id] });
    await queryClient.invalidateQueries({ queryKey: ["enterprise-ecg-cases", token] });
  };
  const analyzeMutation = useMutation({ mutationFn: () => analyzeCase(token!, id), onSuccess: invalidate });
  const processMutation = useMutation({ mutationFn: () => updateCaseStatus(token!, id, "processing"), onSuccess: invalidate });
  const approveMutation = useMutation({ mutationFn: () => approveCase(token!, id), onSuccess: invalidate });
  const rejectMutation = useMutation({ mutationFn: () => rejectCase(token!, id, { reason: "Rejected from detail review." }), onSuccess: invalidate });
  const finalizeMutation = useMutation({ mutationFn: () => updateCaseStatus(token!, id, "finalized"), onSuccess: invalidate });
  const reportMutation = useMutation({ mutationFn: () => generateReport(token!, id), onSuccess: invalidate });
  const revisionMutation = useMutation({
    mutationFn: () => createCaseRevision(token!, id),
    onSuccess: (payload) => router.push(`/ecg-cases/${payload.case.id}` as never),
  });

  const ecgCase = caseQuery.data?.case;
  const analysis = analysisQuery.data?.analysis;
  const explainability = explainabilityQuery.data?.explainability;
  const digitalEcg = digitalEcgQuery.data?.digitalEcg;

  if (caseQuery.isLoading) return <Text style={styles.muted}>Loading ECG case...</Text>;
  if (!ecgCase) return <EmptyState title="ECG case not found" message="The selected ECG case could not be loaded." />;
  const readOnly = ecgCase.status === "finalized";
  const canProcess = ecgCase.status === "uploaded";
  const canAnalyze = ecgCase.status === "uploaded" || ecgCase.status === "processing";
  const canReview = ecgCase.status === "ai_completed" || ecgCase.status === "under_review";
  const canApproveReject = ecgCase.status === "under_review";
  const canFinalize = ecgCase.status === "approved" || ecgCase.status === "rejected";

  return (
    <PageSection>
      <Card style={styles.hero}>
        <View style={styles.heroText}>
          <Text style={styles.title}>{ecgCase.caseNumber ?? ecgCase.caseId}</Text>
          <Text style={styles.muted}>{patientDisplayName(ecgCase.patient)} • {formatDate(ecgCase.acquisitionDate ?? ecgCase.uploadDate)} • {ecgCase.ecgType}</Text>
          <View style={styles.actions}>
            <Badge label={ecgCase.status.replace(/_/g, " ")} tone={ecgCase.status === "rejected" ? "critical" : ecgCase.status === "approved" || ecgCase.status === "finalized" ? "success" : "primary"} />
            <Badge label={ecgCase.severity ?? "normal"} tone={ecgCase.severity === "critical" ? "critical" : ecgCase.severity === "abnormal" ? "warning" : "success"} />
            <Badge label={`AI ${ecgCase.aiStatus}`} tone={ecgCase.aiStatus === "completed" ? "success" : "primary"} />
          </View>
        </View>
        <View style={styles.actions}>
          <PrimaryButton disabled={!canProcess} label="Process" onPress={() => processMutation.mutate()} variant="outline" />
          <PrimaryButton disabled={!canAnalyze} label="Run AI" onPress={() => analyzeMutation.mutate()} />
          <PrimaryButton disabled={!canReview && !readOnly} label="Review" onPress={() => router.push(`/ecg-cases/${ecgCase.id}/review` as never)} variant="outline" />
          <PrimaryButton disabled={!canApproveReject} label="Approve" onPress={() => approveMutation.mutate()} variant="outline" />
          <PrimaryButton disabled={!canApproveReject} label="Reject" onPress={() => rejectMutation.mutate()} variant="danger" />
          <PrimaryButton disabled={!canFinalize} label="Finalize" onPress={() => finalizeMutation.mutate()} variant="outline" />
          <PrimaryButton disabled={readOnly} label="Generate Report" onPress={() => reportMutation.mutate()} variant="outline" />
          {readOnly || ecgCase.status === "approved" || ecgCase.status === "rejected" ? <PrimaryButton label="Create New Revision" onPress={() => revisionMutation.mutate()} variant="outline" /> : null}
        </View>
      </Card>

      <EcgProViewer analysis={analysis} digitalEcg={digitalEcg} ecgCase={ecgCase} explainability={explainability} />

      {token ? <CDSSDecisionPanel accessToken={token} caseId={ecgCase.id} /> : null}

      {token ? <LongitudinalECGPanel accessToken={token} caseId={ecgCase.id} patientId={ecgCase.patient.id} /> : null}

      {token ? <CaseCollaborationPanel accessToken={token} caseId={ecgCase.id} defaultAssigneeId={ecgCase.assignedDoctorId} /> : null}

      <View style={styles.grid}>
        <Card style={styles.panel}>
          <SectionHeader title="ECG Measurements" />
          <Info label="Heart Rate" value={unit(ecgCase.heartRate, "BPM")} />
          <Info label="PR Interval" value={unit(ecgCase.prInterval, "ms")} />
          <Info label="QRS Duration" value={unit(ecgCase.qrsDuration, "ms")} />
          <Info label="QT Interval" value={unit(ecgCase.qtInterval, "ms")} />
          <Info label="QTc Interval" value={unit(ecgCase.qtcInterval, "ms")} />
          <Info label="Rhythm" value={ecgCase.rhythm ?? analysis?.rhythm ?? "Pending"} />
        </Card>
      </View>

      <View style={styles.grid}>
        <Card style={styles.panel}>
          <SectionHeader title="AI Findings" />
          <Info label="Diagnosis" value={ecgCase.aiDiagnosis ?? analysis?.diagnosis ?? "AI pending"} />
          <Info label="Confidence" value={confidence(ecgCase.confidenceScore ?? analysis?.confidenceScore)} />
          <Info label="Risk Level" value={(ecgCase.severity ?? severityFromAnalysis(analysis?.severity)).toUpperCase()} />
          {analysis?.interpretation ? <Text style={styles.body}>{analysis.interpretation}</Text> : null}
        </Card>
        <Card style={styles.panel}>
          <SectionHeader title="Explainability" />
          {explainability ? (
            <View style={styles.stack}>
              <Info label="Detected Abnormalities" value={explainability.panel.find((item) => item.label.includes("Abnormal"))?.value ?? "None detected"} />
              <Info label="Evidence" value={explainability.leadHighlights.map((item) => `${item.lead}: ${item.finding}`).join(", ") || "No lead evidence yet"} />
              <Info label="Clinical Reasoning" value={explainability.panel.find((item) => item.label.includes("Rationale"))?.value ?? analysis?.interpretation ?? "Pending"} />
            </View>
          ) : <EmptyState title="Explainability pending" message="Run AI analysis to generate detected abnormalities, evidence, and clinical reasoning." />}
        </Card>
      </View>

      <View style={styles.grid}>
        <Card style={styles.panel}>
          <SectionHeader title="Doctor Review" action={<PrimaryButton label="Open Review" onPress={() => router.push(`/ecg-cases/${ecgCase.id}/review` as never)} variant="outline" />} />
          <Info label="Diagnosis" value={ecgCase.doctorDiagnosis ?? ecgCase.finalDiagnosis ?? "Pending doctor review"} />
          <Info label="Comments" value={ecgCase.clinicalComments ?? ecgCase.clinicalNotes ?? "No comments yet"} />
          <Info label="Reviewed At" value={ecgCase.reviewedAt ? formatDate(ecgCase.reviewedAt) : "Not reviewed"} />
        </Card>
        <Card style={styles.panel}>
          <SectionHeader title="Final Recommendations" />
          <Text style={styles.body}>{ecgCase.recommendations ?? analysis?.recommendations.join("\n") ?? "Recommendations will be generated after AI analysis and doctor review."}</Text>
        </Card>
      </View>
    </PageSection>
  );
}

function unit(value: number | undefined, suffix: string) {
  return value === undefined ? "Pending" : `${value} ${suffix}`;
}

function confidence(value?: number) {
  if (value === undefined) return "Pending";
  return `${Math.round(value <= 1 ? value * 100 : value)}%`;
}

function severityFromAnalysis(severity?: string) {
  if (severity === "critical" || severity === "severe") return "critical";
  if (severity && severity !== "normal") return "abnormal";
  return "normal";
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
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 16 },
  hero: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: 16 },
  heroText: { flex: 1, minWidth: 260 },
  info: { borderBottomColor: medicalTheme.border, borderBottomWidth: 1, gap: 3, paddingVertical: 9 },
  infoLabel: { color: medicalTheme.muted, fontSize: 12, fontWeight: "800" },
  infoValue: { color: medicalTheme.text, fontSize: 14, fontWeight: "800" },
  muted: { color: medicalTheme.muted, fontSize: 13, fontWeight: "700" },
  panel: { flex: 1, gap: 10, minWidth: 320 },
  stack: { gap: 8 },
  title: { color: medicalTheme.text, fontSize: 28, fontWeight: "900" },
});
