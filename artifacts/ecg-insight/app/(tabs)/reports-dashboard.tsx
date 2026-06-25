import { Feather } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import {
  archiveReport,
  downloadReportPdf,
  finalizeReport,
  generateReport,
  listReports,
  signReport,
  updateReport,
  type ClinicalReport,
} from "@/services/reports";
import { BoltBadge, BoltButton, BoltCard, BoltEmpty, BoltField, BoltHero, BoltScreen } from "@/components/bolt/BoltUI";
import { PremiumRefreshControl, SkeletonList, useToast } from "@/components/interaction/PremiumInteraction";

type ReportStatus = "all" | ClinicalReport["status"];

const statusOptions: ReportStatus[] = ["all", "draft", "under_review", "finalized", "signed", "archived"];

function statusTone(status: ClinicalReport["status"]) {
  if (status === "signed" || status === "finalized") return "success";
  if (status === "archived") return "muted";
  if (status === "under_review") return "warning";
  return "primary";
}

export default function ReportsDashboardScreen() {
  const colors = useColors();
  const queryClient = useQueryClient();
  const toast = useToast();
  const { authToken } = useAuth();
  const token = authToken?.token;
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ReportStatus>("all");
  const [page, setPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);
  const [caseId, setCaseId] = useState("");
  const [editing, setEditing] = useState<ClinicalReport | null>(null);
  const [editForm, setEditForm] = useState({
    clinicalIndication: "",
    finalPhysicianImpression: "",
    rhythmInterpretation: "",
    severityClassification: "",
  });

  useEffect(() => {
    if (__DEV__) console.info("[route-mount] ReportsPage", { page, search, status });
  }, [page, search, status]);

  const queryKey = useMemo(() => ["reports", token, page, search, status], [page, search, status, token]);
  const reportsQuery = useQuery({
    enabled: !!token,
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), pageSize: "10" });
      if (search.trim()) params.set("q", search.trim());
      if (status !== "all") params.set("status", status);
      return listReports(token!, params);
    },
    queryKey,
    retry: false,
  });

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ["reports", token] });
  };

  const generateMutation = useMutation({
    mutationFn: async () => generateReport(token!, caseId.trim()),
    onSuccess: async () => {
      setCaseId("");
      toast.success("Report generated", "A clinical report was generated from the ECG case.");
      await invalidate();
    },
    onError: (error) => toast.error("Report generation failed", error instanceof Error ? error.message : "Request failed."),
  });

  const updateMutation = useMutation({
    mutationFn: async () => updateReport(token!, editing!.id, editForm),
    onSuccess: async () => {
      setEditing(null);
      toast.success("Report updated", "The report draft was saved.");
      await invalidate();
    },
    onError: (error) => toast.error("Report update failed", error instanceof Error ? error.message : "Request failed."),
  });

  const actionMutation = useMutation({
    mutationFn: async ({ action, reportId }: { action: "archive" | "finalize" | "sign"; reportId: string }) => {
      if (action === "archive") return archiveReport(token!, reportId);
      if (action === "finalize") return finalizeReport(token!, reportId);
      return signReport(token!, reportId);
    },
    onSuccess: async (_payload, variables) => {
      toast.success("Report updated", `Report ${variables.action} action completed.`);
      await invalidate();
    },
    onError: (error) => toast.error("Report action failed", error instanceof Error ? error.message : "Request failed."),
  });

  const reports = reportsQuery.data?.reports ?? [];
  const total = reportsQuery.data?.total ?? reports.length;
  const totalPages = reportsQuery.data?.totalPages ?? 1;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await reportsQuery.refetch();
    setRefreshing(false);
  }, [reportsQuery]);

  const startEdit = (report: ClinicalReport) => {
    setEditing(report);
    setEditForm({
      clinicalIndication: report.clinicalIndication ?? "",
      finalPhysicianImpression: report.finalPhysicianImpression ?? "",
      rhythmInterpretation: report.rhythmInterpretation ?? "",
      severityClassification: report.severityClassification ?? "",
    });
  };

  const confirmArchive = (report: ClinicalReport) => {
    const perform = () => actionMutation.mutate({ action: "archive", reportId: report.id });
    if (typeof window !== "undefined" && typeof window.confirm === "function") {
      if (window.confirm(`Archive ${report.reportNumber}?`)) perform();
      return;
    }
    Alert.alert("Archive report", `Archive ${report.reportNumber}?`, [
      { style: "cancel", text: "Cancel" },
      { onPress: perform, style: "destructive", text: "Archive" },
    ]);
  };

  const openPdf = async (report: ClinicalReport) => {
    if (!token) return;
    if (typeof window === "undefined") {
      toast.info("PDF available", "Use the web app to open the generated PDF report.");
      return;
    }
    const blob = await downloadReportPdf(token, report.id);
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank", "noopener,noreferrer");
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  return (
    <BoltScreen refreshControl={<PremiumRefreshControl onRefresh={onRefresh} refreshing={refreshing} />}>
      <BoltHero
        eyebrow="Clinical documentation"
        subtitle="Generate, search, edit, finalize, sign, archive, and retrieve real backend clinical reports."
        title="Reports"
      />

      <BoltCard style={styles.generator}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Generate Report From Case</Text>
        <View style={styles.generatorRow}>
          <View style={styles.caseField}>
            <BoltField icon="activity" onChangeText={setCaseId} placeholder="ECG case ID" value={caseId} />
          </View>
          <BoltButton
            disabled={!caseId.trim()}
            icon="file-plus"
            label={generateMutation.isPending ? "Generating..." : "Create Report"}
            loading={generateMutation.isPending}
            onPress={() => generateMutation.mutate()}
          />
        </View>
      </BoltCard>

      <BoltCard style={styles.filters}>
        <BoltField
          icon="search"
          onChangeText={(value) => {
            setSearch(value);
            setPage(1);
          }}
          placeholder="Search by report number, physician, patient, case, or impression..."
          value={search}
        />
        <View style={styles.filterRow}>
          {statusOptions.map((item) => (
            <View key={item} style={styles.filterButton}>
              <BoltButton
                label={item.replace("_", " ").replace(/^\w/, (char) => char.toUpperCase())}
                onPress={() => {
                  setStatus(item);
                  setPage(1);
                }}
                variant={status === item ? "primary" : "outline"}
              />
            </View>
          ))}
        </View>
      </BoltCard>

      {editing ? (
        <BoltCard style={styles.editor}>
          <View style={styles.cardHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Edit {editing.reportNumber}</Text>
            <BoltBadge label={editing.status} tone={statusTone(editing.status)} />
          </View>
          <BoltField icon="clipboard" multiline onChangeText={(value) => setEditForm((current) => ({ ...current, clinicalIndication: value }))} placeholder="Clinical indication" value={editForm.clinicalIndication} />
          <BoltField icon="activity" multiline onChangeText={(value) => setEditForm((current) => ({ ...current, rhythmInterpretation: value }))} placeholder="Rhythm interpretation" value={editForm.rhythmInterpretation} />
          <BoltField icon="edit-3" multiline onChangeText={(value) => setEditForm((current) => ({ ...current, finalPhysicianImpression: value }))} placeholder="Final physician impression" value={editForm.finalPhysicianImpression} />
          <BoltField icon="alert-triangle" onChangeText={(value) => setEditForm((current) => ({ ...current, severityClassification: value }))} placeholder="Severity classification" value={editForm.severityClassification} />
          <View style={styles.actions}>
            <BoltButton label={updateMutation.isPending ? "Saving..." : "Save Report"} loading={updateMutation.isPending} onPress={() => updateMutation.mutate()} />
            <BoltButton label="Cancel" onPress={() => setEditing(null)} variant="outline" />
          </View>
        </BoltCard>
      ) : null}

      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {reportsQuery.isLoading ? "Loading reports..." : `${total} reports`}
        </Text>
        <Text style={[styles.pageText, { color: colors.textSecondary }]}>Page {page} of {Math.max(totalPages, 1)}</Text>
      </View>

      {reportsQuery.isError ? (
        <BoltEmpty title="Reports unavailable" message="Unable to load reports from the backend." />
      ) : reportsQuery.isLoading ? (
        <SkeletonList count={4} />
      ) : reports.length === 0 ? (
        <BoltEmpty title="No reports found" message="Generate a report from a reviewed ECG case or adjust filters." />
      ) : (
        reports.map((report) => (
          <BoltCard key={report.id} style={styles.reportCard}>
            <View style={styles.cardHeader}>
              <View style={styles.reportTitle}>
                <Text style={[styles.reportNumber, { color: colors.text }]}>{report.reportNumber}</Text>
                <Text style={[styles.meta, { color: colors.textSecondary }]}>
                  {report.physicianName} · {report.reportingDate?.slice(0, 10) ?? report.updatedAt.slice(0, 10)}
                </Text>
              </View>
              <BoltBadge label={report.status.replace("_", " ")} tone={statusTone(report.status)} />
            </View>
            <Text style={[styles.meta, { color: colors.textSecondary }]}>Case {report.caseId} · Patient {report.patientId}</Text>
            <Text style={[styles.impression, { color: colors.text }]}>{report.finalPhysicianImpression ?? "No final impression recorded."}</Text>
            <View style={styles.actions}>
              <BoltButton label="Edit" onPress={() => startEdit(report)} variant="outline" />
              <BoltButton label="Finalize" onPress={() => actionMutation.mutate({ action: "finalize", reportId: report.id })} variant="outline" />
              <BoltButton label="Sign" onPress={() => actionMutation.mutate({ action: "sign", reportId: report.id })} variant="outline" />
              <BoltButton label="PDF" onPress={() => void openPdf(report)} variant="ghost" />
              <BoltButton label="Archive" onPress={() => confirmArchive(report)} variant="danger" />
            </View>
          </BoltCard>
        ))
      )}

      <View style={styles.pagination}>
        <BoltButton disabled={page <= 1} label="Previous" onPress={() => setPage((current) => Math.max(1, current - 1))} variant="outline" />
        <BoltButton disabled={page >= totalPages} label="Next" onPress={() => setPage((current) => current + 1)} variant="outline" />
      </View>
    </BoltScreen>
  );
}

const styles = StyleSheet.create({
  actions: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: 8 },
  cardHeader: { alignItems: "center", flexDirection: "row", gap: 10, justifyContent: "space-between" },
  caseField: { flex: 1, minWidth: 220 },
  editor: { gap: 10 },
  filterButton: { minWidth: 110 },
  filterRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  filters: { gap: 10 },
  generator: { gap: 10 },
  generatorRow: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: 10 },
  impression: { fontFamily: "Inter_500Medium", fontSize: 13, lineHeight: 19 },
  meta: { fontFamily: "Inter_400Regular", fontSize: 12, lineHeight: 18 },
  pageText: { fontFamily: "Inter_600SemiBold", fontSize: 12 },
  pagination: { flexDirection: "row", gap: 10, justifyContent: "center" },
  reportCard: { gap: 10 },
  reportNumber: { fontFamily: "Inter_700Bold", fontSize: 16 },
  reportTitle: { flex: 1, gap: 3 },
  sectionHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 18 },
});
