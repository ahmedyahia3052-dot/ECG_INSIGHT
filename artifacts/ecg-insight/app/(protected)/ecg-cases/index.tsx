import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Badge, Card, EmptyState, Field, formatDate, medicalTheme, PageSection, patientDisplayName, PrimaryButton, SectionHeader } from "@/components/enterprise/EnterpriseUI";
import { useAuth } from "@/context/AuthContext";
import { analyzeCase } from "@/services/ai";
import { approveCase, listCases, rejectCase, updateCaseStatus, type ApiECGCase } from "@/services/clinical";
import { generateReport } from "@/services/reports";

type StatusFilter = "all" | ApiECGCase["status"];
type SeverityFilter = "all" | NonNullable<ApiECGCase["severity"]>;

const statusOptions: StatusFilter[] = ["all", "uploaded", "processing", "ai_completed", "under_review", "approved", "rejected", "finalized"];
const severityOptions: SeverityFilter[] = ["all", "normal", "abnormal", "critical"];

export default function EcgCasesScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { authToken } = useAuth();
  const token = authToken?.token;
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [severity, setSeverity] = useState<SeverityFilter>("all");

  const params = useMemo(() => {
    const next = new URLSearchParams({ pageSize: "50" });
    if (query.trim()) next.set("q", query.trim());
    if (status !== "all") next.set("status", status);
    if (severity !== "all") next.set("severity", severity);
    return next;
  }, [query, severity, status]);

  const casesQuery = useQuery({
    enabled: !!token,
    queryFn: () => listCases(token!, params),
    queryKey: ["enterprise-ecg-cases", token, params.toString()],
    retry: false,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["enterprise-ecg-cases", token] });
  const analyzeMutation = useMutation({ mutationFn: (id: string) => analyzeCase(token!, id), onSuccess: invalidate });
  const approveMutation = useMutation({ mutationFn: (id: string) => approveCase(token!, id), onSuccess: invalidate });
  const rejectMutation = useMutation({ mutationFn: (id: string) => rejectCase(token!, id, { reason: "Rejected from ECG Case Management." }), onSuccess: invalidate });
  const reportMutation = useMutation({ mutationFn: (id: string) => generateReport(token!, id), onSuccess: invalidate });
  const processingMutation = useMutation({ mutationFn: (id: string) => updateCaseStatus(token!, id, "processing"), onSuccess: invalidate });

  const cases = casesQuery.data?.cases ?? [];

  return (
    <PageSection>
      <Card style={styles.hero}>
        <View style={styles.heroText}>
          <SectionHeader title="ECG Case Management" subtitle="Enterprise workflow for upload, AI analysis, doctor review, approval, and final reports." />
        </View>
        <PrimaryButton label="+ New ECG Case" onPress={() => router.push("/ecg-cases/new" as never)} />
      </Card>

      <Card style={styles.filters}>
        <Field label="Search" onChangeText={setQuery} placeholder="Search case, patient, diagnosis, MRN..." value={query} />
        <View style={styles.actions}>
          {statusOptions.map((item) => <PrimaryButton key={item} label={item.replace(/_/g, " ")} onPress={() => setStatus(item)} variant={status === item ? "primary" : "outline"} />)}
        </View>
        <View style={styles.actions}>
          {severityOptions.map((item) => <PrimaryButton key={item} label={item} onPress={() => setSeverity(item)} variant={severity === item ? "primary" : "outline"} />)}
        </View>
      </Card>

      <Card style={styles.table}>
        <SectionHeader title="ECG Case List" subtitle="Case ID, patient, measurements, severity, AI status, doctor status, and actions." />
        {casesQuery.isLoading ? <Text style={styles.muted}>Loading ECG cases...</Text> : null}
        {!casesQuery.isLoading && !cases.length ? <EmptyState title="No ECG cases" message="Create or upload an ECG case to start the clinical workflow." action={<PrimaryButton label="+ New ECG Case" onPress={() => router.push("/ecg-cases/new" as never)} />} /> : null}
        {cases.map((item) => (
          <View key={item.id} style={styles.row}>
            <View style={styles.rowMain}>
              <Text style={styles.rowTitle}>{item.caseNumber ?? item.caseId}</Text>
              <Text style={styles.rowMeta}>{patientDisplayName(item.patient)} • {formatDate(item.acquisitionDate ?? item.uploadDate)} • HR {item.heartRate ?? "N/A"} • {item.rhythm ?? item.ecgType}</Text>
            </View>
            <Badge label={item.severity ?? "normal"} tone={item.severity === "critical" ? "critical" : item.severity === "abnormal" ? "warning" : "success"} />
            <Badge label={item.aiStatus.replace(/_/g, " ")} tone={item.aiStatus === "completed" ? "success" : "primary"} />
            <Badge label={doctorStatus(item)} tone={item.status === "rejected" ? "critical" : item.status === "approved" || item.status === "finalized" ? "success" : "warning"} />
            <View style={styles.actions}>
              <PrimaryButton label="Open" onPress={() => router.push(`/ecg-cases/${item.id}` as never)} variant="outline" />
              <PrimaryButton label="Review" onPress={() => router.push(`/ecg-cases/${item.id}/review` as never)} variant="outline" />
              <PrimaryButton label="AI" onPress={() => analyzeMutation.mutate(item.id)} variant="outline" />
              <PrimaryButton label="Approve" onPress={() => approveMutation.mutate(item.id)} variant="outline" />
              <PrimaryButton label="Reject" onPress={() => rejectMutation.mutate(item.id)} variant="danger" />
              <PrimaryButton label="Report" onPress={() => reportMutation.mutate(item.id)} variant="outline" />
              {item.status === "uploaded" ? <PrimaryButton label="Process" onPress={() => processingMutation.mutate(item.id)} variant="outline" /> : null}
            </View>
          </View>
        ))}
      </Card>
    </PageSection>
  );
}

function doctorStatus(item: ApiECGCase) {
  if (item.status === "approved") return "Approved";
  if (item.status === "rejected") return "Rejected";
  if (item.status === "finalized") return "Finalized";
  if (item.status === "under_review" || item.status === "reviewed") return "Under Review";
  return "Pending Review";
}

const styles = StyleSheet.create({
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  filters: { gap: 12 },
  hero: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: 16 },
  heroText: { flex: 1, minWidth: 260 },
  muted: { color: medicalTheme.muted, fontSize: 13, fontWeight: "700" },
  row: { alignItems: "center", borderBottomColor: medicalTheme.border, borderBottomWidth: 1, flexDirection: "row", flexWrap: "wrap", gap: 12, paddingVertical: 12 },
  rowMain: { flex: 1, minWidth: 260 },
  rowMeta: { color: medicalTheme.muted, fontSize: 12, fontWeight: "700", marginTop: 4 },
  rowTitle: { color: medicalTheme.text, fontSize: 15, fontWeight: "900" },
  table: { gap: 8 },
});
