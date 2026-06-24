import { ScrollView, StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WorkflowCrudPanel } from "@/components/workflows/WorkflowCrudPanel";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { createTeam, deleteConversation, deleteTeam, listConversations, listTeams, markConversationRead, sendMessage, updateTeam } from "@/services/collaboration";

type TeamItem = Record<string, unknown> & { description?: string; id: string; name?: string };
type ConversationItem = Record<string, unknown> & { id: string; messages?: Array<{ body?: string }>; title?: string };

function splitIds(value?: string) {
  return value?.split(",").map((id) => id.trim()).filter(Boolean) ?? [];
}

export default function CollaborationDashboardScreen() {
  const colors = useColors();
  const { authToken } = useAuth();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>Collaboration Dashboard</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Clinical teams, secure messaging, case discussion, and multi-review workflow.</Text>
        <WorkflowCrudPanel<TeamItem>
          createFields={[
            { key: "name", label: "Name" },
            { key: "description", label: "Description" },
            { key: "organizationId", label: "Organization ID" },
            { key: "memberIds", label: "Member IDs", placeholder: "Comma-separated user IDs" },
          ]}
          createItem={(input) => createTeam(authToken!.token, { ...input, memberIds: splitIds(input.memberIds) })}
          deleteItem={(id) => deleteTeam(authToken!.token, id)}
          detailText={(team) => team.description ?? "No description"}
          emptyText="No clinical teams are available. Create a team to coordinate ECG reviews."
          itemsFromResponse={(response) => (response as { teams?: TeamItem[] } | undefined)?.teams ?? []}
          listItems={(params) => listTeams(authToken!.token, params)}
          queryKey={["teams", authToken?.token]}
          searchPlaceholder="Search teams"
          subtitle="Create, edit, inspect, and delete clinical teams."
          title="Teams"
          titleForItem={(team) => team.name ?? "Untitled team"}
          updateFields={[
            { key: "name", label: "Name" },
            { key: "description", label: "Description" },
            { key: "memberIds", label: "Member IDs", placeholder: "Comma-separated user IDs" },
          ]}
          updateItem={(id, input) => updateTeam(authToken!.token, id, { ...input, memberIds: splitIds(input.memberIds) })}
        />
        <WorkflowCrudPanel<ConversationItem>
          createFields={[
            { key: "title", label: "Title" },
            { key: "body", label: "Message body" },
            { key: "recipientIds", label: "Recipient IDs", placeholder: "Comma-separated user IDs" },
            { key: "patientId", label: "Patient ID" },
            { key: "caseId", label: "Case ID" },
          ]}
          createItem={(input) => sendMessage(authToken!.token, { ...input, recipientIds: splitIds(input.recipientIds) })}
          deleteItem={(id) => deleteConversation(authToken!.token, id)}
          detailText={(conversation) => {
            const latest = conversation.messages?.[0]?.body ?? "No messages yet";
            return `${conversation.title ?? "Clinical discussion"} · ${latest}`;
          }}
          emptyText="No conversations found. Send a secure message to create a persisted conversation history."
          itemsFromResponse={(response) => (response as { conversations?: ConversationItem[] } | undefined)?.conversations ?? []}
          listItems={(params) => listConversations(authToken!.token, params)}
          queryKey={["conversations", authToken?.token]}
          searchPlaceholder="Search messages by title, participant, patient, or case"
          subtitle="Create messages, inspect history, mark read, and delete conversations."
          title="Messages"
          titleForItem={(conversation) => conversation.title ?? "Clinical discussion"}
          updateFields={[]}
          updateItem={(id) => markConversationRead(authToken!.token, id)}
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
