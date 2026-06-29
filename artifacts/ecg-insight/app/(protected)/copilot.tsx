import { Feather } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";

import { Badge, Card, EmptyState, medicalTheme, PageSection, PrimaryButton, SectionHeader } from "@/components/enterprise/EnterpriseUI";
import { useAuth } from "@/context/AuthContext";
import { listCases, listPatients } from "@/services/clinical";
import {
  archiveCopilotConversation,
  createCopilotConversation,
  deleteCopilotConversation,
  duplicateCopilotConversation,
  getCopilotConversation,
  listCopilotConversations,
  restoreCopilotConversation,
  streamCopilotMessage,
  updateCopilotConversation,
  type CopilotConversation,
  type CopilotMessage,
  type CopilotTag,
} from "@/services/copilot";

type WorkspacePrompt = {
  label: string;
  prompt: string;
  tag: CopilotTag;
};

const QUICK_ACTIONS: WorkspacePrompt[] = [
  { label: "Interpret ECG", prompt: "Interpret the selected ECG using available patient, case, report, document, and clinical note context.", tag: "ECG Interpretation" },
  { label: "Generate Impression", prompt: "Generate a concise physician-ready ECG impression with confidence and clinical disclaimer.", tag: "ECG Interpretation" },
  { label: "Patient Summary", prompt: "Summarize patient demographics, previous ECGs, uploaded documents, reports, and clinical notes.", tag: "Clinical Summary" },
  { label: "Differential Diagnosis", prompt: "Provide a focused differential diagnosis with supporting ECG and clinical context.", tag: "Differential Diagnosis" },
  { label: "Occupational Fitness", prompt: "Assess occupational fitness and restrictions using the current ECG and patient context.", tag: "Occupational Fitness" },
  { label: "Follow-up Plan", prompt: "Create a practical follow-up plan with escalation criteria and referral indications.", tag: "Follow-up" },
];

export default function CopilotRoute() {
  return <CopilotWorkspaceScreen />;
}

