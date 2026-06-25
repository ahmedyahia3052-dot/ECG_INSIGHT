import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { Image, Platform, ScrollView, StyleSheet, Text, View } from "react-native";

import { Badge, Card, EmptyState, formatDate, medicalTheme, PageSection, patientDisplayName, PrimaryButton, SectionHeader } from "@/components/enterprise/EnterpriseUI";
import { useAuth } from "@/context/AuthContext";
import { analyzeCase, getAIExplainability, getAIResult } from "@/services/ai";
import { API_URL } from "@/services/api";
import { approveCase, getCase, rejectCase, updateCaseStatus, type ApiECGCase } from "@/services/clinical";
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

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ["enterprise-ecg-case", token, id] });
    await queryClient.invalidateQueries({ queryKey: ["enterprise-ecg-cases", token] });
  };
  const analyzeMutation = useMutation({ mutationFn: () => analyzeCase(token!, id), onSuccess: invalidate });
  const processMutation = useMutation({ mutationFn: () => updateCaseStatus(token!, id, "processing"), onSuccess: invalidate });
  const approveMutation = useMutation({ mutationFn: () => approveCase(token!, id), onSuccess: invalidate });
  const rejectMutation = useMutation({ mutationFn: () => rejectCase(token!, id, { reason: "Rejected from detail review." }), onSuccess: invalidate });
  const reportMutation = useMutation({ mutationFn: () => generateReport(token!, id), onSuccess: invalidate });

  const ecgCase = caseQuery.data?.case;
  const analysis = analysisQuery.data?.analysis;
  const explainability = explainabilityQuery.data?.explainability;

  if (caseQuery.isLoading) return <Text style={styles.muted}>Loading ECG case...</Text>;
  if (!ecgCase) return <EmptyState title="ECG case not found" message="The selected ECG case could not be loaded." />;

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
          <PrimaryButton label="Process" onPress={() => processMutation.mutate()} variant="outline" />
          <PrimaryButton label="Run AI" onPress={() => analyzeMutation.mutate()} />
          <PrimaryButton label="Review" onPress={() => router.push(`/ecg-cases/${ecgCase.id}/review` as never)} variant="outline" />
          <PrimaryButton label="Approve" onPress={() => approveMutation.mutate()} variant="outline" />
          <PrimaryButton label="Reject" onPress={() => rejectMutation.mutate()} variant="danger" />
          <PrimaryButton label="Generate Report" onPress={() => reportMutation.mutate()} variant="outline" />
        </View>
      </Card>

      <View style={styles.grid}>
        <Card style={styles.viewer}>
          <SectionHeader title="ECG Viewer" subtitle="Original ECG image/PDF with zoom-ready scroll viewer." />
          <EcgViewer ecgCase={ecgCase} />
        </Card>
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

function EcgViewer({ ecgCase }: { ecgCase: ApiECGCase }) {
  const imageUrl = absoluteUrl(ecgCase.imagePath ?? ecgCase.originalFileUrl ?? ecgCase.files.find((file) => file.mimeType.startsWith("image/"))?.downloadUrl);
  const pdfUrl = absoluteUrl(ecgCase.pdfPath ?? ecgCase.files.find((file) => file.mimeType.includes("pdf"))?.downloadUrl);
  if (imageUrl) {
    return (
      <ScrollView horizontal maximumZoomScale={3} minimumZoomScale={1} style={styles.viewerScroll}>
        <Image resizeMode="contain" source={{ uri: imageUrl }} style={styles.ecgImage} />
      </ScrollView>
    );
  }
  if (pdfUrl) {
    return <PrimaryButton label="Open ECG PDF" onPress={() => openUrl(pdfUrl)} />;
  }
  return <EmptyState title="No ECG file" message="Upload the original ECG image/PDF from the Upload ECG workflow." />;
}

function absoluteUrl(path?: string) {
  if (!path) return undefined;
  if (path.startsWith("http")) return path;
  return `${API_URL.replace(/\/api$/, "")}${path}`;
}

function openUrl(url: string) {
  if (Platform.OS === "web" && typeof window !== "undefined") window.open(url, "_blank");
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
  ecgImage: { backgroundColor: "#020617", borderRadius: 14, height: 420, width: 760 },
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
  viewer: { flex: 1.5, gap: 12, minWidth: 360 },
  viewerScroll: { borderRadius: 14, maxHeight: 440 },
});
