import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { Badge, Card, EmptyState, formatDate, medicalTheme, PrimaryButton, SectionHeader } from "@/components/enterprise/EnterpriseUI";
import {
  acquireCaseLock,
  createCaseAssignment,
  createCaseNote,
  getCaseCollaborationState,
  releaseCaseLock,
  sendCaseDiscussionMessage,
  updateCasePresence,
  updateCollaborationCaseStatus,
  type CollaborationAssignmentType,
  type CollaborationCaseStatus,
} from "@/services/collaboration";

type Props = {
  accessToken: string;
  caseId: string;
  defaultAssigneeId?: string;
};

const workflowStatuses: CollaborationCaseStatus[] = [
  "NEW",
  "UNDER_REVIEW",
  "AWAITING_SECOND_OPINION",
  "ESCALATED",
  "FINALIZED",
  "SIGNED",
  "ARCHIVED",
];

export function CaseCollaborationPanel({ accessToken, caseId, defaultAssigneeId }: Props) {
  const queryClient = useQueryClient();
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [assigneeId, setAssigneeId] = useState(defaultAssigneeId ?? "");

  const queryKey = ["case-collaboration", accessToken, caseId];
  const collaborationQuery = useQuery({
    enabled: !!accessToken && !!caseId,
    queryFn: () => getCaseCollaborationState(accessToken, caseId),
    queryKey,
    refetchInterval: 10_000,
  });

  const refresh = async () => queryClient.invalidateQueries({ queryKey });

  useEffect(() => {
    if (!accessToken || !caseId) return;
    updateCasePresence(accessToken, caseId, { currentSection: "case-detail", status: "ONLINE" }).catch(() => undefined);
    return () => {
      updateCasePresence(accessToken, caseId, { currentSection: "case-detail", status: "OFFLINE" }).catch(() => undefined);
    };
  }, [accessToken, caseId]);

  const noteMutation = useMutation({
    mutationFn: () => createCaseNote(accessToken, caseId, { plainText: note, richText: note }),
    onSuccess: async () => {
      setNote("");
      await refresh();
    },
  });
  const messageMutation = useMutation({
    mutationFn: () => sendCaseDiscussionMessage(accessToken, caseId, { body: message, title: "Internal case discussion" }),
    onSuccess: async () => {
      setMessage("");
      await refresh();
    },
  });
  const assignMutation = useMutation({
    mutationFn: (type: CollaborationAssignmentType) => createCaseAssignment(accessToken, caseId, { assignedToId: assigneeId, type }),
    onSuccess: refresh,
  });
  const statusMutation = useMutation({ mutationFn: (status: CollaborationCaseStatus) => updateCollaborationCaseStatus(accessToken, caseId, { status }), onSuccess: refresh });
  const lockMutation = useMutation({ mutationFn: () => acquireCaseLock(accessToken, caseId, { resource: "clinical-review", ttlSeconds: 300 }), onSuccess: refresh });
  const releaseMutation = useMutation({ mutationFn: (lockId: string) => releaseCaseLock(accessToken, caseId, lockId), onSuccess: refresh });

  const state = collaborationQuery.data;
  const locks = (state?.locks ?? []) as Array<{ id: string; resource?: string; user?: { name?: string } }>;
  const presence = (state?.presence ?? []) as Array<{ id: string; currentSection?: string; lastActivityAt: string; status: string; user?: { name?: string; role?: string } }>;
  const notes = (state?.notes ?? []) as Array<{ id: string; plainText?: string; richText: string; version: number; author?: { name?: string } }>;
  const activities = (state?.activities ?? []) as Array<{ id: string; createdAt: string; title: string; type: string; actor?: { name?: string } }>;
  const threads = (state?.threads ?? []) as Array<{ id: string; messages?: Array<{ id: string; body: string; author?: { name?: string }; replies?: unknown[] }> }>;
  const assignments = (state?.assignments ?? []) as Array<{ id: string; type: string; status: string; assignedTo?: { name?: string }; assignedBy?: { name?: string } }>;

  return (
    <Card style={styles.panel}>
      <SectionHeader title="Real-Time Collaboration Workspace" />
      {collaborationQuery.isLoading ? <Text style={styles.muted}>Loading collaboration state...</Text> : null}
      {!state && !collaborationQuery.isLoading ? <EmptyState title="Collaboration unavailable" message="Unable to load live case collaboration data." /> : null}

      <View style={styles.grid}>
        <View style={styles.column}>
          <SectionHeader title="Active Users" />
          {presence.length === 0 ? <Text style={styles.muted}>No active collaborators yet.</Text> : null}
          {presence.map((item) => (
            <View key={item.id} style={styles.row}>
              <Badge label={item.status.toLowerCase()} tone={item.status === "ONLINE" ? "success" : "primary"} />
              <Text style={styles.body}>{item.user?.name ?? "Clinical user"} · {item.user?.role ?? "role"} · {formatDate(item.lastActivityAt)}</Text>
            </View>
          ))}

          <SectionHeader title="Soft Locks" />
          <View style={styles.actions}>
            <PrimaryButton label="Lock Review" onPress={() => lockMutation.mutate()} variant="outline" />
          </View>
          {locks.map((lock) => (
            <View key={lock.id} style={styles.row}>
              <Text style={styles.body}>{lock.resource ?? "case"} locked by {lock.user?.name ?? "collaborator"}</Text>
              <PrimaryButton label="Release" onPress={() => releaseMutation.mutate(lock.id)} variant="outline" />
            </View>
          ))}
        </View>

        <View style={styles.column}>
          <SectionHeader title="Clinical Notes" />
          <TextInput
            multiline
            onChangeText={setNote}
            placeholder="Add rich clinical note, @mention colleagues..."
            placeholderTextColor={medicalTheme.muted}
            style={styles.input}
            value={note}
          />
          <PrimaryButton disabled={!note.trim()} label="Add Note" onPress={() => noteMutation.mutate()} />
          {notes.slice(0, 4).map((item) => (
            <View key={item.id} style={styles.item}>
              <Text style={styles.body}>{item.plainText ?? item.richText}</Text>
              <Text style={styles.muted}>v{item.version} · {item.author?.name ?? "Clinical author"}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.grid}>
        <View style={styles.column}>
          <SectionHeader title="Discussion Thread" />
          <TextInput
            multiline
            onChangeText={setMessage}
            placeholder="Post secure internal discussion, replies, attachments notes..."
            placeholderTextColor={medicalTheme.muted}
            style={styles.input}
            value={message}
          />
          <PrimaryButton disabled={!message.trim()} label="Send Message" onPress={() => messageMutation.mutate()} />
          {threads.flatMap((thread) => thread.messages ?? []).slice(0, 5).map((item) => (
            <View key={item.id} style={styles.item}>
              <Text style={styles.body}>{item.body}</Text>
              <Text style={styles.muted}>{item.author?.name ?? "Collaborator"} · replies {(item.replies ?? []).length}</Text>
            </View>
          ))}
        </View>

        <View style={styles.column}>
          <SectionHeader title="Assignments & Workflow" />
          <TextInput
            onChangeText={setAssigneeId}
            placeholder="Doctor / reviewer user ID"
            placeholderTextColor={medicalTheme.muted}
            style={styles.input}
            value={assigneeId}
          />
          <View style={styles.actions}>
            <PrimaryButton disabled={!assigneeId} label="Assign" onPress={() => assignMutation.mutate("PRIMARY_REVIEW")} variant="outline" />
            <PrimaryButton disabled={!assigneeId} label="Second Opinion" onPress={() => assignMutation.mutate("SECOND_OPINION")} variant="outline" />
            <PrimaryButton disabled={!assigneeId} label="Escalate" onPress={() => assignMutation.mutate("ESCALATION")} variant="danger" />
          </View>
          {assignments.slice(0, 4).map((item) => (
            <Text key={item.id} style={styles.body}>{item.type.replace(/_/g, " ")} · {item.assignedTo?.name ?? "Assignee"} · {item.status}</Text>
          ))}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.actions}>
              {workflowStatuses.map((status) => (
                <PrimaryButton key={status} label={status.replace(/_/g, " ")} onPress={() => statusMutation.mutate(status)} variant="outline" />
              ))}
            </View>
          </ScrollView>
        </View>
      </View>

      <View style={styles.column}>
        <SectionHeader title="Activity Timeline" />
        {activities.slice(0, 8).map((item) => (
          <View key={item.id} style={styles.row}>
            <Badge label={item.type.replace(/_/g, " ")} tone="primary" />
            <Text style={styles.body}>{item.title} · {item.actor?.name ?? "System"} · {formatDate(item.createdAt)}</Text>
          </View>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  body: { color: medicalTheme.text, flex: 1, fontSize: 13, fontWeight: "800", lineHeight: 20 },
  column: { flex: 1, gap: 10, minWidth: 300 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 16 },
  input: {
    backgroundColor: medicalTheme.surface,
    borderColor: medicalTheme.border,
    borderRadius: 14,
    borderWidth: 1,
    color: medicalTheme.text,
    fontSize: 13,
    fontWeight: "700",
    minHeight: 48,
    padding: 12,
  },
  item: { backgroundColor: medicalTheme.surface, borderRadius: 14, gap: 4, padding: 12 },
  muted: { color: medicalTheme.muted, fontSize: 12, fontWeight: "700" },
  panel: { gap: 16 },
  row: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: 8 },
});