export function CopilotWorkspaceScreen({ routeConversationId }: { routeConversationId?: string }) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const streamAbort = useRef<AbortController | null>(null);
  const { width } = useWindowDimensions();
  const { authToken, user } = useAuth();
  const token = authToken?.token;
  const [conversationSearch, setConversationSearch] = useState("");
  const [draft, setDraft] = useState("");
  const [renameTitle, setRenameTitle] = useState("");
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [streamingMessage, setStreamingMessage] = useState("");
  const [status, setStatus] = useState("");

  const isMobile = width < 760;
  const conversationsQuery = useQuery({
    enabled: !!token,
    queryFn: () => listCopilotConversations(token!, conversationSearch),
    queryKey: ["copilot-workspace-conversations", token, conversationSearch],
    retry: false,
  });
  const selectedQuery = useQuery({
    enabled: !!token && !!selectedId,
    queryFn: () => getCopilotConversation(token!, selectedId!),
    queryKey: ["copilot-workspace-conversation", token, selectedId],
    retry: false,
  });
  const casesQuery = useQuery({
    enabled: !!token,
    queryFn: () => listCases(token!, new URLSearchParams({ pageSize: "1" })),
    queryKey: ["copilot-workspace-context-case", token],
    retry: false,
  });
  const patientsQuery = useQuery({
    enabled: !!token,
    queryFn: () => listPatients(token!, new URLSearchParams({ pageSize: "1" })),
    queryKey: ["copilot-workspace-context-patient", token],
    retry: false,
  });

  const conversations = conversationsQuery.data?.conversations ?? [];
  const messages = selectedQuery.data?.messages ?? [];
  const selectedConversation = conversations.find((item) => item.id === selectedId) ?? selectedQuery.data?.conversation;
  const currentCase = casesQuery.data?.cases[0];
  const currentPatient = patientsQuery.data?.patients[0] ?? currentCase?.patient;

  const groupedConversations = useMemo(() => ({
    archived: conversations.filter((item) => !!item.archivedAt),
    favorites: conversations.filter((item) => item.isFavorite && !item.archivedAt),
    pinned: conversations.filter((item) => item.isPinned && !item.archivedAt),
    recent: conversations.filter((item) => !item.isPinned && !item.isFavorite && !item.archivedAt),
  }), [conversations]);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["copilot-workspace-conversations", token] });
    if (selectedId) void queryClient.invalidateQueries({ queryKey: ["copilot-workspace-conversation", token, selectedId] });
  };

  const createMutation = useMutation({
    mutationFn: () => createCopilotConversation(token!, {
      caseId: currentCase?.id,
      contextType: currentCase ? "case" : currentPatient ? "patient" : "global",
      patientId: currentPatient?.id,
      tag: "ECG Interpretation",
      title: "New clinical copilot conversation",
    }),
    onSuccess: (payload) => {
      setSelectedId(payload.conversation.id);
      setRenameTitle(payload.conversation.title);
      router.push(`/copilot/${payload.conversation.id}` as never);
      invalidate();
    },
  });
  const renameMutation = useMutation({
    mutationFn: () => updateCopilotConversation(token!, selectedId!, { title: renameTitle.trim() || "Clinical copilot conversation" }),
    onSuccess: (payload) => {
      setRenameTitle(payload.conversation.title);
      invalidate();
    },
  });
  const deleteMutation = useMutation({
    mutationFn: () => deleteCopilotConversation(token!, selectedId!),
    onSuccess: () => {
      setSelectedId(undefined);
      setRenameTitle("");
      router.replace("/copilot" as never);
      invalidate();
    },
  });
  const pinMutation = useMutation({
    mutationFn: () => updateCopilotConversation(token!, selectedId!, { isPinned: !selectedConversation?.isPinned }),
    onSuccess: invalidate,
  });
  const favoriteMutation = useMutation({
    mutationFn: () => updateCopilotConversation(token!, selectedId!, { isFavorite: !selectedConversation?.isFavorite }),
    onSuccess: invalidate,
  });
  const archiveMutation = useMutation({
    mutationFn: () => archiveCopilotConversation(token!, selectedId!),
    onSuccess: () => {
      router.replace("/copilot" as never);
      setSelectedId(undefined);
      invalidate();
    },
  });
  const restoreMutation = useMutation({
    mutationFn: () => restoreCopilotConversation(token!, selectedId!),
    onSuccess: (payload) => {
      setSelectedId(payload.conversation.id);
      router.push(`/copilot/${payload.conversation.id}` as never);
      invalidate();
    },
  });
  const duplicateMutation = useMutation({
    mutationFn: () => duplicateCopilotConversation(token!, selectedId!),
    onSuccess: (payload) => {
      setSelectedId(payload.conversation.id);
      setRenameTitle(payload.conversation.title);
      router.push(`/copilot/${payload.conversation.id}` as never);
      invalidate();
    },
  });
  const sendMutation = useMutation({
    mutationFn: async (input: WorkspacePrompt | { prompt: string; tag: CopilotTag }) => {
      const controller = new AbortController();
      streamAbort.current = controller;
      setStatus("Analyzing clinical context...");
      setStreamingMessage("");
      let finalConversation: CopilotConversation | undefined;
      await streamCopilotMessage(token!, {
        caseId: currentCase?.id,
        contextPath: "/copilot",
        contextType: currentCase ? "case" : currentPatient ? "patient" : "global",
        conversationId: selectedId,
        patientId: currentPatient?.id,
        question: input.prompt,
        tag: input.tag,
      }, (event) => {
        if (event.type === "status") setStatus(event.status ?? "");
        if (event.type === "token" && event.token) setStreamingMessage((current) => `${current}${event.token}`);
        if (event.conversation) {
          finalConversation = event.conversation;
          setSelectedId(event.conversation.id);
          setRenameTitle(event.conversation.title);
          router.replace(`/copilot/${event.conversation.id}` as never);
        }
      }, controller.signal);
      return finalConversation;
    },
    onSuccess: () => {
      setDraft("");
      setStatus("");
      setStreamingMessage("");
      streamAbort.current = null;
      invalidate();
    },
  });

  useEffect(() => {
    restoreConversationFromRoute();
  }, [restoreConversationFromRoute]);

  useEffect(() => {
    if (!routeConversationId && selectedId) setSelectedId(undefined);
  }, [routeConversationId, selectedId]);

  useEffect(() => {
    if (selectedQuery.isError && routeConversationId) safeRouteFallback();
  }, [routeConversationId, safeRouteFallback, selectedQuery.isError]);

  useEffect(() => {
    if (selectedConversation) setRenameTitle(selectedConversation.title);
  }, [selectedConversation]);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages.length, streamingMessage]);

  function sendPrompt(prompt: string, tag: CopilotTag) {
    const trimmed = prompt.trim();
    if (!trimmed || !token || sendMutation.isPending) return;
    sendMutation.mutate({ prompt: trimmed, tag });
  }

  function loadConversationById(conversationId: string) {
    setSelectedId(conversationId);
  }

  function restoreConversationFromRoute() {
    if (routeConversationId && routeConversationId !== selectedId) loadConversationById(routeConversationId);
  }

  function safeRouteFallback() {
    setSelectedId(undefined);
    router.replace("/copilot" as never);
  }

  return (
    <PageSection style={styles.page}>
      <Card style={styles.hero}>
        <View style={styles.heroCopy}>
          <Text style={styles.kicker}>Enterprise AI Workspace</Text>
          <Text style={styles.title}>AI Clinical Copilot</Text>
          <Text style={styles.subtitle}>Database-backed medical chat workspace for ECG interpretation, clinical summaries, occupational fitness, and report drafting.</Text>
        </View>
        <View style={styles.heroActions}>
          <PrimaryButton icon="plus" label="Create Conversation" onPress={() => createMutation.mutate()} />
          <PrimaryButton disabled={!selectedId || renameMutation.isPending} icon="edit-3" label="Rename Conversation" onPress={() => renameMutation.mutate()} variant="outline" />
          <PrimaryButton disabled={!selectedId || pinMutation.isPending} icon="map-pin" label={selectedConversation?.isPinned ? "Unpin" : "Pin"} onPress={() => pinMutation.mutate()} variant="outline" />
          <PrimaryButton disabled={!selectedId || favoriteMutation.isPending} icon="star" label={selectedConversation?.isFavorite ? "Unfavorite" : "Favorite"} onPress={() => favoriteMutation.mutate()} variant="outline" />
          <PrimaryButton disabled={!selectedId || duplicateMutation.isPending} icon="copy" label="Duplicate" onPress={() => duplicateMutation.mutate()} variant="outline" />
          {selectedConversation?.archivedAt ? (
            <PrimaryButton disabled={!selectedId || restoreMutation.isPending} icon="corner-up-left" label="Restore" onPress={() => restoreMutation.mutate()} variant="outline" />
          ) : (
            <PrimaryButton disabled={!selectedId || archiveMutation.isPending} icon="archive" label="Archive" onPress={() => archiveMutation.mutate()} variant="outline" />
          )}
          <PrimaryButton disabled={!selectedId || deleteMutation.isPending} icon="trash-2" label="Delete Conversation" onPress={() => deleteMutation.mutate()} variant="danger" />
        </View>
      </Card>

      <View style={[styles.workspace, isMobile && styles.workspaceMobile]}>
        <Card style={[styles.sidebar, isMobile && styles.sidebarMobile]}>
          <SectionHeader title="Conversations" subtitle="Persistent database-backed history." />
          <TextInput
            onChangeText={setConversationSearch}
            placeholder="Search conversations..."
            placeholderTextColor={medicalTheme.muted}
            style={styles.searchInput}
            value={conversationSearch}
          />
          <ConversationGroup conversations={groupedConversations.pinned} onSelect={(id) => router.push(`/copilot/${id}` as never)} selectedId={selectedId} title="Pinned" />
          <ConversationGroup conversations={groupedConversations.favorites} onSelect={(id) => router.push(`/copilot/${id}` as never)} selectedId={selectedId} title="Favorites" />
          <ConversationGroup conversations={groupedConversations.recent} onSelect={(id) => router.push(`/copilot/${id}` as never)} selectedId={selectedId} title="Recent" />
          <ConversationGroup conversations={groupedConversations.archived} onSelect={(id) => router.push(`/copilot/${id}` as never)} selectedId={selectedId} title="Archive" />
        </Card>

        <Card style={styles.chatPanel}>
          <View style={styles.chatHeader}>
            <View style={styles.chatHeaderMain}>
              <TextInput
                onChangeText={setRenameTitle}
                placeholder="Conversation title"
                placeholderTextColor={medicalTheme.muted}
                style={styles.titleInput}
                value={renameTitle}
              />
              <Text style={styles.chatMeta}>{selectedConversation?.tag ?? "ECG Interpretation"} • {messages.length} messages</Text>
            </View>
            <Badge label={sendMutation.isPending ? "Streaming" : "Ready"} tone={sendMutation.isPending ? "warning" : "success"} />
          </View>

          <View style={styles.quickChips}>
            {QUICK_ACTIONS.map((action) => (
              <Pressable
                accessibilityRole="button"
                disabled={sendMutation.isPending}
                key={action.label}
                onPress={() => sendPrompt(action.prompt, action.tag)}
                style={[styles.quickChip, sendMutation.isPending && styles.disabled]}
              >
                <Text style={styles.quickChipText}>{action.label}</Text>
              </Pressable>
            ))}
          </View>

          <ScrollView contentContainerStyle={styles.messageList} ref={scrollRef} style={styles.messages}>
            {!selectedId && !messages.length ? (
              <EmptyState title="Start the workspace" message="Create a conversation or send a quick action to persist a new medical copilot chat." />
            ) : null}
            {messages.map((message) => <MessageCard key={message.id} message={message} />)}
            {status && !streamingMessage ? <Text style={styles.statusText}>{status}</Text> : null}
            {streamingMessage ? <MessageCard message={{ citations: [], content: streamingMessage, createdAt: new Date().toISOString(), id: "streaming", role: "assistant" }} /> : null}
          </ScrollView>

          <View style={styles.composer}>
            <TextInput
              multiline
              onChangeText={setDraft}
              onKeyPress={({ nativeEvent }) => {
                if (Platform.OS !== "web") return;
                const event = nativeEvent as unknown as { key?: string; shiftKey?: boolean };
                if (event.key === "Enter" && !event.shiftKey) sendPrompt(draft, "Clinical Summary");
              }}
              placeholder="Ask about ECG interpretation, rhythm, occupational fitness, follow-up, or report drafting..."
              placeholderTextColor={medicalTheme.muted}
              style={styles.composerInput}
              value={draft}
            />
            <PrimaryButton disabled={!draft.trim() || sendMutation.isPending} icon="send" label="Send" onPress={() => sendPrompt(draft, "Clinical Summary")} />
            <PrimaryButton disabled={!sendMutation.isPending} icon="square" label="Stop" onPress={() => { streamAbort.current?.abort(); setStatus(""); setStreamingMessage(""); }} variant="outline" />
          </View>
        </Card>

        <Card style={[styles.contextPanel, isMobile && styles.contextPanelMobile]}>
          <SectionHeader title="Context Panel" subtitle="Automatically loaded production data." />
          <ContextLine label="Doctor" value={user?.name ?? "Authenticated physician"} />
          <ContextLine label="Patient" value={currentPatient ? `${currentPatient.firstName} ${currentPatient.lastName}` : "No patient selected"} />
          <ContextLine label="Age / Gender" value={currentPatient ? `${currentPatient.age} / ${currentPatient.gender}` : "No patient selected"} />
          <ContextLine label="Company" value={currentPatient?.company ?? currentPatient?.department ?? "Not recorded"} />
          <ContextLine label="Current ECG" value={currentCase?.caseNumber ?? currentCase?.caseId ?? "No ECG selected"} />
          <ContextLine label="Case Status" value={currentCase?.status ?? "No active case"} />
          <ContextLine label="Uploaded Reports" value={String(currentCase?.reportCount ?? 0)} />
          <ContextLine label="Clinical Notes" value={currentCase?.clinicalNotes ?? currentPatient?.medicalHistory ?? "No notes recorded"} />
        </Card>
      </View>
    </PageSection>
  );
}

