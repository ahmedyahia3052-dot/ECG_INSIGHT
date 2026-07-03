import { useQuery } from "@tanstack/react-query";
import React, { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Badge, Card, EmptyState, formatDate, medicalTheme, PageSection, patientDisplayName, PrimaryButton, SectionHeader } from "@/components/enterprise/EnterpriseUI";
import { CaseCollaborationPanel } from "@/components/collaboration/CaseCollaborationPanel";
import { EcgAiDiagnosisPanel } from "@/components/ecg/EcgAiDiagnosisPanel";
import { EcgInterpretationPanel } from "@/components/ecg/EcgInterpretationPanel";
import { EcgMeasurementPanel } from "@/components/ecg/EcgMeasurementPanel";
import { EcgProViewer } from "@/components/ecg/EcgProViewer";
import { useAuth } from "@/context/AuthContext";
import { getAIExplainability, getAIResult } from "@/services/ai";
import { getCase, getPatient, getPatientEcgHistory } from "@/services/clinical";
import { getDigitalECG } from "@/services/ecgProcessing";
import { API_URL } from "@/services/api";
import { useLocalSearchParams, useRouter } from "expo-router";

export default function ClinicalWorkspaceScreen() {
  const { caseId } = useLocalSearchParams<{ caseId: string }>();
  const router = useRouter();
  const { authToken } = useAuth();
  const token = authToken?.token;
  const [panel, setPanel] = useState<"ai" | "measurements" | "notes" | "timeline">("ai");

  const caseQuery = useQuery({ enabled: !!token && !!caseId, queryFn: () => getCase(token!, caseId!), queryKey: ["clinical-workspace-case", token, caseId] });
  const patientQuery = useQuery({
    enabled: !!token && !!caseQuery.data?.case.patientId,
    queryFn: () => getPatient(token!, caseQuery.data!.case.patientId),
    queryKey: ["clinical-workspace-patient", token, caseQuery.data?.case.patientId],
  });
  const historyQuery = useQuery({
    enabled: !!token && !!caseQuery.data?.case.patientId,
    queryFn: () => getPatientEcgHistory(token!, caseQuery.data!.case.patientId),
    queryKey: ["clinical-workspace-history", token, caseQuery.data?.case.patientId],
  });
  const analysisQuery = useQuery({ enabled: !!token && !!caseId, queryFn: () => getAIResult(token!, caseId!), queryKey: ["clinical-workspace-ai", token, caseId] });
  const explainabilityQuery = useQuery({ enabled: !!token && !!caseId, queryFn: () => getAIExplainability(token!, caseId!), queryKey: ["clinical-workspace-explainability", token, caseId] });
  const digitalEcgQuery = useQuery({ enabled: !!token && !!caseId, queryFn: () => getDigitalECG(token!, caseId!), queryKey: ["clinical-workspace-digital", token, caseId] });

  const ecgCase = caseQuery.data?.case;
  const patient = patientQuery.data?.patient;
  const previousImageUrl = useMemo(() => {
    const cases = historyQuery.data?.cases ?? [];
    const prior = cases.find((item) => item.id !== ecgCase?.id);
    const path = prior?.imagePath ?? prior?.ecgImage;
    if (!path) return undefined;
    return path.startsWith("http") ? path : `${API_URL.replace(/\/api$/, "")}${path}`;
  }, [ecgCase?.id, historyQuery.data?.cases]);

  if (caseQuery.isLoading) return <Text style={styles.muted}>Loading clinical workspace...</Text>;
  if (!ecgCase || !patient) return <EmptyState title="Clinical workspace unavailable" message="Select a valid ECG case to open the unified clinical workspace." />;

  return (
    <PageSection>
      <Card style={styles.header}>
        <SectionHeader title="Clinical Workspace" subtitle={`${patientDisplayName(patient)} • ${ecgCase.caseNumber ?? ecgCase.caseId}`} />
        <View style={styles.headerActions}>
          <PrimaryButton label="Open Review" onPress={() => router.push(`/ecg-cases/${ecgCase.id}/review` as never)} variant="outline" />
          <PrimaryButton label="Patient Profile" onPress={() => router.push(`/patients/${patient.id}` as never)} variant="outline" />
        </View>
      </Card>

      <View style={styles.split}>
        <Card style={styles.patientPane}>
          <SectionHeader title="Patient" subtitle="Demographics, risk factors, and clinical context." />
          <Info label="MRN" value={patient.medicalRecordNumber} />
          <Info label="Age / Gender" value={`${patient.age}y • ${patient.gender}`} />
          <Info label="Hospital" value={patient.company ?? ecgCase.hospitalName ?? "Not recorded"} />
          <Info label="Hypertension" value={patient.hypertension ? "Yes" : "No"} />
          <Info label="Diabetes" value={patient.diabetes ? "Yes" : "No"} />
          <Info label="Smoking" value={patient.smokingStatus ?? "unknown"} />
          <Info label="Previous MI" value={patient.previousMI ? "Yes" : "No"} />
          <Info label="Previous PCI/CABG" value={[patient.previousPCI ? "PCI" : null, patient.previousCABG ? "CABG" : null].filter(Boolean).join(", ") || "None"} />
          <Info label="Medications" value={patient.medications ?? "None recorded"} />
          <Info label="Allergies" value={patient.knownAllergies ?? patient.allergies ?? "None recorded"} />
          <Info label="Notes" value={patient.notes ?? "None recorded"} />
        </Card>

        <Card style={styles.viewerPane}>
          <EcgProViewer
            analysis={analysisQuery.data?.analysis}
            digitalEcg={digitalEcgQuery.data?.digitalEcg}
            ecgCase={ecgCase}
            explainability={explainabilityQuery.data?.explainability}
            previousImageUrl={previousImageUrl}
          />
        </Card>
      </View>

      <View style={styles.panelTabs}>
        {(["ai", "measurements", "notes", "timeline"] as const).map((item) => (
          <PrimaryButton key={item} label={item.toUpperCase()} onPress={() => setPanel(item)} variant={panel === item ? "primary" : "outline"} />
        ))}
      </View>

      {panel === "ai" ? (
        <View style={styles.panelGrid}>
          {digitalEcgQuery.data?.digitalEcg.interpretationEngine ? <EcgInterpretationPanel interpretation={digitalEcgQuery.data.digitalEcg.interpretationEngine} /> : null}
          {digitalEcgQuery.data?.digitalEcg.aiDiagnosis ? <EcgAiDiagnosisPanel diagnosis={digitalEcgQuery.data.digitalEcg.aiDiagnosis} /> : null}
        </View>
      ) : null}
      {panel === "measurements" && digitalEcgQuery.data?.digitalEcg.measurementEngine ? (
        <EcgMeasurementPanel measurements={digitalEcgQuery.data.digitalEcg.measurementEngine} />
      ) : null}
      {panel === "notes" && token ? <CaseCollaborationPanel accessToken={token} caseId={ecgCase.id} defaultAssigneeId={ecgCase.assignedDoctorId} /> : null}
      {panel === "timeline" ? (
        <Card style={styles.timelinePane}>
          <SectionHeader title="ECG Timeline" subtitle="Compare current study with prior ECGs for this patient." />
          {(historyQuery.data?.cases ?? []).map((item) => (
            <View key={item.id} style={styles.timelineRow}>
              <Text style={styles.timelineTitle}>{formatDate(item.uploadDate)} • {item.caseNumber ?? item.caseId}</Text>
              <Text style={styles.timelineMeta}>{item.hospitalName ?? patient.company ?? "Hospital N/A"} • Dr {item.reviewedBy?.name ?? item.assignedDoctor?.name ?? "Unassigned"}</Text>
              <Text style={styles.timelineMeta}>Reason: {item.clinicalIndication ?? item.clinicalNotes ?? item.ecgType}</Text>
              <Text style={styles.timelineMeta}>AI: {item.aiDiagnosis ?? "Pending"} • Final: {item.finalDiagnosis ?? item.doctorDiagnosis ?? "Pending"} • {item.severity ?? "normal"}</Text>
              <PrimaryButton label={item.id === ecgCase.id ? "Current" : "Compare"} onPress={() => router.push(`/clinical-workspace/${item.id}` as never)} variant="outline" />
            </View>
          ))}
        </Card>
      ) : null}
    </PageSection>
  );
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
  header: { gap: 8 },
  headerActions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  info: { borderBottomColor: medicalTheme.border, borderBottomWidth: 1, gap: 4, paddingVertical: 8 },
  infoLabel: { color: medicalTheme.muted, fontSize: 12, fontWeight: "800" },
  infoValue: { color: medicalTheme.text, fontSize: 14, fontWeight: "800" },
  muted: { color: medicalTheme.muted },
  panelGrid: { gap: 14 },
  panelTabs: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  patientPane: { flex: 1, gap: 6, minWidth: 280 },
  split: { flexDirection: "row", flexWrap: "wrap", gap: 14 },
  timelineMeta: { color: medicalTheme.muted, fontSize: 12 },
  timelinePane: { gap: 10 },
  timelineRow: { borderBottomColor: medicalTheme.border, borderBottomWidth: 1, gap: 4, paddingVertical: 10 },
  timelineTitle: { color: medicalTheme.text, fontSize: 14, fontWeight: "900" },
  viewerPane: { flex: 2, gap: 8, minWidth: 320 },
});
