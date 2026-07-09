import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { Badge, Card, EmptyState, Field, formatDate, medicalTheme, PageSection, PrimaryButton, SectionHeader } from "@/components/enterprise/EnterpriseUI";
import type { HistoryScreenContract } from "@/types/screens/history";

const statusOptions = ["all", "uploaded", "processing", "ai_completed", "under_review", "approved", "rejected", "finalized"] as const;
const severityOptions = ["all", "normal", "abnormal", "critical"] as const;

type Props = {
  contract: HistoryScreenContract;
  onNewCase: () => void;
};

/** Legacy presentation — replaced by Bolt History screen on import. Presentation only; no API calls. */
export function EcgCasesLegacyPresentation({ contract, onNewCase }: Props) {
  const { actions, data } = contract;

  return (
    <PageSection>
      <Card style={styles.hero}>
        <View style={styles.heroText}>
          <SectionHeader title="ECG Case Management" subtitle="Enterprise workflow for upload, AI analysis, doctor review, approval, and final reports." />
        </View>
        <PrimaryButton label="+ New ECG Case" onPress={onNewCase} />
      </Card>

      <Card style={styles.filters}>
        <Field label="Search" onChangeText={actions.onSetQuery} placeholder="Search case, patient, diagnosis, MRN..." value={data.filters.query} />
        <View style={styles.actions}>
          {statusOptions.map((item) => (
            <PrimaryButton key={item} label={item.replace(/_/g, " ")} onPress={() => actions.onSetStatus(item)} variant={data.filters.status === item ? "primary" : "outline"} />
          ))}
        </View>
        <View style={styles.actions}>
          {severityOptions.map((item) => (
            <PrimaryButton key={item} label={item} onPress={() => actions.onSetSeverity(item)} variant={data.filters.severity === item ? "primary" : "outline"} />
          ))}
        </View>
      </Card>

      <Card style={styles.table}>
        <SectionHeader title="ECG Case List" subtitle="Case ID, patient, measurements, severity, AI status, doctor status, and actions." />
        {contract.status === "loading" ? <Text style={styles.muted}>Loading ECG cases...</Text> : null}
        {contract.status !== "loading" && !data.cases.length ? (
          <EmptyState title="No ECG cases" message="Create or upload an ECG case to start the clinical workflow." action={<PrimaryButton label="+ New ECG Case" onPress={onNewCase} />} />
        ) : null}
        {data.cases.map((item) => (
          <View key={item.id} style={styles.row}>
            <View style={styles.rowMain}>
              <Text style={styles.rowTitle}>{item.caseNumber ?? item.caseId}</Text>
              <Text style={styles.rowMeta}>{item.patientLabel} • {formatDate(item.acquisitionDate ?? item.uploadDate)} • HR {item.heartRate ?? "N/A"} • {item.rhythm ?? item.ecgType}</Text>
            </View>
            <Badge label={item.severity ?? "normal"} tone={item.severity === "critical" ? "critical" : item.severity === "abnormal" ? "warning" : "success"} />
            <Badge label={item.aiStatus.replace(/_/g, " ")} tone={item.aiStatus === "completed" ? "success" : "primary"} />
            <Badge label={doctorStatus(item.status)} tone={item.status === "rejected" ? "critical" : item.status === "approved" || item.status === "finalized" ? "success" : "warning"} />
            <View style={styles.actions}>
              <PrimaryButton label="Open" onPress={() => actions.onOpenCase(item.id)} variant="outline" />
              <PrimaryButton label="AI" onPress={() => actions.onAnalyze(item.id)} variant="outline" />
              <PrimaryButton label="Approve" onPress={() => actions.onApprove(item.id)} variant="outline" />
              <PrimaryButton label="Reject" onPress={() => actions.onReject(item.id)} variant="danger" />
              <PrimaryButton label="Report" onPress={() => actions.onReport(item.id)} variant="outline" />
              {item.status === "uploaded" ? <PrimaryButton label="Process" onPress={() => actions.onProcess(item.id)} variant="outline" /> : null}
            </View>
          </View>
        ))}
      </Card>
    </PageSection>
  );
}

function doctorStatus(status: string) {
  if (status === "approved") return "Approved";
  if (status === "rejected") return "Rejected";
  if (status === "finalized") return "Finalized";
  if (status === "under_review" || status === "reviewed") return "Under Review";
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
