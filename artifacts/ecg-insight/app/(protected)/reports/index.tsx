import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Badge, Card, EmptyState, Field, formatDate, medicalTheme, PageSection, PrimaryButton, SectionHeader } from "@/components/enterprise/EnterpriseUI";
import { useAuth } from "@/context/AuthContext";
import { createReport, deleteReport, finalizeReport, listReports, reportPdfUrl, signReport, type ClinicalReport, type ReportsResponse } from "@/services/reports";

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
  const reportsQueryKey = ["enterprise-reports", token, search, status] as const;

  const reportsQuery = useQuery({
    enabled: !!token,
    queryFn: () => {
      const params = new URLSearchParams({ pageSize: "20" });
      if (search.trim()) params.set("q", search.trim());
      if (status !== "all") params.set("status", status);
      return listReports(token!, params);
    },
    queryKey: reportsQueryKey,
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
    onError: (error) => setMessage(error instanceof Error ? error.message : "Unable to create report."),
    onSuccess: (payload) => {
      queryClient.setQueryData<ReportsResponse>(reportsQueryKey, (current) => current ? {
        ...current,
        reports: [payload.report, ...current.reports.filter((report) => report.id !== payload.report.id)],
        total: current.total + (current.reports.some((report) => report.id === payload.report.id) ? 0 : 1),
      } : current);
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
  const deleteMutation = useMutation({ mutationFn: (id: string) => deleteReport(token!, id), onSuccess: invalidate });

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
              <Text style={styles.reportTitle}>Report ID: {report.reportNumber}</Text>
              <Text style={styles.reportMeta}>Patient: {report.patientName ?? report.patientCode ?? report.patientId}</Text>
              <Text style={styles.reportMeta}>ECG Case: {report.caseNumber ?? report.caseId} • Created By: {report.physicianName} • Created: {formatDate(report.createdAt)}</Text>
              <Text style={styles.reportMeta}>{report.finalPhysicianImpression ?? report.rhythmInterpretation ?? "Draft report awaiting physician review."}</Text>
            </View>
            <Badge label={report.status} tone={report.status === "signed" ? "success" : report.status === "under_review" ? "warning" : "primary"} />
            <View style={styles.rowActions}>
              <PrimaryButton label="View" onPress={() => router.push(`/reports/${report.id}` as never)} variant="outline" />
              <PrimaryButton label="Edit" onPress={() => router.push(`/reports/${report.id}` as never)} variant="outline" />
              <PrimaryButton label="Finalize" onPress={() => finalizeMutation.mutate(report.id)} variant="outline" />
              <PrimaryButton label="Sign" onPress={() => signMutation.mutate(report.id)} variant="outline" />
              <PrimaryButton label="Print" onPress={() => openReportPdf(report.id)} variant="outline" />
              <PrimaryButton label="Export PDF" onPress={() => openReportPdf(report.id)} variant="outline" />
              <PrimaryButton label="Delete" onPress={() => deleteMutation.mutate(report.id)} variant="danger" />
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

function openReportPdf(reportId: string) {
  const url = reportPdfUrl(reportId);
  if (typeof window !== "undefined") {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}