function ConversationGroup({ conversations, onSelect, selectedId, title }: { conversations: CopilotConversation[]; onSelect: (id: string) => void; selectedId?: string; title: string }) {
  return (
    <View style={styles.group}>
      <Text style={styles.groupTitle}>{title}</Text>
      {conversations.length ? conversations.slice(0, 12).map((conversation) => (
        <Pressable
          accessibilityRole="button"
          key={conversation.id}
          onPress={() => onSelect(conversation.id)}
          style={[styles.conversationItem, selectedId === conversation.id && styles.conversationItemActive]}
        >
          <Text numberOfLines={1} style={styles.conversationTitle}>{conversation.title.replace("[Archived] ", "")}</Text>
          <Text style={styles.conversationMeta}>{conversation.tag} • {new Date(conversation.updatedAt).toLocaleDateString()}</Text>
        </Pressable>
      )) : <Text style={styles.emptyText}>No conversations yet.</Text>}
    </View>
  );
}

function MessageCard({ message }: { message: CopilotMessage }) {
  const assistant = message.role === "assistant";
  return (
    <View style={[styles.message, assistant ? styles.assistantMessage : styles.userMessage]}>
      <Text style={styles.messageRole}>{assistant ? "AI Clinical Copilot" : "You"} • {new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</Text>
      {message.content.split("\n").map((line, index) => {
        if (!line.trim()) return <View key={`space-${index}`} style={styles.messageSpace} />;
        if (line.startsWith("## ")) return <Text key={index} style={styles.messageHeading}>{line.replace(/^##\s*/, "")}</Text>;
        if (line.startsWith("- ")) return <Text key={index} style={styles.messageText}>• {line.slice(2)}</Text>;
        if (/^\d+\.\s/.test(line)) return <Text key={index} style={styles.messageText}>{line}</Text>;
        if (line.includes("|")) return <Text key={index} style={styles.messageTable}>{line}</Text>;
        return <Text key={index} style={styles.messageText}>{line}</Text>;
      })}
      {message.confidence !== undefined ? <Text style={styles.confidence}>Confidence {Math.round(message.confidence * 100)}%</Text> : null}
    </View>
  );
}

function ContextLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.contextLine}>
      <Text style={styles.contextLabel}>{label}</Text>
      <Text style={styles.contextValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  assistantMessage: { alignSelf: "flex-start", backgroundColor: "rgba(15,33,53,0.96)", borderColor: medicalTheme.border },
  chatHeader: { alignItems: "center", flexDirection: "row", gap: 12, justifyContent: "space-between" },
  chatHeaderMain: { flex: 1, minWidth: 0 },
  chatMeta: { color: medicalTheme.muted, fontSize: 12, fontWeight: "800", marginTop: 4 },
  chatPanel: { flex: 1, gap: 12, minHeight: 640, minWidth: 320 },
  composer: { alignItems: "flex-end", borderColor: medicalTheme.border, borderRadius: 18, borderWidth: 1, flexDirection: "row", flexWrap: "wrap", gap: 8, padding: 10 },
  composerInput: { color: medicalTheme.text, flex: 1, maxHeight: 120, minHeight: 48, minWidth: 240, padding: 8 },
  confidence: { color: medicalTheme.success, fontSize: 11, fontWeight: "900", marginTop: 6 },
  contextLabel: { color: medicalTheme.muted, fontSize: 11, fontWeight: "800", textTransform: "uppercase" },
  contextLine: { borderBottomColor: "rgba(148,163,184,0.12)", borderBottomWidth: 1, gap: 3, paddingVertical: 8 },
  contextPanel: { flexBasis: 260, gap: 6 },
  contextPanelMobile: { flexBasis: "auto" },
  contextValue: { color: medicalTheme.text, fontSize: 13, fontWeight: "800", lineHeight: 18 },
  conversationItem: { backgroundColor: "rgba(15,33,53,0.72)", borderColor: "transparent", borderRadius: 14, borderWidth: 1, gap: 4, padding: 10 },
  conversationItemActive: { borderColor: medicalTheme.primary },
  conversationMeta: { color: medicalTheme.muted, fontSize: 10, fontWeight: "800" },
  conversationTitle: { color: medicalTheme.text, fontSize: 12, fontWeight: "900" },
  disabled: { opacity: 0.45 },
  emptyText: { color: medicalTheme.muted, fontSize: 12, fontWeight: "800" },
  group: { gap: 8 },
  groupTitle: { color: medicalTheme.primary, fontSize: 11, fontWeight: "900", textTransform: "uppercase" },
  hero: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: 16, justifyContent: "space-between" },
  heroActions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  heroCopy: { flex: 1, minWidth: 280 },
  kicker: { color: medicalTheme.primary, fontSize: 12, fontWeight: "900", letterSpacing: 1, textTransform: "uppercase" },
  message: { borderRadius: 18, borderWidth: 1, gap: 3, maxWidth: "92%", padding: 12 },
  messageHeading: { color: medicalTheme.text, fontSize: 14, fontWeight: "900", marginTop: 6 },
  messageList: { gap: 10, paddingBottom: 16 },
  messageRole: { color: medicalTheme.primary, fontSize: 10, fontWeight: "900", textTransform: "uppercase" },
  messageSpace: { height: 4 },
  messageTable: { backgroundColor: "rgba(2,6,23,0.26)", borderColor: medicalTheme.border, borderRadius: 8, borderWidth: 1, color: medicalTheme.text, fontFamily: Platform.select({ web: "monospace", default: undefined }), fontSize: 11, lineHeight: 17, padding: 6 },
  messageText: { color: medicalTheme.text, fontSize: 13, lineHeight: 20 },
  messages: { flex: 1, minHeight: 360 },
  page: { gap: 16 },
  quickChip: { backgroundColor: medicalTheme.surface, borderColor: medicalTheme.border, borderRadius: 999, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 },
  quickChipText: { color: medicalTheme.text, fontSize: 12, fontWeight: "900" },
  quickChips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  searchInput: { backgroundColor: medicalTheme.surface, borderColor: medicalTheme.border, borderRadius: 14, borderWidth: 1, color: medicalTheme.text, minHeight: 42, paddingHorizontal: 12 },
  sidebar: { flexBasis: 260, gap: 12 },
  sidebarMobile: { flexBasis: "auto" },
  statusText: { color: medicalTheme.primary, fontSize: 13, fontWeight: "900" },
  subtitle: { color: medicalTheme.muted, fontSize: 14, fontWeight: "700", lineHeight: 22, marginTop: 8 },
  title: { color: medicalTheme.text, fontSize: 28, fontWeight: "900", marginTop: 4 },
  titleInput: { borderBottomColor: medicalTheme.border, borderBottomWidth: 1, color: medicalTheme.text, fontSize: 18, fontWeight: "900", minHeight: 38, paddingVertical: 6 },
  userMessage: { alignSelf: "flex-end", backgroundColor: "#0E3345", borderColor: "#1F7085" },
  workspace: { alignItems: "stretch", flexDirection: "row", gap: 16 },
  workspaceMobile: { flexDirection: "column" },
});
