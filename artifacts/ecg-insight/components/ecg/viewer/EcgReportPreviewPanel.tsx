import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React, { memo, useEffect, useState } from "react";
import { Platform, ScrollView, StyleSheet, Text, View } from "react-native";

import { Badge, formatDate, medicalTheme, PrimaryButton, SectionHeader } from "@/components/enterprise/EnterpriseUI";
import {
  downloadReportPdf,
  generateReport,
  listReports,
  reportHtmlUrl,
  type ClinicalReport,
} from "@/services/reports";

function ReportPreviewFrame({ htmlUrl, token }: { htmlUrl: string; token: string }) {
  const [frameSrc, setFrameSrc] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return undefined;
    let active = true;
    let objectUrl: string | null = null;
    void (async () => {
      try {
        const response = await fetch(htmlUrl, {
          credentials: "include",
          headers: { authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error(`Report preview failed (${response.status})`);
        const html = await response.text();
        objectUrl = URL.createObjectURL(new Blob([html], { type: "text/html" }));
        if (active) setFrameSrc(objectUrl);
      } catch (fetchError) {
        if (active) setError(fetchError instanceof Error ? fetchError.message : "Unable to load report preview.");
      }
    })();
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [htmlUrl, token]);

  if (Platform.OS !== "web") {
    return <Text style={styles.muted}>Report HTML preview is available on web.</Text>;
  }
  if (error) return <Text style={styles.muted}>{error}</Text>;
  if (!frameSrc) return <Text style={styles.muted}>Loading report preview…</Text>;

  return (
    <iframe
      src={frameSrc}
      style={{ backgroundColor: "#fff", border: "1px solid #1E3A4A", borderRadius: 10, flex: 1, minHeight: 480, width: "100%" }}
      title="ECG Clinical Report Preview"
    />
  );
}

export const EcgReportPreviewPanel = memo(function EcgReportPreviewPanel({
  accessToken,
  caseId,
  caseNumber,
  patientName,
}: {
  accessToken?: string | null;
  caseId: string;
  caseNumber?: string;
  patientName?: string;
}) {
  const queryClient = useQueryClient();
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);

  const reportsQuery = useQuery({
    enabled: !!accessToken && !!caseId,
    queryFn: async () => {
      const params = new URLSearchParams({ caseId, pageSize: "10" });
      return listReports(accessToken!, params);
    },
    queryKey: ["ecg-workspace-reports", accessToken, caseId],
    retry: false,
  });

  const generateMutation = useMutation({
    mutationFn: () => generateReport(accessToken!, caseId),
    onSuccess: async (payload) => {
      setSelectedReportId(payload.report.id);
      await queryClient.invalidateQueries({ queryKey: ["ecg-workspace-reports", accessToken, caseId] });
    },
  });

  const reports = reportsQuery.data?.reports ?? [];
  const activeReport: ClinicalReport | undefined =
    reports.find((item) => item.id === selectedReportId) ?? reports[0];

  const exportPdf = async () => {
    if (!accessToken || !activeReport || Platform.OS !== "web") return;
    const blob = await downloadReportPdf(accessToken, activeReport.id);
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank", "noopener,noreferrer");
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  return (
    <View style={styles.root} testID="sprint19-report-preview-panel">
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>Clinical Report Preview</Text>
          <Text style={styles.subtitle}>
            {patientName ?? "Patient"} · Case {caseNumber ?? caseId}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <PrimaryButton
            disabled={generateMutation.isPending}
            label={generateMutation.isPending ? "Generating…" : "Generate Report"}
            onPress={() => generateMutation.mutate()}
            variant="primary"
          />
          {activeReport ? (
            <PrimaryButton label="Download PDF" onPress={() => void exportPdf()} variant="outline" />
          ) : null}
        </View>
      </View>

      {reportsQuery.isLoading ? <Text style={styles.muted}>Loading reports…</Text> : null}

      {reports.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.reportRow}>
          {reports.map((report) => {
            const active = report.id === activeReport?.id;
            return (
              <View key={report.id} style={[styles.reportChip, active && styles.reportChipActive]}>
                <Text style={styles.reportChipTitle}>{report.reportNumber}</Text>
                <Text style={styles.reportChipMeta}>{formatDate(report.reportingDate)}</Text>
                <Badge label={report.status} tone={report.status === "signed" ? "success" : "warning"} />
                <PrimaryButton label={active ? "Selected" : "Preview"} onPress={() => setSelectedReportId(report.id)} variant="outline" />
              </View>
            );
          })}
        </ScrollView>
      ) : (
        <View style={styles.empty}>
          <SectionHeader title="No report yet" subtitle="Generate a structured clinical report for this ECG case." />
          <PrimaryButton
            disabled={generateMutation.isPending}
            label={generateMutation.isPending ? "Generating…" : "Generate Clinical Report"}
            onPress={() => generateMutation.mutate()}
          />
        </View>
      )}

      {activeReport ? (
        <View style={styles.previewBlock}>
          <View style={styles.metaGrid}>
            <Meta label="Report" value={activeReport.reportNumber} />
            <Meta label="Physician" value={activeReport.physicianName} />
            <Meta label="Status" value={activeReport.status} />
            <Meta label="Severity" value={activeReport.severityClassification ?? "Pending"} />
            <Meta label="Rhythm" value={activeReport.rhythmInterpretation ?? "Pending"} />
            <Meta label="Impression" value={activeReport.finalPhysicianImpression ?? activeReport.aiFindings ?? "Pending"} />
          </View>
          {accessToken ? (
            <ReportPreviewFrame htmlUrl={reportHtmlUrl(activeReport.id)} token={accessToken} />
          ) : (
            <Text style={styles.muted}>Authentication required for HTML preview.</Text>
          )}
        </View>
      ) : null}
    </View>
  );
});

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metaItem}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { gap: 12, padding: 16 },
  header: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: 12, justifyContent: "space-between" },
  headerActions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  headerText: { flex: 1, gap: 4, minWidth: 220 },
  metaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    paddingBottom: 10,
  },
  metaItem: {
    backgroundColor: "rgba(12,26,45,0.92)",
    borderColor: medicalTheme.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 2,
    minWidth: 160,
    padding: 8,
  },
  metaLabel: { color: medicalTheme.muted, fontSize: 10, fontWeight: "800" },
  metaValue: { color: medicalTheme.text, fontSize: 12, fontWeight: "700" },
  muted: { color: medicalTheme.muted, fontSize: 12, fontWeight: "700" },
  previewBlock: { flex: 1, gap: 8, minHeight: 520 },
  reportChip: {
    backgroundColor: "rgba(12,26,45,0.92)",
    borderColor: medicalTheme.border,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
    minWidth: 180,
    padding: 10,
  },
  reportChipActive: { borderColor: medicalTheme.primary },
  reportChipMeta: { color: medicalTheme.muted, fontSize: 11, fontWeight: "700" },
  reportChipTitle: { color: medicalTheme.text, fontSize: 13, fontWeight: "900" },
  reportRow: { gap: 10, paddingVertical: 4 },
  root: {
    backgroundColor: "#040E1A",
    borderColor: medicalTheme.border,
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    gap: 10,
    minHeight: 520,
    padding: 12,
  },
  subtitle: { color: medicalTheme.muted, fontSize: 12, fontWeight: "700" },
  title: { color: medicalTheme.primary, fontSize: 16, fontWeight: "900" },
});
