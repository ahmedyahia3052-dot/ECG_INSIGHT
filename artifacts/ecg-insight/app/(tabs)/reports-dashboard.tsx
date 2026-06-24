import { ScrollView, StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WorkflowCrudPanel } from "@/components/workflows/WorkflowCrudPanel";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { archiveReport, generateReport, listReports, updateReport, type ClinicalReport } from "@/services/reports";

export default function ReportsDashboardScreen() {
  const colors = useColors();
  const { authToken } = useAuth();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>Reports Dashboard</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Physician report generation, review, finalization, retrieval, archival, and digital ECG export from linked cases.
        </Text>
        <WorkflowCrudPanel<ClinicalReport>
          createFields={[{ key: "caseId", label: "Case ID" }]}
          createItem={(input) => generateReport(authToken!.token, input.caseId)}
          deleteItem={(id) => archiveReport(authToken!.token, id)}
          detailText={(report) => `${report.status} · ${report.physicianName} · ${report.finalPhysicianImpression ?? "No final impression"}`}
          emptyText="No reports match the current search and filters. Generate a report from a reviewed ECG case."
          filters={[{ key: "status", label: "Status", options: [
            { label: "Draft", value: "draft" },
            { label: "Under review", value: "under_review" },
            { label: "Finalized", value: "finalized" },
            { label: "Signed", value: "signed" },
          ] }]}
          itemsFromResponse={(response) => (response as { reports?: ClinicalReport[] } | undefined)?.reports ?? []}
          listItems={(params) => listReports(authToken!.token, params)}
          queryKey={["clinical-reports", authToken?.token]}
          searchPlaceholder="Search reports by number, physician, patient, or case"
          subtitle="Create from case, edit draft content, inspect details, and archive reports."
          title="Reports"
          titleForItem={(report) => report.reportNumber}
          updateFields={[
            { key: "clinicalIndication", label: "Clinical indication" },
            { key: "rhythmInterpretation", label: "Rhythm interpretation" },
            { key: "finalPhysicianImpression", label: "Final physician impression" },
            { key: "severityClassification", label: "Severity classification" },
          ]}
          updateItem={(id, input) => updateReport(authToken!.token, id, input)}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { gap: 14, padding: 20, paddingBottom: 120 },
  subtitle: { fontSize: 14, lineHeight: 20 },
  title: { fontSize: 28, fontWeight: "800" },
});
