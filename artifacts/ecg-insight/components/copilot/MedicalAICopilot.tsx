import { Feather } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { usePathname } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { PanResponder, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";

import { useAuth } from "@/context/AuthContext";
import { useDashboardStore } from "@/context/DashboardStore";
import { getCase, getPatient, type ApiECGCase, type ApiPatient } from "@/services/clinical";
import {
  archiveCopilotConversation,
  copilotExportTxtUrl,
  copilotExportUrl,
  deleteCopilotConversation,
  deleteCopilotMessage,
  duplicateCopilotConversation,
  getCopilotConversation,
  getCopilotSettings,
  listCopilotConversations,
  streamCopilotMessage,
  updateCopilotConversation,
  type CopilotChatInput,
  type CopilotConversation,
  type CopilotMessage,
  type CopilotTag,
} from "@/services/copilot";
import { medicalTheme } from "@/theme/medicalTheme";

type QuickPrompt = {
  label: string;
  prompt: string;
  tag: CopilotTag;
};

const quickPrompts: QuickPrompt[] = [
  { label: "Interpret ECG", prompt: "Interpret the loaded ECG, including rhythm, rate, axis, intervals, conduction abnormalities, ischemic changes, STEMI or NSTEMI concern, and urgent findings.", tag: "ECG Interpretation" },
  { label: "Generate Impression", prompt: "Generate a concise physician-ready ECG impression using the loaded ECG and patient context.", tag: "ECG Interpretation" },
  { label: "Patient Summary", prompt: "Summarize demographics, clinical history, occupational history, medications, previous ECGs, reports, notes, and uploaded documents for the current patient.", tag: "Clinical Summary" },
  { label: "Differential Diagnosis", prompt: "List a focused differential diagnosis with discriminating ECG and clinical clues from the current context.", tag: "Differential Diagnosis" },
  { label: "Occupational Fitness", prompt: "Assess occupational fitness, work restrictions, return-to-work considerations, and referral needs using current ECG and clinical context.", tag: "Occupational Fitness" },
  { label: "Follow-up Plan", prompt: "Create a safe follow-up plan with escalation criteria, repeat ECG needs, referral indications, and patient safety advice.", tag: "Follow-up" },
  { label: "Generate Report", prompt: "Draft a structured ECG report with findings, impression, recommendations, confidence score, citations, and physician disclaimer.", tag: "Clinical Summary" },
  { label: "Explain Findings", prompt: "Explain the loaded ECG findings in clear clinical language with supporting context and guideline citations where available.", tag: "ECG Interpretation" },
];

export function MedicalAICopilot() {
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { width } = useWindowDimensions();
  const { authToken } = useAuth();
  const token = authToken?.token;
  const [question, setQuestion] = useState("");
  const [conversationSearch, setConversationSearch] = useState("");
  const [renameTitle, setRenameTitle] = useState("");
  const [expandedCitationId, setExpandedCitationId] = useState<string | undefined>();
  const [bookmarkedMessageIds, setBookmarkedMessageIds] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<Array<{ name: string; type: string }>>([]);
  const [lastPrompt, setLastPrompt] = useState<{ prompt: string; tag: CopilotTag } | undefined>();
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [streamStatus, setStreamStatus] = useState("");
  const [typingMessage, setTypingMessage] = useState("");
  const streamAbort = useRef<AbortController | null>(null);
  const dragStart = useRef({ bottom: 24, right: 24 });
  const messageScrollRef = useRef<ScrollView>(null);
  const {
    assistantFullscreen,
    assistantMinimized,
    assistantOpen,
    assistantPosition,
    assistantSize,
    closeAssistant,
    openAssistant,
    setAssistantPosition,
    setAssistantSize,
    toggleAssistantFullscreen,
    toggleAssistantMinimized,
  } = useDashboardStore();

  const context = useMemo(() => contextFromPath(pathname), [pathname]);
  const panelSize = assistantFullscreen ? undefined : assistantSize;
  const compactAssistant = width < 720;
  const enabledQuery = useQuery({
    enabled: !!token,
    queryFn: () => getCopilotSettings(token!),
    queryKey: ["copilot-settings", token],
    retry: false,
  });
  const conversationsQuery = useQuery({
    enabled: !!token && assistantOpen,
    queryFn: () => listCopilotConversations(token!, conversationSearch),
    queryKey: ["copilot-conversations", token, conversationSearch],
    retry: false,
  });
  const selectedQuery = useQuery({
    enabled: !!token && !!selectedId && assistantOpen,
    queryFn: () => getCopilotConversation(token!, selectedId!),
    queryKey: ["copilot-conversation", token, selectedId],
    retry: false,
  });

  const enabled = enabledQuery.data?.settings.enabled ?? true;
  const conversations = conversationsQuery.data?.conversations ?? [];
  const selectedConversation = conversations.find((conversation) => conversation.id === selectedId);
  const archivedConversations = conversations.filter((conversation) => conversation.title.startsWith("[Archived]"));
  const pinnedConversations = conversations.filter((conversation) => conversation.favorite && !conversation.title.startsWith("[Archived]"));
  const favoriteConversations = pinnedConversations;
  const recentConversations = conversations.filter((conversation) => !conversation.favorite && !conversation.title.startsWith("[Archived]"));
  const messages = selectedQuery.data?.messages ?? [];
  const latestAssistant = [...messages].reverse().find((message) => message.role === "assistant");
  const activeCaseId = context.caseId ?? selectedConversation?.caseId;
  const caseQuery = useQuery({
    enabled: !!token && !!activeCaseId && assistantOpen,
    queryFn: () => getCase(token!, activeCaseId!),
    queryKey: ["copilot-active-case", token, activeCaseId],
    retry: false,
  });
  const activePatientId = context.patientId ?? selectedConversation?.patientId ?? caseQuery.data?.case.patient.id;
  const patientQuery = useQuery({
    enabled: !!token && !!activePatientId && assistantOpen,
    queryFn: () => getPatient(token!, activePatientId!),
    queryKey: ["copilot-active-patient", token, activePatientId],
    retry: false,
  });
  const contextSummary = clinicalContextSummary({
    caseRecord: caseQuery.data?.case,
    contextType: context.contextType,
    patient: patientQuery.data?.patient ?? caseQuery.data?.case.patient,
    pathname,
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["copilot-conversations", token] });
    if (selectedId) void queryClient.invalidateQueries({ queryKey: ["copilot-conversation", token, selectedId] });
  };

  const sendMutation = useMutation({
    mutationFn: async (input: QuickPrompt | { label?: string; prompt: string; tag: CopilotTag }) => {
      const payload: CopilotChatInput = {
      ...context,
      conversationId: selectedId,
        question: withAttachmentContext(input.prompt, attachments),
      tag: input.tag,
      };
      const controller = new AbortController();
      streamAbort.current = controller;
      setTypingMessage("");
      setStreamStatus("AI is analyzing ECG...");
      let finalPayload: { conversation: CopilotConversation; message: CopilotMessage } | undefined;
      await streamCopilotMessage(token!, payload, (event) => {
        if (event.type === "status") setStreamStatus(event.status ?? "");
        if (event.type === "conversation" && event.conversation && event.message) {
          finalPayload = { conversation: event.conversation, message: event.message };
          setSelectedId(event.conversation.id);
          setRenameTitle(event.conversation.title);
        }
        if (event.type === "token" && event.token) setTypingMessage((current) => `${current}${event.token}`);
        if (event.type === "done" && event.conversation && event.message) finalPayload = { conversation: event.conversation, message: event.message };
      }, controller.signal);
      return finalPayload;
    },
    onSuccess: () => {
      setQuestion("");
      setAttachments([]);
      setStreamStatus("");
      streamAbort.current = null;
      invalidate();
    },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<CopilotConversation> }) => updateCopilotConversation(token!, id, input),
    onSuccess: (payload) => {
      setRenameTitle(payload.conversation.title);
      invalidate();
    },
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCopilotConversation(token!, id),
    onSuccess: () => {
      setSelectedId(undefined);
      invalidate();
    },
  });
  const deleteMessageMutation = useMutation({
    mutationFn: ({ conversationId, messageId }: { conversationId: string; messageId: string }) => deleteCopilotMessage(token!, conversationId, messageId),
    onSuccess: invalidate,
  });
  const duplicateMutation = useMutation({
    mutationFn: (id: string) => duplicateCopilotConversation(token!, id),
    onSuccess: (payload) => {
      setSelectedId(payload.conversation.id);
      setRenameTitle(payload.conversation.title);
      invalidate();
    },
  });
  const archiveMutation = useMutation({
    mutationFn: (id: string) => archiveCopilotConversation(token!, id),
    onSuccess: (payload) => {
      setSelectedId(payload.conversation.id);
      setRenameTitle(payload.conversation.title);
      invalidate();
    },
  });

  const panResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_event, gesture) => Math.abs(gesture.dx) > 4 || Math.abs(gesture.dy) > 4,
    onPanResponderGrant: () => {
      dragStart.current = assistantPosition;
    },
    onPanResponderMove: (_event, gesture) => {
      if (assistantFullscreen) return;
      setAssistantPosition({
        bottom: Math.max(12, dragStart.current.bottom - gesture.dy),
        right: Math.min(Math.max(12, dragStart.current.right - gesture.dx), Math.max(12, width - 80)),
      });
    },
  }), [assistantFullscreen, assistantPosition, setAssistantPosition, width]);

  useEffect(() => {
    if (!selectedId && conversations[0]?.id) {
      setSelectedId(conversations[0].id);
      setRenameTitle(conversations[0].title);
    }
  }, [conversations, selectedId]);

  useEffect(() => {
    const active = conversations.find((conversation) => conversation.id === selectedId);
    if (active) setRenameTitle(active.title);
  }, [conversations, selectedId]);

  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined" || !token) return undefined;
    const askFromFinding = (event: Event) => {
      const prompt = (event as CustomEvent<{ prompt?: string }>).detail?.prompt;
      if (!prompt) return;
      openAssistant();
      sendMutation.mutate({ prompt, tag: "ECG Interpretation" });
    };
    window.addEventListener("medical-copilot:ask", askFromFinding);
    return () => window.removeEventListener("medical-copilot:ask", askFromFinding);
  }, [openAssistant, sendMutation, token]);

  useEffect(() => {
    if (!assistantOpen) {
      streamAbort.current?.abort();
      streamAbort.current = null;
      setTypingMessage("");
      setStreamStatus("");
    }
  }, [assistantOpen]);

  useEffect(() => {
    messageScrollRef.current?.scrollToEnd({ animated: true });
  }, [messages.length, typingMessage]);

  if (!token) return null;

  if (!assistantOpen) {
    return (
      <Pressable
        accessibilityLabel="Open AI Clinical Copilot"
        accessibilityRole="button"
        onPress={openAssistant}
        style={[styles.floatingButton, assistantPosition]}
      >
        <Feather name="message-circle" size={18} color={medicalTheme.primary} />
        <Text style={styles.floatingText}>AI Clinical Copilot</Text>
      </Pressable>
    );
  }

  const conversationGroups = [
    { conversations: recentConversations, icon: "clock" as const, title: "Recent Chats" },
    { conversations: pinnedConversations, icon: "map-pin" as const, title: "Pinned Chats" },
    { conversations: favoriteConversations, icon: "star" as const, title: "Favorites" },
    { conversations: archivedConversations, icon: "archive" as const, title: "Archived" },
  ];

  return (
    <View style={[styles.widget, assistantFullscreen && styles.fullscreen, !assistantFullscreen && panelSize, !assistantFullscreen && assistantPosition, assistantMinimized && styles.minimized]}>
      <View style={styles.header} {...panResponder.panHandlers}>
        <View style={styles.headerTitle}>
          <Text style={styles.title}>AI Clinical Copilot</Text>
          <View style={styles.headerContextGrid}>
            <Text numberOfLines={1} style={styles.headerContextText}>Patient: {contextSummary.patientName}</Text>
            <Text numberOfLines={1} style={styles.headerContextText}>Current ECG: {contextSummary.currentEcgId}</Text>
            <Text numberOfLines={1} style={styles.headerContextText}>Current Context: {contextSummary.currentContext}</Text>
            <Text numberOfLines={1} style={styles.headerContextText}>Case Status: {contextSummary.caseStatus}</Text>
          </View>
        </View>
        <View style={styles.headerActions}>
          <IconButton icon={assistantFullscreen ? "minimize-2" : "maximize-2"} label="Expand" onPress={toggleAssistantFullscreen} />
          <IconButton icon="external-link" label="Pop-out" onPress={() => setAssistantSize(nextSize(assistantSize))} />
          <IconButton icon={assistantMinimized ? "plus" : "minus"} label="Minimize" onPress={toggleAssistantMinimized} />
          <IconButton icon="x" label="Close" onPress={closeAssistant} tone="critical" />
        </View>
      </View>

      {!assistantMinimized ? (
        <View style={styles.body}>
          <Text style={styles.disclaimer}>AI assistance only. Final diagnosis and clinical decisions remain the responsibility of the physician.</Text>
          <View style={styles.quickChips}>
            {quickPrompts.map((item) => (
              <Pressable
                accessibilityRole="button"
                disabled={!enabled || sendMutation.isPending}
                key={item.label}
                onPress={() => {
                  setLastPrompt({ prompt: item.prompt, tag: item.tag });
                  sendMutation.mutate(item);
                }}
                style={styles.quickAction}
              >
                <Text style={styles.quickText}>{item.label}</Text>
              </Pressable>
            ))}
          </View>

          <View style={[styles.chatWorkspace, compactAssistant && styles.chatWorkspaceStacked]}>
            <View style={[styles.conversationSidebar, compactAssistant && styles.conversationSidebarMobile]}>
              <View style={styles.contextPanel}>
                <Text style={styles.contextPanelTitle}>Context Panel</Text>
                <Text numberOfLines={1} style={styles.contextPanelLine}>Patient Name: {contextSummary.patientName}</Text>
                <Text numberOfLines={1} style={styles.contextPanelLine}>Age: {contextSummary.age}</Text>
                <Text numberOfLines={1} style={styles.contextPanelLine}>Gender: {contextSummary.gender}</Text>
                <Text numberOfLines={1} style={styles.contextPanelLine}>Company: {contextSummary.company}</Text>
                <Text numberOfLines={1} style={styles.contextPanelLine}>Case ID: {contextSummary.caseId}</Text>
                <Text numberOfLines={1} style={styles.contextPanelLine}>Current ECG ID: {contextSummary.currentEcgId}</Text>
              </View>
              <View style={styles.searchRow}>
                <TextInput
                  onChangeText={setConversationSearch}
                  placeholder="Search conversations..."
                  placeholderTextColor={medicalTheme.muted}
                  style={styles.historySearch}
                  value={conversationSearch}
                />
                <Pressable accessibilityRole="button" onPress={() => { setSelectedId(undefined); setRenameTitle(""); }} style={styles.newChatButton}>
                  <Feather name="plus" size={14} color={medicalTheme.background} />
                  <Text style={styles.newChatText}>New</Text>
                </Pressable>
              </View>
              <View style={styles.sidebarStack}>
                {conversationGroups.map((group) => (
                  <View key={group.title} style={styles.sidebarGroup}>
                    <View style={styles.sidebarGroupHeader}>
                      <Feather name={group.icon} size={12} color={medicalTheme.primary} />
                      <Text style={styles.sidebarGroupTitle}>{group.title}</Text>
                    </View>
                    {group.conversations.length ? group.conversations.slice(0, 3).map((conversation) => (
                      <Pressable
                        accessibilityRole="button"
                        key={`${group.title}-${conversation.id}`}
                        onPress={() => setSelectedId(conversation.id)}
                        style={[styles.sidebarConversation, selectedId === conversation.id && styles.sidebarConversationActive]}
                      >
                        <Text numberOfLines={1} style={styles.sidebarConversationTitle}>{conversation.title.replace("[Archived] ", "")}</Text>
                        <Text numberOfLines={1} style={styles.sidebarConversationMeta}>{conversation.tag} • {formatTime(conversation.updatedAt)}</Text>
                      </Pressable>
                    )) : <Text style={styles.sidebarEmpty}>No {group.title.toLowerCase()}.</Text>}
                  </View>
                ))}
                <View style={styles.sidebarGroup}>
                  <View style={styles.sidebarGroupHeader}>
                    <Feather name="file-text" size={12} color={medicalTheme.primary} />
                    <Text style={styles.sidebarGroupTitle}>Templates</Text>
                  </View>
                  {quickPrompts.slice(0, 4).map((template) => (
                    <Pressable
                      accessibilityRole="button"
                      disabled={!enabled || sendMutation.isPending}
                      key={`template-${template.label}`}
                      onPress={() => sendClinicalPrompt(template)}
                      style={styles.sidebarConversation}
                    >
                      <Text numberOfLines={1} style={styles.sidebarConversationTitle}>{template.label}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </View>

            <View style={styles.chatColumn}>
              <ScrollView contentContainerStyle={styles.messageListContent} ref={messageScrollRef} showsVerticalScrollIndicator style={styles.messageScroller}>
                {selectedQuery.isLoading ? <Text style={styles.thinking}>Loading conversation...</Text> : null}
                {messages.map((message) => (
                  <MessageBubble
                    bookmarked={bookmarkedMessageIds.includes(message.id)}
                    expandedCitationId={expandedCitationId}
                    key={message.id}
                    message={message}
                    onBookmark={() => setBookmarkedMessageIds((current) => current.includes(message.id) ? current.filter((id) => id !== message.id) : [...current, message.id])}
                    onCopy={() => copyMessage(message.content)}
                    onEdit={() => message.role === "user" ? setQuestion(message.content) : undefined}
                    onRemove={() => selectedId ? deleteMessageMutation.mutate({ conversationId: selectedId, messageId: message.id }) : undefined}
                    onRetry={() => sendClinicalPrompt({ prompt: message.content, tag: tagForContext(context.contextType) })}
                    onToggleCitation={setExpandedCitationId}
                  />
                ))}
                {sendMutation.isPending && !typingMessage ? <Text style={styles.thinking}>{streamStatus || "AI is thinking..."}</Text> : null}
                {typingMessage ? <MessageBubble bookmarked={false} expandedCitationId={expandedCitationId} message={{ citations: [], content: typingMessage, createdAt: new Date().toISOString(), id: "typing", role: "assistant" }} onBookmark={() => undefined} onCopy={() => copyMessage(typingMessage)} onEdit={() => undefined} onRemove={() => undefined} onRetry={() => undefined} onToggleCitation={setExpandedCitationId} pending /> : null}
                {!messages.length && !typingMessage && !selectedQuery.isLoading ? <Text style={styles.emptyText}>Start a new clinical conversation or choose a recent chat. Messages stay fully visible in this scroll area.</Text> : null}
              </ScrollView>

              <View style={styles.stickyComposer}>
                {latestAssistant?.confidence !== undefined ? <Text style={styles.confidence}>Last response confidence {Math.round(latestAssistant.confidence * 100)}%</Text> : null}
                <View style={styles.composer}>
                  <TextInput
                    multiline
                    onChangeText={setQuestion}
                    onKeyPress={({ nativeEvent }) => {
                      if (Platform.OS !== "web") return;
                      const keyboardEvent = nativeEvent as unknown as { key?: string; shiftKey?: boolean };
                      if (keyboardEvent.key === "Enter" && !keyboardEvent.shiftKey && question.trim() && !sendMutation.isPending) {
                        sendClinicalPrompt({ prompt: question, tag: tagForContext(context.contextType) });
                      }
                    }}
                    placeholder="Ask a clinical question..."
                    placeholderTextColor={medicalTheme.muted}
                    style={styles.input}
                    value={question}
                  />
                  <Pressable accessibilityLabel="Attach files" accessibilityRole="button" onPress={() => attachClinicalFiles(setAttachments)} style={styles.composerIconButton}>
                    <Feather name="paperclip" size={16} color={medicalTheme.primary} />
                  </Pressable>
                  <Pressable accessibilityLabel="Attach ECG" accessibilityRole="button" onPress={() => attachClinicalFiles(setAttachments)} style={styles.composerIconButton}>
                    <Feather name="activity" size={16} color={medicalTheme.primary} />
                  </Pressable>
                  <Pressable accessibilityLabel="Voice input" accessibilityRole="button" onPress={() => setQuestion((current) => `${current}${current ? "\n" : ""}Voice note: `)} style={styles.composerIconButton}>
                    <Feather name="mic" size={16} color={medicalTheme.primary} />
                  </Pressable>
                  <Pressable accessibilityLabel="Stop generation" accessibilityRole="button" onPress={() => { streamAbort.current?.abort(); setTypingMessage(""); setStreamStatus(""); }} style={styles.composerIconButton}>
                    <Feather name="square" size={15} color={medicalTheme.critical} />
                  </Pressable>
                  <Pressable
                    accessibilityLabel="Send"
                    accessibilityRole="button"
                    disabled={!enabled || !question.trim() || sendMutation.isPending}
                    onPress={() => sendClinicalPrompt({ prompt: question, tag: tagForContext(context.contextType) })}
                    style={[styles.sendButton, (!enabled || !question.trim() || sendMutation.isPending) && styles.disabled]}
                  >
                    <Feather name="send" size={16} color={medicalTheme.background} />
                  </Pressable>
                </View>
                <View style={styles.attachmentRow}>
                  {attachments.map((attachment) => (
                    <Pressable key={`${attachment.name}-${attachment.type}`} onPress={() => setAttachments((current) => current.filter((item) => item.name !== attachment.name))} style={styles.attachmentChipButton}>
                      <Text numberOfLines={1} style={styles.attachmentChip}>{attachment.name}</Text>
                      <Feather name="x" size={11} color={medicalTheme.primary} />
                    </Pressable>
                  ))}
                </View>
                {selectedId ? (
                  <View style={styles.conversationTools}>
                    <TextInput onChangeText={setRenameTitle} placeholder="Conversation title" placeholderTextColor={medicalTheme.muted} style={styles.renameInput} value={renameTitle} />
                    <Pressable accessibilityRole="button" onPress={() => updateMutation.mutate({ id: selectedId, input: { title: renameTitle || "Clinical conversation" } })} style={styles.smallPill}><Text style={styles.smallPillText}>Rename</Text></Pressable>
                    <Pressable accessibilityRole="button" onPress={() => updateMutation.mutate({ id: selectedId, input: { favorite: !conversations.find((item) => item.id === selectedId)?.favorite } })} style={styles.smallPill}><Text style={styles.smallPillText}>Pin</Text></Pressable>
                    <Pressable accessibilityRole="button" onPress={() => exportConversationPdf(selectedId, token)} style={styles.smallPill}><Text style={styles.smallPillText}>Export PDF</Text></Pressable>
                    <Pressable accessibilityRole="button" onPress={() => exportConversationTxt(selectedId, token)} style={styles.smallPill}><Text style={styles.smallPillText}>Export TXT</Text></Pressable>
                    <Pressable accessibilityRole="button" onPress={() => shareConversation(selectedId, token)} style={styles.smallPill}><Text style={styles.smallPillText}>Share</Text></Pressable>
                    <Pressable accessibilityRole="button" onPress={() => printConversation()} style={styles.smallPill}><Text style={styles.smallPillText}>Print</Text></Pressable>
                    <Pressable accessibilityRole="button" onPress={() => duplicateMutation.mutate(selectedId)} style={styles.smallPill}><Text style={styles.smallPillText}>Duplicate</Text></Pressable>
                    <Pressable accessibilityRole="button" disabled={!lastPrompt || sendMutation.isPending} onPress={() => lastPrompt && sendMutation.mutate(lastPrompt)} style={[styles.smallPill, (!lastPrompt || sendMutation.isPending) && styles.disabled]}><Text style={styles.smallPillText}>Regenerate</Text></Pressable>
                    <Pressable accessibilityRole="button" onPress={() => archiveMutation.mutate(selectedId)} style={styles.smallPill}><Text style={styles.archiveText}>Archive</Text></Pressable>
                    <Pressable accessibilityRole="button" onPress={() => deleteMutation.mutate(selectedId)} style={styles.archivePill}><Text style={styles.archiveText}>Delete</Text></Pressable>
                  </View>
                ) : null}
              </View>
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );

  function sendClinicalPrompt(payload: { prompt: string; tag: CopilotTag }) {
    setLastPrompt(payload);
    sendMutation.mutate(payload);
  }
}

function MessageBubble({
  bookmarked,
  expandedCitationId,
  message,
  onBookmark,
  onCopy,
  onEdit,
  onRemove,
  onRetry,
  onToggleCitation,
  pending = false,
}: {
  bookmarked: boolean;
  expandedCitationId?: string;
  message: CopilotMessage;
  onBookmark: () => void;
  onCopy: () => void;
  onEdit: () => void;
  onRemove: () => void;
  onRetry: () => void;
  onToggleCitation: (id?: string) => void;
  pending?: boolean;
}) {
  const assistant = message.role === "assistant";
  return (
    <View style={[styles.message, assistant ? styles.assistantMessage : styles.userMessage]}>
      <View style={styles.messageHeader}>
        <Text style={styles.messageRole}>{assistant ? "Assistant" : "You"} • {formatTime(message.createdAt)}</Text>
        <View style={styles.messageActions}>
          {pending ? null : (
            <>
          <Pressable accessibilityRole="button" onPress={onBookmark}>
            <Feather name={bookmarked ? "star" : "bookmark"} size={13} color={bookmarked ? medicalTheme.warning : medicalTheme.primary} />
          </Pressable>
          <Pressable accessibilityRole="button" onPress={onEdit}>
            <Feather name="edit-3" size={13} color={medicalTheme.primary} />
          </Pressable>
          <Pressable accessibilityRole="button" onPress={onRetry}>
            <Feather name="refresh-cw" size={13} color={medicalTheme.primary} />
          </Pressable>
          <Pressable accessibilityRole="button" onPress={onCopy}>
            <Feather name="copy" size={13} color={medicalTheme.primary} />
          </Pressable>
          <Pressable accessibilityRole="button" onPress={onRemove}>
            <Feather name="trash-2" size={13} color={medicalTheme.critical} />
          </Pressable>
            </>
          )}
        </View>
      </View>
      <MarkdownText content={message.content} />
      {message.citations?.length ? (
        <View style={styles.citationStack}>
          {message.citations.slice(0, 4).map((citation) => {
            const expanded = expandedCitationId === citation.id;
            return (
              <Pressable key={`${message.id}-${citation.type}-${citation.id}`} onPress={() => onToggleCitation(expanded ? undefined : citation.id)} style={styles.citationCard}>
                <Text style={styles.citations}>{citation.source}: {citation.label}</Text>
                {expanded ? <Text style={styles.citationDetails}>{citation.type}{citation.tags?.length ? ` • ${citation.tags.join(", ")}` : ""}</Text> : null}
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

function MarkdownText({ content }: { content: string }) {
  const rows = content.split("\n");
  return (
    <View style={styles.markdownStack}>
      {rows.map((row, index) => {
        if (!row.trim()) return <View key={`space-${index}`} style={styles.markdownSpace} />;
        if (row.startsWith("## ")) return <Text key={index} style={styles.markdownHeading}>{row.replace(/^##\s*/, "")}</Text>;
        if (/^\d+\.\s/.test(row)) return <Text key={index} style={styles.markdownList}>{row}</Text>;
        if (row.startsWith("- ")) return <Text key={index} style={styles.markdownList}>• {row.slice(2)}</Text>;
        if (row.includes("|")) return <Text key={index} style={styles.markdownTable}>{row}</Text>;
        return <Text key={index} style={styles.messageText}>{row}</Text>;
      })}
    </View>
  );
}

function IconButton({ icon, label, onPress, tone = "primary" }: { icon: keyof typeof Feather.glyphMap; label: string; onPress: () => void; tone?: "critical" | "primary" }) {
  return (
    <Pressable accessibilityLabel={label} accessibilityRole="button" onPress={onPress} style={styles.iconButton}>
      <Feather name={icon} size={14} color={tone === "critical" ? medicalTheme.critical : medicalTheme.primary} />
    </Pressable>
  );
}

function contextFromPath(pathname: string) {
  const patientMatch = pathname.match(/\/patients\/([^/?]+)/);
  const caseMatch = pathname.match(/\/ecg-cases\/([^/?]+)/);
  if (caseMatch?.[1]) return { caseId: caseMatch[1], contextPath: pathname, contextType: "case" as const };
  if (patientMatch?.[1] && patientMatch[1] !== "create" && patientMatch[1] !== "new") return { contextPath: pathname, contextType: "patient" as const, patientId: patientMatch[1] };
  return { contextPath: pathname, contextType: "global" as const };
}

function clinicalContextSummary({
  caseRecord,
  contextType,
  patient,
  pathname,
}: {
  caseRecord?: ApiECGCase;
  contextType: "case" | "global" | "patient";
  patient?: ApiPatient;
  pathname: string;
}) {
  const fullName = patient ? patient.fullName ?? `${patient.firstName} ${patient.lastName}`.trim() : "Loaded by context engine";
  const reportMatch = pathname.match(/\/reports\/([^/?]+)/);
  return {
    age: patient?.age ? String(patient.age) : "Loaded by context engine",
    caseId: caseRecord?.caseNumber ?? caseRecord?.caseId ?? "Loaded by context engine",
    caseStatus: caseRecord?.status ?? "Loaded by context engine",
    company: patient?.company ?? patient?.contractor ?? patient?.department ?? "Loaded by context engine",
    currentContext: reportMatch?.[1] ? `report:${reportMatch[1]}` : contextType,
    currentEcgId: caseRecord?.caseId ?? caseRecord?.id ?? "Loaded by context engine",
    gender: patient?.gender ?? "Loaded by context engine",
    patientName: fullName || "Loaded by context engine",
  };
}

function tagForContext(contextType: "case" | "global" | "patient"): CopilotTag {
  if (contextType === "patient") return "Clinical Summary";
  if (contextType === "case") return "ECG Interpretation";
  return "Differential Diagnosis";
}

function nextSize(size: { height: number; width: number }) {
  if (size.width < 380) return { height: 500, width: 420 };
  if (size.width < 520) return { height: 580, width: 560 };
  return { height: 420, width: 320 };
}

function copyMessage(content: string) {
  if (Platform.OS === "web" && typeof navigator !== "undefined" && navigator.clipboard) {
    void navigator.clipboard.writeText(content);
  }
}

function exportConversationPdf(conversationId: string, accessToken?: string) {
  if (Platform.OS !== "web" || typeof window === "undefined") return;
  const separator = copilotExportUrl(conversationId).includes("?") ? "&" : "?";
  window.open(`${copilotExportUrl(conversationId)}${separator}token=${encodeURIComponent(accessToken ?? "")}`, "_blank", "noopener,noreferrer");
}

function exportConversationTxt(conversationId: string, accessToken?: string) {
  if (Platform.OS !== "web" || typeof window === "undefined") return;
  const separator = copilotExportTxtUrl(conversationId).includes("?") ? "&" : "?";
  window.open(`${copilotExportTxtUrl(conversationId)}${separator}token=${encodeURIComponent(accessToken ?? "")}`, "_blank", "noopener,noreferrer");
}

function printConversation() {
  if (Platform.OS === "web" && typeof window !== "undefined") window.print();
}

function shareConversation(conversationId: string, accessToken?: string) {
  if (Platform.OS !== "web" || typeof window === "undefined") return;
  const url = `${copilotExportUrl(conversationId)}?token=${encodeURIComponent(accessToken ?? "")}`;
  const webNavigator = typeof navigator !== "undefined" ? navigator as Navigator & { clipboard?: { writeText: (text: string) => Promise<void> }; share?: (data: { title: string; url: string }) => Promise<void> } : undefined;
  if (webNavigator?.share) {
    void webNavigator.share({ title: "ECG Insight AI Copilot conversation", url });
    return;
  }
  void webNavigator?.clipboard?.writeText(url);
}

function withAttachmentContext(prompt: string, attachments: Array<{ name: string; type: string }>) {
  if (!attachments.length) return prompt;
  return `${prompt}\n\nAttached clinical files for context: ${attachments.map((file) => `${file.name} (${file.type || "unknown type"})`).join(", ")}. Use only extracted or visible clinical content available in ECG Insight records; do not infer unsupported findings from file names alone.`;
}

function attachClinicalFiles(setAttachments: React.Dispatch<React.SetStateAction<Array<{ name: string; type: string }>>>) {
  if (Platform.OS !== "web" || typeof document === "undefined") return;
  const input = document.createElement("input");
  input.type = "file";
  input.multiple = true;
  input.accept = ".pdf,.docx,.png,.jpg,.jpeg,.txt,.csv,application/pdf,image/*";
  input.onchange = () => {
    const files = Array.from(input.files ?? []).map((file) => ({ name: file.name, type: file.type }));
    setAttachments((current) => [...current, ...files].slice(-8));
  };
  input.click();
}

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "now";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

const styles = StyleSheet.create({
  archivePill: { alignItems: "center", backgroundColor: "rgba(239,68,68,0.16)", borderColor: `${medicalTheme.critical}66`, borderRadius: 999, borderWidth: 1, minHeight: 32, paddingHorizontal: 11, paddingVertical: 7 },
  archiveText: { color: medicalTheme.critical, fontSize: 11, fontWeight: "900" },
  assistantMessage: { alignSelf: "flex-start", backgroundColor: "rgba(15,33,53,0.96)", borderColor: medicalTheme.border },
  attachmentChip: { backgroundColor: "rgba(20,221,230,0.08)", borderColor: "rgba(20,221,230,0.26)", borderRadius: 999, borderWidth: 1, color: medicalTheme.primary, flexShrink: 1, fontSize: 10, fontWeight: "800", maxWidth: 160, overflow: "hidden", paddingHorizontal: 9, paddingVertical: 6 },
  attachmentChipButton: { alignItems: "center", flexDirection: "row", gap: 4 },
  attachmentRow: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: 6 },
  body: { flex: 1, gap: 8, minHeight: 0, overflow: "hidden" },
  chatColumn: { flex: 1, gap: 0, minHeight: 0, minWidth: 0 },
  chatWorkspace: { flex: 1, flexDirection: "row", gap: 10, minHeight: 0, overflow: "hidden" },
  chatWorkspaceStacked: { flexDirection: "column" },
  citationCard: { backgroundColor: "rgba(20,221,230,0.08)", borderColor: "rgba(20,221,230,0.26)", borderRadius: 10, borderWidth: 1, padding: 8 },
  citationDetails: { color: medicalTheme.muted, fontSize: 10, fontWeight: "700", marginTop: 3 },
  citationStack: { gap: 6, marginTop: 6 },
  citations: { color: medicalTheme.primary, fontSize: 10, fontWeight: "800", marginTop: 4 },
  clearButton: { alignSelf: "flex-start" },
  clearText: { color: medicalTheme.critical, fontSize: 11, fontWeight: "900" },
  composer: { alignItems: "flex-end", flexDirection: "row", gap: 8 },
  composerIconButton: { alignItems: "center", backgroundColor: medicalTheme.surface, borderColor: medicalTheme.border, borderRadius: 12, borderWidth: 1, height: 42, justifyContent: "center", width: 36 },
  confidence: { color: medicalTheme.success, fontSize: 11, fontWeight: "900" },
  contextPanel: { backgroundColor: "rgba(20,221,230,0.06)", borderColor: "rgba(20,221,230,0.18)", borderRadius: 12, borderWidth: 1, gap: 3, padding: 8 },
  contextPanelLine: { color: medicalTheme.text, fontSize: 10, fontWeight: "700" },
  contextPanelTitle: { color: medicalTheme.primary, fontSize: 10, fontWeight: "900", textTransform: "uppercase" },
  conversationSidebar: { backgroundColor: "rgba(2,6,23,0.18)", borderColor: medicalTheme.border, borderRadius: 16, borderWidth: 1, flex: 0.2, gap: 8, maxWidth: 230, minHeight: 0, minWidth: 190, overflow: "hidden", padding: 8 },
  conversationSidebarMobile: { flex: 0, maxHeight: 260, maxWidth: "100%", minWidth: "100%" },
  conversationTools: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: 7, paddingTop: 4 },
  disabled: { opacity: 0.45 },
  disclaimer: { color: medicalTheme.warning, fontSize: 11, fontWeight: "900", lineHeight: 16 },
  emptyText: { color: medicalTheme.muted, fontSize: 12, fontWeight: "700", lineHeight: 18, paddingVertical: 8 },
  floatingButton: { alignItems: "center", backgroundColor: medicalTheme.card, borderColor: medicalTheme.border, borderRadius: 999, borderWidth: 1, bottom: 24, flexDirection: "row", gap: 8, minHeight: 50, paddingHorizontal: 14, position: "absolute", right: 24, shadowColor: "#000", shadowOpacity: 0.28, shadowRadius: 18, zIndex: 100 },
  floatingText: { color: medicalTheme.text, fontSize: 13, fontWeight: "900" },
  fullscreen: { bottom: 18, left: 18, position: "absolute", right: 18, top: 18 },
  header: { alignItems: "center", borderBottomColor: medicalTheme.border, borderBottomWidth: 1, cursor: "move" as never, flexDirection: "row", gap: 8, justifyContent: "space-between", paddingBottom: 10 },
  historySearch: { backgroundColor: medicalTheme.surface, borderColor: medicalTheme.border, borderRadius: 12, borderWidth: 1, color: medicalTheme.text, flex: 1, minHeight: 36, paddingHorizontal: 10 },
  headerActions: { flexDirection: "row", gap: 6 },
  headerContextGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 3 },
  headerContextText: { color: medicalTheme.muted, flexBasis: "45%", flexGrow: 1, fontSize: 10, fontWeight: "800" },
  headerTitle: { flex: 1, minWidth: 0 },
  iconButton: { alignItems: "center", backgroundColor: medicalTheme.surface, borderColor: medicalTheme.border, borderRadius: 9, borderWidth: 1, height: 30, justifyContent: "center", width: 30 },
  input: { backgroundColor: medicalTheme.surface, borderColor: medicalTheme.border, borderRadius: 14, borderWidth: 1, color: medicalTheme.text, flex: 1, maxHeight: 96, minHeight: 48, padding: 10 },
  markdownHeading: { color: medicalTheme.text, fontSize: 13, fontWeight: "900", marginTop: 4 },
  markdownList: { color: medicalTheme.text, fontSize: 12, lineHeight: 18 },
  markdownSpace: { height: 4 },
  markdownStack: { gap: 1 },
  markdownTable: { backgroundColor: "rgba(2,6,23,0.22)", borderColor: medicalTheme.border, borderRadius: 8, borderWidth: 1, color: medicalTheme.text, fontFamily: Platform.select({ web: "monospace", default: undefined }), fontSize: 11, lineHeight: 17, padding: 6 },
  message: { borderRadius: 18, borderWidth: 1, gap: 3, maxWidth: "96%", padding: 11, shadowColor: medicalTheme.primary, shadowOpacity: 0.08, shadowRadius: 10 },
  messageActions: { alignItems: "center", flexDirection: "row", gap: 9 },
  messageHeader: { alignItems: "center", flexDirection: "row", gap: 8, justifyContent: "space-between" },
  messageRole: { color: medicalTheme.primary, fontSize: 10, fontWeight: "900", textTransform: "uppercase" },
  messageText: { color: medicalTheme.text, fontSize: 12, lineHeight: 18 },
  renameInput: { backgroundColor: medicalTheme.surface, borderColor: medicalTheme.border, borderRadius: 999, borderWidth: 1, color: medicalTheme.text, flexBasis: 170, minHeight: 32, paddingHorizontal: 10 },
  searchRow: { alignItems: "center", flexDirection: "row", gap: 8 },
  messageListContent: { gap: 10, padding: 10, paddingBottom: 14 },
  messageScroller: { flex: 1, minHeight: 0, overflow: "scroll" },
  messages: { flex: 1, minHeight: 0 },
  minimized: { height: 58, overflow: "hidden" },
  newChatButton: { alignItems: "center", backgroundColor: medicalTheme.primary, borderRadius: 10, flexDirection: "row", gap: 4, minHeight: 36, paddingHorizontal: 10 },
  newChatText: { color: medicalTheme.background, fontSize: 11, fontWeight: "900" },
  quickAction: { alignItems: "center", backgroundColor: medicalTheme.surface, borderColor: medicalTheme.border, borderRadius: 999, borderWidth: 1, flexDirection: "row", gap: 6, minHeight: 30, paddingHorizontal: 11 },
  quickChips: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingBottom: 2 },
  quickText: { color: medicalTheme.text, fontSize: 11, fontWeight: "900" },
  sendButton: { alignItems: "center", backgroundColor: medicalTheme.primary, borderRadius: 12, height: 42, justifyContent: "center", width: 42 },
  smallPill: { alignItems: "center", backgroundColor: "rgba(20,221,230,0.09)", borderColor: "rgba(20,221,230,0.32)", borderRadius: 999, borderWidth: 1, minHeight: 32, paddingHorizontal: 11, paddingVertical: 7 },
  smallPillText: { color: medicalTheme.primary, fontSize: 11, fontWeight: "900" },
  sidebarConversation: { backgroundColor: "rgba(15,33,53,0.72)", borderColor: "transparent", borderRadius: 12, borderWidth: 1, gap: 2, padding: 8 },
  sidebarConversationActive: { borderColor: medicalTheme.primary },
  sidebarConversationMeta: { color: medicalTheme.muted, fontSize: 9, fontWeight: "700" },
  sidebarConversationTitle: { color: medicalTheme.text, fontSize: 11, fontWeight: "900" },
  sidebarEmpty: { color: medicalTheme.muted, fontSize: 10, fontWeight: "700", paddingHorizontal: 4 },
  sidebarGroup: { gap: 6 },
  sidebarGroupHeader: { alignItems: "center", flexDirection: "row", gap: 5 },
  sidebarGroupTitle: { color: medicalTheme.primary, fontSize: 10, fontWeight: "900", textTransform: "uppercase" },
  sidebarStack: { gap: 9, minHeight: 0, overflow: "hidden" },
  stickyComposer: { backgroundColor: "rgba(12,26,45,0.99)", borderColor: medicalTheme.border, borderRadius: 16, borderWidth: 1, bottom: 0, gap: 7, padding: 9, position: "sticky" as never },
  subtitle: { color: medicalTheme.muted, fontSize: 11, fontWeight: "800" },
  thinking: { color: medicalTheme.primary, fontSize: 12, fontWeight: "900", paddingVertical: 6 },
  title: { color: medicalTheme.text, fontSize: 15, fontWeight: "900" },
  userMessage: { alignSelf: "flex-end", backgroundColor: "#0E3345", borderColor: "#1F7085" },
  widget: { backgroundColor: "rgba(12,26,45,0.98)", borderColor: "rgba(20,221,230,0.24)", borderRadius: 24, borderWidth: 1, bottom: 24, maxHeight: "92%", minHeight: 360, padding: 14, position: "absolute", right: 24, shadowColor: medicalTheme.primary, shadowOpacity: 0.18, shadowRadius: 28, zIndex: 100 },
});
