import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Badge, Card, EmptyState, Field, formatDate, medicalTheme, PageSection, PrimaryButton, SectionHeader } from "@/components/enterprise/EnterpriseUI";
import { useAuth } from "@/context/AuthContext";
import { createReport, archiveReport, finalizeReport, listReports, signReport, type ClinicalReport } from "@/services/reports";

type ReportStatus = "all" | ClinicalReport["status"];
const statuses: ReportStatus[] = ["all", "draft", "under_review", "finalized", "signed", "archived"];

export default function ReportsIndexScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { authToken } = useAuth();
  const token = authToken?.token;
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ReportStatus>("all");
  const [caseId, setCaseId] = useState("");
  const [patientId, setPatientId] = useState("");
  const [reportType, setReportType] = useState<"ecg_case" | "manual" | "patient">("ecg_case");
  const [doctorInterpretation, setDoctorInterpretation] = useState("");
  const [recommendations, setRecommendations] = useState("");
  const [wizardOpen, setWizardOpen] = useState(false);
  const [message, setMessage] = useState("");

  const reportsQuery = useQuery({
    enabled: !!token,
    queryFn: () => {
      const params = new URLSearchParams({ pageSize: "20" });
      if (search.trim()) params.set("q", search.trim());
      if (status !== "all") params.set("status", status);
      return listReports(token!, params);
    },
    queryKey: ["enterprise-reports", token, search, status],
    retry: false,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["enterprise-reports", token] });
  const generateMutation = useMutation({
    mutationFn: () => createReport(token!, {
      caseId: reportType === "ecg_case" ? caseId.trim() : undefined,
      doctorInterpretation,
      patientId: reportType !== "ecg_case" ? patientId.trim() : undefined,
      recommendations,
      reportType,
    }),
    onSuccess: () => {
      setCaseId("");
      setPatientId("");
      setDoctorInterpretation("");
      setRecommendations("");
      setWizardOpen(false);
      setMessage("Report created successfully.");
      return invalidate();
    },
  });
  const finalizeMutation = useMutation({ mutationFn: (id: string) => finalizeReport(token!, id), onSuccess: invalidate });
  const signMutation = useMutation({ mutationFn: (id: string) => signReport(token!, id), onSuccess: invalidate });
  const archiveMutation = useMutation({ mutationFn: (id: string) => archiveReport(token!, id), onSuccess: invalidate });

  const reports = reportsQuery.data?.reports ?? [];

  return (
    <PageSection>
      <Card style={styles.controls}>
        <SectionHeader title="Reports Workflow" subtitle="Create, edit, finalize, sign, export, and email clinical reports." />
        <View style={styles.grid}>
          <Field label="Search" onChangeText={setSearch} placeholder="Patient, report number, physician..." value={search} />
        </View>
        <View style={styles.filterRow}>
          {statuses.map((item) => <PrimaryButton key={item} label={item} onPress={() => setStatus(item)} variant={status === item ? "primary" : "outline"} />)}
          <PrimaryButton icon="file-plus" label="Create Report" onPress={() => setWizardOpen((value) => !value)} />
        </View>
        {message ? <Text style={styles.success}>{message}</Text> : null}
      </Card>

      {wizardOpen ? (
        <Card style={styles.controls}>
          <SectionHeader title="Report Wizard" subtitle="Generate from ECG case, patient, or manual clinical report." />
          <View style={styles.filterRow}>
            {(["ecg_case", "patient", "manual"] as const).map((item) => (
              <PrimaryButton key={item} label={item.replace("_", " ")} onPress={() => setReportType(item)} variant={reportType === item ? "primary" : "outline"} />
            ))}
          </View>
          <View style={styles.grid}>
            {reportType === "ecg_case" ? <Field label="ECG Case ID" onChangeText={setCaseId} placeholder="Case UUID or case number" value={caseId} /> : null}
            {reportType !== "ecg_case" ? <Field label="Patient ID" onChangeText={setPatientId} placeholder="Patient UUID" value={patientId} /> : null}
            <Field label="Doctor Interpretation" onChangeText={setDoctorInterpretation} value={doctorInterpretation} />
            <Field label="Recommendations" onChangeText={setRecommendations} value={recommendations} />
          </View>
          <PrimaryButton
            disabled={generateMutation.isPending || (reportType === "ecg_case" ? !caseId.trim() : !patientId.trim())}
            icon="file-plus"
            label={generateMutation.isPending ? "Creating..." : "Create Draft Report"}
            onPress={() => generateMutation.mutate()}
          />
        </Card>
      ) : null}

      <Card style={styles.table}>
        <SectionHeader title="Clinical Reports" />
        {reportsQuery.isLoading ? <Text style={styles.muted}>Loading reports...</Text> : null}
        {reportsQuery.isError ? <Text style={styles.error}>Unable to load reports.</Text> : null}
        {!reportsQuery.isLoading && !reports.length ? <EmptyState title="No reports found" message="Generate a report from a completed ECG case." /> : null}
        {reports.map((report) => (
          <View key={report.id} style={styles.reportRow}>
            <View style={styles.reportMain}>
              <Text style={styles.reportTitle}>{report.reportNumber}</Text>
              <Text style={styles.reportMeta}>{report.physicianName} • {formatDate(report.reportingDate)} • {report.severityClassification ?? "Unclassified"}</Text>
              <Text style={styles.reportMeta}>{report.finalPhysicianImpression ?? report.rhythmInterpretation ?? "Draft report awaiting physician review."}</Text>
            </View>
            <Badge label={report.status} tone={report.status === "signed" ? "success" : report.status === "under_review" ? "warning" : "primary"} />
            <View style={styles.rowActions}>
              <PrimaryButton label="Open" onPress={() => router.push(`/reports/${report.id}` as never)} variant="outline" />
              <PrimaryButton label="Finalize" onPress={() => finalizeMutation.mutate(report.id)} variant="outline" />
              <PrimaryButton label="Sign" onPress={() => signMutation.mutate(report.id)} variant="outline" />
              <PrimaryButton label="Archive" onPress={() => archiveMutation.mutate(report.id)} variant="danger" />
            </View>
          </View>
        ))}
      </Card>
    </PageSection>
  );
}

const styles = StyleSheet.create({
  controls: { gap: 14 },
  error: { color: medicalTheme.critical, fontWeight: "800" },
  filterRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  muted: { color: medicalTheme.muted, fontSize: 13, fontWeight: "700" },
  reportMain: { flex: 1, minWidth: 260 },
  reportMeta: { color: medicalTheme.muted, fontSize: 12, lineHeight: 18 },
  reportRow: { alignItems: "center", borderBottomColor: medicalTheme.border, borderBottomWidth: 1, flexDirection: "row", flexWrap: "wrap", gap: 12, paddingVertical: 12 },
  reportTitle: { color: medicalTheme.text, fontSize: 15, fontWeight: "900" },
  rowActions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  success: { color: medicalTheme.success, fontSize: 13, fontWeight: "900" },
  table: { gap: 10 },
});
