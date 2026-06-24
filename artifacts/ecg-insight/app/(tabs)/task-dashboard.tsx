import { ScrollView, StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WorkflowCrudPanel } from "@/components/workflows/WorkflowCrudPanel";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { createTask, deleteTask, listTasks, updateTask } from "@/services/collaboration";

type TaskItem = Record<string, unknown> & { id: string; priority?: string; status?: string; title?: string };

export default function TaskDashboardScreen() {
  const colors = useColors();
  const { authToken } = useAuth();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>Task Dashboard</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>ECG reviews, consultation assignments, due dates, comments, and status tracking.</Text>
        <WorkflowCrudPanel<TaskItem>
          createFields={[
            { key: "title", label: "Title" },
            { key: "description", label: "Description" },
            { key: "priority", label: "Priority", placeholder: "LOW, MEDIUM, HIGH, or CRITICAL" },
            { key: "patientId", label: "Patient ID" },
            { key: "caseId", label: "Case ID" },
            { key: "assignedUserId", label: "Assigned User ID" },
          ]}
          createItem={(input) => createTask(authToken!.token, { ...input, priority: input.priority || "MEDIUM" })}
          deleteItem={(id) => deleteTask(authToken!.token, id)}
          detailText={(task) => `${task.status ?? "OPEN"} · ${task.priority ?? "MEDIUM"} · ${task.description ?? "No description"}`}
          emptyText="No tasks match the current search and filters. Create a review task to assign ECG follow-up work."
          filters={[{ key: "status", label: "Status", options: [
            { label: "Open", value: "OPEN" },
            { label: "In progress", value: "IN_PROGRESS" },
            { label: "Completed", value: "COMPLETED" },
          ] }]}
          itemsFromResponse={(response) => (response as { tasks?: TaskItem[] } | undefined)?.tasks ?? []}
          listItems={(params) => listTasks(authToken!.token, params)}
          queryKey={["clinical-tasks", authToken?.token]}
          searchPlaceholder="Search tasks by title, assignee, patient, or case"
          subtitle="Create, assign, edit, complete, and delete clinical tasks."
          title="Tasks"
          titleForItem={(task) => task.title ?? "Untitled task"}
          updateFields={[
            { key: "title", label: "Title" },
            { key: "description", label: "Description" },
            { key: "priority", label: "Priority" },
            { key: "status", label: "Status", placeholder: "OPEN, IN_PROGRESS, COMPLETED, or CANCELLED" },
            { key: "assignedUserId", label: "Assigned User ID" },
          ]}
          updateItem={(id, input) => updateTask(authToken!.token, id, input)}
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
