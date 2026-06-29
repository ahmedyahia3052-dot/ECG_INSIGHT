import { Feather } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { usePathname } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { PanResponder, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";

import { useAuth } from "@/context/AuthContext";
import { useDashboardStore } from "@/context/DashboardStore";
import {
  copilotExportUrl,
  deleteCopilotConversation,
  getCopilotConversation,
  getCopilotSettings,
  listCopilotConversations,
  sendCopilotMessage,
  updateCopilotConversation,
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
  { label: "Explain ECG", prompt: "Explain the active ECG findings and highlight urgent abnormalities.", tag: "ECG Interpretation" },
  { label: "Report Help", prompt: "Draft concise report assistance for the current ECG workflow.", tag: "Clinical Summary" },
  { label: "Patient Summary", prompt: "Summarize the relevant patient context and ECG history.", tag: "Clinical Summary" },
  { label: "Follow-up Plan", prompt: "Suggest follow-up recommendations and safety considerations.", tag: "Follow-up" },
  { label: "Differential", prompt: "List a focused differential diagnosis and discriminating ECG clues.", tag: "Differential Diagnosis" },
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
  const [lastPrompt, setLastPrompt] = useState<{ prompt: string; tag: CopilotTag } | undefined>();
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [typingMessage, setTypingMessage] = useState("");
  const typingCleanup = useRef<(() => void) | null>(null);
  const dragStart = useRef({ bottom: 24, right: 24 });
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
  const messages = selectedQuery.data?.messages ?? [];
  const latestAssistant = [...messages].reverse().find((message) => message.role === "assistant");

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["copilot-conversations", token] });
    if (selectedId) void queryClient.invalidateQueries({ queryKey: ["copilot-conversation", token, selectedId] });
  };

  const startTyping = (content: string) => {
    typingCleanup.current?.();
    setTypingMessage("");
    typingCleanup.current = animateTyping(content, setTypingMessage);
  };

  const sendMutation = useMutation({
    mutationFn: (input: QuickPrompt | { label?: string; prompt: string; tag: CopilotTag }) => sendCopilotMessage(token!, {
      ...context,
      conversationId: selectedId,
      question: input.prompt,
      tag: input.tag,
    }),
    onSuccess: (payload) => {
      setSelectedId(payload.conversation.id);
      setRenameTitle(payload.conversation.title);
      setQuestion("");
      startTyping(payload.message.content);
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
      typingCleanup.current?.();
      typingCleanup.current = null;
      setTypingMessage("");
    }
  }, [assistantOpen]);

  useEffect(() => () => typingCleanup.current?.(), []);

  if (!token) return null;

  if (!assistantOpen) {
    return (
      <Pressable
        accessibilityLabel="Open AI assistant"
        accessibilityRole="button"
        onPress={openAssistant}
        style={[styles.floatingButton, assistantPosition]}
      >
        <Feather name="message-circle" size={18} color={medicalTheme.primary} />
        <Text style={styles.floatingText}>AI Assistant</Text>
      </Pressable>
    );
  }

  return (
    <View style={[styles.widget, assistantFullscreen && styles.fullscreen, !assistantFullscreen && panelSize, !assistantFullscreen && assistantPosition, assistantMinimized && styles.minimized]}>
      <View style={styles.header} {...panResponder.panHandlers}>
        <View style={styles.headerTitle}>
          <Text style={styles.title}>AI Assistant</Text>
          <Text style={styles.subtitle}>{enabled ? "Persistent clinical assistant" : "Temporarily disabled"}</Text>
        </View>
        <View style={styles.headerActions}>
          <IconButton icon="move" label="Drag assistant" onPress={() => setAssistantPosition({ ...assistantPosition, bottom: assistantPosition.bottom === 24 ? 96 : 24 })} />
          <IconButton icon="maximize" label="Resize assistant" onPress={() => setAssistantSize(nextSize(assistantSize))} />
          <IconButton icon={assistantMinimized ? "plus" : "minus"} label="Minimize assistant" onPress={toggleAssistantMinimized} />
          <IconButton icon={assistantFullscreen ? "minimize-2" : "maximize-2"} label="Maximize assistant" onPress={toggleAssistantFullscreen} />
          <IconButton icon="x" label="Close assistant" onPress={closeAssistant} tone="critical" />
        </View>
      </View>

      {!assistantMinimized ? (
        <View style={styles.body}>
          <Text style={styles.disclaimer}>AI assistance only. Final diagnosis and clinical decisions remain the responsibility of the physician.</Text>
          <View style={styles.quickGrid}>
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
                <Feather name="arrow-right" size={14} color={medicalTheme.primary} />
              </Pressable>
            ))}
          </View>

          <View style={styles.searchRow}>
            <TextInput
              onChangeText={setConversationSearch}
              placeholder="Search conversation history..."
              placeholderTextColor={medicalTheme.muted}
              style={styles.historySearch}
              value={conversationSearch}
            />
            <Pressable accessibilityRole="button" onPress={() => { setSelectedId(undefined); setRenameTitle(""); }} style={styles.smallPill}>
              <Text style={styles.smallPillText}>New</Text>
            </Pressable>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.conversationStrip}>
            {conversations.map((conversation) => (
              <Pressable key={conversation.id} onPress={() => setSelectedId(conversation.id)} style={[styles.conversationChip, selectedId === conversation.id && styles.conversationChipActive]}>
                <Text numberOfLines={1} style={styles.conversationText}>{conversation.favorite ? "Pinned • " : ""}{conversation.title}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <ScrollView style={styles.messages}>
            {messages.slice(-8).map((message) => (
              <MessageBubble
                expandedCitationId={expandedCitationId}
                key={message.id}
                message={message}
                onCopy={() => copyMessage(message.content)}
                onToggleCitation={setExpandedCitationId}
              />
            ))}
            {sendMutation.isPending && !typingMessage ? <Text style={styles.thinking}>AI is thinking...</Text> : null}
            {typingMessage ? <MessageBubble expandedCitationId={expandedCitationId} message={{ citations: [], content: typingMessage, createdAt: new Date().toISOString(), id: "typing", role: "assistant" }} onCopy={() => copyMessage(typingMessage)} onToggleCitation={setExpandedCitationId} /> : null}
            {!messages.length && !typingMessage ? <Text style={styles.emptyText}>Choose a quick action or ask about ECG interpretation, reports, patient summary, follow-up, or differential diagnosis.</Text> : null}
          </ScrollView>

          {latestAssistant?.confidence !== undefined ? <Text style={styles.confidence}>Last response confidence {Math.round(latestAssistant.confidence * 100)}%</Text> : null}

          <View style={styles.composer}>
            <TextInput
              multiline
              onChangeText={setQuestion}
              placeholder="Ask a clinical question..."
              placeholderTextColor={medicalTheme.muted}
              style={styles.input}
              value={question}
            />
            <Pressable
              accessibilityRole="button"
              disabled={!enabled || !question.trim() || sendMutation.isPending}
              onPress={() => {
                const payload = { prompt: question, tag: tagForContext(context.contextType) };
                setLastPrompt(payload);
                sendMutation.mutate(payload);
              }}
              style={[styles.sendButton, (!enabled || !question.trim() || sendMutation.isPending) && styles.disabled]}
            >
              <Feather name="send" size={16} color={medicalTheme.background} />
            </Pressable>
          </View>
          {selectedId ? (
            <View style={styles.conversationTools}>
              <TextInput onChangeText={setRenameTitle} placeholder="Conversation title" placeholderTextColor={medicalTheme.muted} style={styles.renameInput} value={renameTitle} />
              <Pressable accessibilityRole="button" onPress={() => updateMutation.mutate({ id: selectedId, input: { title: renameTitle || "Clinical conversation" } })} style={styles.smallPill}>
                <Text style={styles.smallPillText}>Rename</Text>
              </Pressable>
              <Pressable accessibilityRole="button" onPress={() => updateMutation.mutate({ id: selectedId, input: { favorite: !conversations.find((item) => item.id === selectedId)?.favorite } })} style={styles.smallPill}>
                <Text style={styles.smallPillText}>Pin</Text>
              </Pressable>
              <Pressable accessibilityRole="button" onPress={() => exportConversationPdf(selectedId, token)} style={styles.smallPill}>
                <Text style={styles.smallPillText}>Export</Text>
              </Pressable>
              <Pressable accessibilityRole="button" disabled={!lastPrompt || sendMutation.isPending} onPress={() => lastPrompt && sendMutation.mutate(lastPrompt)} style={[styles.smallPill, (!lastPrompt || sendMutation.isPending) && styles.disabled]}>
                <Text style={styles.smallPillText}>Regenerate</Text>
              </Pressable>
              <Pressable accessibilityRole="button" onPress={() => { typingCleanup.current?.(); setTypingMessage(""); }} style={styles.smallPill}>
                <Text style={styles.smallPillText}>Stop</Text>
              </Pressable>
              <Pressable accessibilityRole="button" onPress={() => deleteMutation.mutate(selectedId)} style={styles.archivePill}>
                <Text style={styles.archiveText}>Archive</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function MessageBubble({
  expandedCitationId,
  message,
  onCopy,
  onToggleCitation,
}: {
  expandedCitationId?: string;
  message: CopilotMessage;
  onCopy: () => void;
  onToggleCitation: (id?: string) => void;
}) {
  const assistant = message.role === "assistant";
  return (
    <View style={[styles.message, assistant ? styles.assistantMessage : styles.userMessage]}>
      <View style={styles.messageHeader}>
        <Text style={styles.messageRole}>{assistant ? "Assistant" : "You"} • {formatTime(message.createdAt)}</Text>
        <Pressable accessibilityRole="button" onPress={onCopy}>
          <Feather name="copy" size={13} color={medicalTheme.primary} />
        </Pressable>
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

function animateTyping(text: string, setValue: (value: string) => void) {
  if (Platform.OS !== "web") {
    setValue(text);
    return () => undefined;
  }
  let index = 0;
  const timer = window.setInterval(() => {
    index += 20;
    setValue(text.slice(0, index));
    if (index >= text.length) window.clearInterval(timer);
  }, 18);
  return () => window.clearInterval(timer);
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

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "now";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

const styles = StyleSheet.create({
  archivePill: { alignItems: "center", backgroundColor: "rgba(239,68,68,0.16)", borderColor: `${medicalTheme.critical}66`, borderRadius: 999, borderWidth: 1, minHeight: 32, paddingHorizontal: 11, paddingVertical: 7 },
  archiveText: { color: medicalTheme.critical, fontSize: 11, fontWeight: "900" },
  assistantMessage: { alignSelf: "flex-start", backgroundColor: "rgba(15,33,53,0.96)", borderColor: medicalTheme.border },
  body: { flex: 1, gap: 10, minHeight: 0 },
  citationCard: { backgroundColor: "rgba(20,221,230,0.08)", borderColor: "rgba(20,221,230,0.26)", borderRadius: 10, borderWidth: 1, padding: 8 },
  citationDetails: { color: medicalTheme.muted, fontSize: 10, fontWeight: "700", marginTop: 3 },
  citationStack: { gap: 6, marginTop: 6 },
  citations: { color: medicalTheme.primary, fontSize: 10, fontWeight: "800", marginTop: 4 },
  clearButton: { alignSelf: "flex-start" },
  clearText: { color: medicalTheme.critical, fontSize: 11, fontWeight: "900" },
  composer: { alignItems: "center", flexDirection: "row", gap: 8 },
  confidence: { color: medicalTheme.success, fontSize: 11, fontWeight: "900" },
  conversationChip: { backgroundColor: "rgba(15,33,53,0.92)", borderColor: medicalTheme.border, borderRadius: 999, borderWidth: 1, maxWidth: 190, paddingHorizontal: 10, paddingVertical: 7 },
  conversationChipActive: { borderColor: medicalTheme.primary },
  conversationStrip: { gap: 8 },
  conversationText: { color: medicalTheme.text, fontSize: 11, fontWeight: "900" },
  conversationTools: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  disabled: { opacity: 0.45 },
  disclaimer: { color: medicalTheme.warning, fontSize: 11, fontWeight: "900", lineHeight: 16 },
  emptyText: { color: medicalTheme.muted, fontSize: 12, fontWeight: "700", lineHeight: 18, paddingVertical: 8 },
  floatingButton: { alignItems: "center", backgroundColor: medicalTheme.card, borderColor: medicalTheme.border, borderRadius: 999, borderWidth: 1, bottom: 24, flexDirection: "row", gap: 8, minHeight: 50, paddingHorizontal: 14, position: "absolute", right: 24, shadowColor: "#000", shadowOpacity: 0.28, shadowRadius: 18, zIndex: 100 },
  floatingText: { color: medicalTheme.text, fontSize: 13, fontWeight: "900" },
  fullscreen: { bottom: 18, left: 18, position: "absolute", right: 18, top: 18 },
  header: { alignItems: "center", borderBottomColor: medicalTheme.border, borderBottomWidth: 1, cursor: "move" as never, flexDirection: "row", gap: 8, justifyContent: "space-between", paddingBottom: 10 },
  historySearch: { backgroundColor: medicalTheme.surface, borderColor: medicalTheme.border, borderRadius: 12, borderWidth: 1, color: medicalTheme.text, flex: 1, minHeight: 36, paddingHorizontal: 10 },
  headerActions: { flexDirection: "row", gap: 6 },
  headerTitle: { flex: 1, minWidth: 0 },
  iconButton: { alignItems: "center", backgroundColor: medicalTheme.surface, borderColor: medicalTheme.border, borderRadius: 9, borderWidth: 1, height: 30, justifyContent: "center", width: 30 },
  input: { backgroundColor: medicalTheme.surface, borderColor: medicalTheme.border, borderRadius: 14, borderWidth: 1, color: medicalTheme.text, flex: 1, maxHeight: 90, minHeight: 42, padding: 10 },
  markdownHeading: { color: medicalTheme.text, fontSize: 13, fontWeight: "900", marginTop: 4 },
  markdownList: { color: medicalTheme.text, fontSize: 12, lineHeight: 18 },
  markdownSpace: { height: 4 },
  markdownStack: { gap: 1 },
  markdownTable: { backgroundColor: "rgba(2,6,23,0.22)", borderColor: medicalTheme.border, borderRadius: 8, borderWidth: 1, color: medicalTheme.text, fontFamily: Platform.select({ web: "monospace", default: undefined }), fontSize: 11, lineHeight: 17, padding: 6 },
  message: { borderRadius: 18, borderWidth: 1, gap: 3, maxWidth: "96%", padding: 11, shadowColor: medicalTheme.primary, shadowOpacity: 0.08, shadowRadius: 10 },
  messageHeader: { alignItems: "center", flexDirection: "row", gap: 8, justifyContent: "space-between" },
  messageRole: { color: medicalTheme.primary, fontSize: 10, fontWeight: "900", textTransform: "uppercase" },
  messageText: { color: medicalTheme.text, fontSize: 12, lineHeight: 18 },
  renameInput: { backgroundColor: medicalTheme.surface, borderColor: medicalTheme.border, borderRadius: 999, borderWidth: 1, color: medicalTheme.text, flexBasis: 170, minHeight: 32, paddingHorizontal: 10 },
  searchRow: { alignItems: "center", flexDirection: "row", gap: 8 },
  messages: { flex: 1, minHeight: 100 },
  minimized: { height: 58, overflow: "hidden" },
  quickAction: { alignItems: "center", backgroundColor: medicalTheme.surface, borderColor: medicalTheme.border, borderRadius: 13, borderWidth: 1, flexDirection: "row", gap: 8, justifyContent: "space-between", minHeight: 42, paddingHorizontal: 10 },
  quickGrid: { gap: 8 },
  quickText: { color: medicalTheme.text, fontSize: 12, fontWeight: "900" },
  sendButton: { alignItems: "center", backgroundColor: medicalTheme.primary, borderRadius: 12, height: 42, justifyContent: "center", width: 42 },
  smallPill: { alignItems: "center", backgroundColor: "rgba(20,221,230,0.09)", borderColor: "rgba(20,221,230,0.32)", borderRadius: 999, borderWidth: 1, minHeight: 32, paddingHorizontal: 11, paddingVertical: 7 },
  smallPillText: { color: medicalTheme.primary, fontSize: 11, fontWeight: "900" },
  subtitle: { color: medicalTheme.muted, fontSize: 11, fontWeight: "800" },
  thinking: { color: medicalTheme.primary, fontSize: 12, fontWeight: "900", paddingVertical: 6 },
  title: { color: medicalTheme.text, fontSize: 15, fontWeight: "900" },
  userMessage: { alignSelf: "flex-end", backgroundColor: "#0E3345", borderColor: "#1F7085" },
  widget: { backgroundColor: "rgba(12,26,45,0.98)", borderColor: "rgba(20,221,230,0.24)", borderRadius: 24, borderWidth: 1, bottom: 24, padding: 14, position: "absolute", right: 24, shadowColor: medicalTheme.primary, shadowOpacity: 0.18, shadowRadius: 28, zIndex: 100 },
});
