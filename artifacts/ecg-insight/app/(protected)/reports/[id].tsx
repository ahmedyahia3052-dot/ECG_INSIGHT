import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";

import { Badge, Card, EmptyState, Field, formatDate, medicalTheme, PageSection, PrimaryButton, SectionHeader } from "@/components/enterprise/EnterpriseUI";
import { useAuth } from "@/context/AuthContext";
import { downloadReportPdf, emailReport, finalizeReport, getReport, reportHtmlUrl, reportPrintUrl, signReport } from "@/services/reports";

export default function ReportDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { authToken, user } = useAuth();
  const token = authToken?.token;
  const [emailRecipient, setEmailRecipient] = useState(user?.email ?? "");
  const [message, setMessage] = useState("");

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
    mutationFn: () => emailReport(token!, id, { recipient: emailRecipient || user?.email || "doctor@hospital.com", message: "Clinical ECG report attached." }),
    onSuccess: () => setMessage("Report email queued securely."),
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
          <PrimaryButton label="Preview HTML" onPress={() => void openReportHtml(token, reportHtmlUrl(report.id))} variant="outline" />
          <PrimaryButton label="Download PDF" onPress={() => void openReportPdf(token, report.id, "download")} />
          <PrimaryButton label="Print" onPress={() => void openReportHtml(token, reportPrintUrl(report.id))} variant="outline" />
          <PrimaryButton label="Email" onPress={() => emailMutation.mutate()} variant="outline" />
          <PrimaryButton label="Share" onPress={() => void shareReport(report.reportNumber, report.verificationUrl)} variant="outline" />
        </View>
      </Card>
      {message ? <Card><Text style={styles.success}>{message}</Text></Card> : null}

      <View style={styles.grid}>
        <Card style={styles.panel}>
          <SectionHeader title="Report Preview" subtitle="Professional ECG report content, including AI findings, recommendations, verification and clinical disclaimer." />
          <Info label="Report ID" value={report.reportNumber} />
          <Info label="Date and Time" value={new Date(report.reportingDate).toLocaleString()} />
          <Info label="Organization" value={report.organizationName ?? "ECG Insight"} />
          <Info label="Patient" value={report.patientName ?? report.patientCode ?? report.patientId} />
          <Info label="Doctor" value={`${report.physicianName}${report.physicianLicenseNumber ? ` (${report.physicianLicenseNumber})` : ""}`} />
          <Info label="QR Verification" value={report.verificationUrl ?? "Verification link pending"} />
          {report.qrCodeData ? <Text style={styles.qrNote}>QR verification code embedded in printable HTML/PDF.</Text> : null}
        </Card>
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
        <Card style={styles.panel}>
          <SectionHeader title="Email Report" subtitle="Queue a secure report email audit event." />
          <Field label="Recipient Email" onChangeText={setEmailRecipient} value={emailRecipient} />
          <PrimaryButton disabled={emailMutation.isPending} label={emailMutation.isPending ? "Queuing..." : "Email Report"} onPress={() => emailMutation.mutate()} />
        </Card>
      </View>
    </PageSection>
  );
}

async function openReportPdf(token: string | undefined, reportId: string, mode: "download" | "preview" = "preview") {
  if (!token || Platform.OS !== "web" || typeof window === "undefined") return;
  const blob = await downloadReportPdf(token, reportId);
  const url = URL.createObjectURL(blob);
  if (mode === "download") {
    const link = document.createElement("a");
    link.href = url;
    link.download = "ecg-medical-report.pdf";
    link.click();
  } else {
    window.open(url, "_blank", "noopener,noreferrer");
  }
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

async function openReportHtml(token: string | undefined, url: string) {
  if (!token || Platform.OS !== "web" || typeof window === "undefined") return;
  const response = await fetch(url, { credentials: "include", headers: { authorization: `Bearer ${token}` } });
  const html = await response.text();
  const blobUrl = URL.createObjectURL(new Blob([html], { type: "text/html" }));
  window.open(blobUrl, "_blank", "noopener,noreferrer");
  setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
}

async function shareReport(reportNumber: string, verificationUrl?: string) {
  if (Platform.OS !== "web" || typeof window === "undefined") return;
  const url = verificationUrl ? `${window.location.origin}${verificationUrl}` : window.location.href;
  if (navigator.share) {
    await navigator.share({ title: `ECG Report ${reportNumber}`, text: "Secure ECG report verification link", url });
    return;
  }
  await navigator.clipboard?.writeText(url);
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
  qrNote: { color: medicalTheme.primary, fontSize: 12, fontWeight: "900" },
  success: { color: medicalTheme.success, fontSize: 13, fontWeight: "900" },
  title: { color: medicalTheme.text, fontSize: 30, fontWeight: "900" },
});
