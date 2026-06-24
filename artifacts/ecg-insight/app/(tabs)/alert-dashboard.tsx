import { ScrollView, StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WorkflowCrudPanel } from "@/components/workflows/WorkflowCrudPanel";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { createAlert, deleteAlert, listAlerts, updateAlert } from "@/services/collaboration";

type AlertItem = Record<string, unknown> & { id: string; message?: string; priority?: string; status?: string; title?: string };

export default function AlertDashboardScreen() {
  const colors = useColors();
  const { authToken } = useAuth();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>Alert Dashboard</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Critical ECG, high-risk worker, pending review, expiring certificate, and security incident alerts.</Text>
        <WorkflowCrudPanel<AlertItem>
          createFields={[
            { key: "title", label: "Title" },
            { key: "message", label: "Message" },
            { key: "category", label: "Category", placeholder: "CRITICAL_ECG, HIGH_RISK_WORKER, PENDING_REVIEW, EXPIRING_CERTIFICATE, SECURITY_INCIDENT" },
            { key: "priority", label: "Priority", placeholder: "LOW, MEDIUM, HIGH, or CRITICAL" },
            { key: "patientId", label: "Patient ID" },
            { key: "caseId", label: "Case ID" },
            { key: "userId", label: "Target User ID" },
          ]}
          createItem={(input) => createAlert(authToken!.token, { ...input, priority: input.priority || "HIGH" })}
          deleteItem={(id) => deleteAlert(authToken!.token, id)}
          detailText={(alert) => `${alert.status ?? "OPEN"} · ${alert.priority ?? "HIGH"} · ${alert.message ?? ""}`}
          emptyText="No active alerts match the current search and filters."
          filters={[{ key: "status", label: "Status", options: [
            { label: "Open", value: "OPEN" },
            { label: "Acknowledged", value: "ACKNOWLEDGED" },
            { label: "Resolved", value: "RESOLVED" },
          ] }]}
          itemsFromResponse={(response) => (response as { alerts?: AlertItem[] } | undefined)?.alerts ?? []}
          listItems={(params) => listAlerts(authToken!.token, params)}
          queryKey={["central-alerts", authToken?.token]}
          searchPlaceholder="Search alerts by title, category, patient, or case"
          subtitle="Create, update, acknowledge, resolve, inspect, and delete clinical alerts."
          title="Alerts"
          titleForItem={(alert) => alert.title ?? "Untitled alert"}
          updateFields={[
            { key: "title", label: "Title" },
            { key: "message", label: "Message" },
            { key: "priority", label: "Priority" },
            { key: "status", label: "Status", placeholder: "OPEN, ACKNOWLEDGED, or RESOLVED" },
          ]}
          updateItem={(id, input) => updateAlert(authToken!.token, id, input)}
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
