import React from "react";
import { StyleSheet, Text } from "react-native";
import { WorkflowCrudPanel } from "@/components/workflows/WorkflowCrudPanel";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { archiveReport, generateReport, listReports, updateReport, type ClinicalReport } from "@/services/reports";
import { BoltCard, BoltHero, BoltScreen } from "@/components/bolt/BoltUI";

export default function ReportsDashboardScreen() {
  const colors = useColors();
  const { authToken } = useAuth();

  return (
    <BoltScreen>
      <BoltHero
        eyebrow="Clinical documentation"
        subtitle="Generate and manage real medical reports from existing ECG cases. The Bolt visual shell preserves the current live report API workflow."
        title="Reports"
      />
      <BoltCard style={styles.notice}>
        <Text style={[styles.noticeText, { color: colors.textSecondary }]}>
          Create reports from reviewed cases, update draft content, and archive reports through the existing backend.
        </Text>
      </BoltCard>
      <WorkflowCrudPanel<ClinicalReport>
        createFields={[{ key: "caseId", label: "Case ID" }]}
        createItem={(input) => generateReport(authToken!.token, input.caseId)}
        deleteItem={(id) => archiveReport(authToken!.token, id)}
        detailText={(report) => `${report.status} · ${report.physicianName} · ${report.finalPhysicianImpression ?? "No final impression"}`}
        emptyText="No live reports match the current search and filters."
        filters={[
          {
            key: "status",
            label: "Status",
            options: [
              { label: "Draft", value: "draft" },
              { label: "Under review", value: "under_review" },
              { label: "Finalized", value: "finalized" },
              { label: "Signed", value: "signed" },
            ],
          },
        ]}
        itemsFromResponse={(response) => (response as { reports?: ClinicalReport[] } | undefined)?.reports ?? []}
        listItems={(params) => listReports(authToken!.token, params)}
        queryKey={["bolt-clinical-reports", authToken?.token]}
        searchPlaceholder="Search live reports by number, physician, patient, or case"
        subtitle="Live report generation, editing, filtering, and archiving."
        title="Live Reports"
        titleForItem={(report) => report.reportNumber}
        updateFields={[
          { key: "clinicalIndication", label: "Clinical indication" },
          { key: "rhythmInterpretation", label: "Rhythm interpretation" },
          { key: "finalPhysicianImpression", label: "Final physician impression" },
          { key: "severityClassification", label: "Severity classification" },
        ]}
        updateItem={(id, input) => updateReport(authToken!.token, id, input)}
      />
    </BoltScreen>
  );
}

const styles = StyleSheet.create({
  notice: { gap: 8 },
  noticeText: { fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 20 },
});
