import { Feather } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { usePathname } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { useAuth } from "@/context/AuthContext";
import {
  copilotExportUrl,
  deleteCopilotConversation,
  getCopilotAnalytics,
  getCopilotConversation,
  getCopilotSettings,
  listCopilotConversations,
  sendCopilotMessage,
  updateCopilotConversation,
  updateCopilotSettings,
  type CopilotConversation,
  type CopilotMessage,
  type CopilotTag,
} from "@/services/copilot";
import { medicalTheme } from "@/theme/medicalTheme";

const tags: CopilotTag[] = ["ECG Interpretation", "Clinical Summary", "Occupational Fitness", "Differential Diagnosis", "Follow-up"];
const disclaimer = "AI assistance only. Final diagnosis and clinical decisions remain the responsibility of the physician.";

export function MedicalAICopilot() {
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { authToken, user } = useAuth();
  const token = authToken?.token;
  const [open, setOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [position, setPosition] = useState({ bottom: 24, right: 24 });
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [question, setQuestion] = useState("");
  const [tag, setTag] = useState<CopilotTag>("ECG Interpretation");
  const [typingMessage, setTypingMessage] = useState("");

  const context = useMemo(() => contextFromPath(pathname), [pathname]);
  const isOwner = user?.email?.toLowerCase() === "ahmedyahia3052@gmail.com";

  const settingsQuery = useQuery({
    enabled: !!token,
    queryFn: () => getCopilotSettings(token!),
    queryKey: ["copilot-settings", token],
    retry: false,
  });
  const conversationsQuery = useQuery({
    enabled: !!token && open,
    queryFn: () => listCopilotConversations(token!, search),
    queryKey: ["copilot-conversations", token, search],
    retry: false,
  });
  const selectedQuery = useQuery({
    enabled: !!token && !!selectedId && open,
    queryFn: () => getCopilotConversation(token!, selectedId!),
    queryKey: ["copilot-conversation", token, selectedId],
    retry: false,
  });
  const analyticsQuery = useQuery({
    enabled: !!token && open && isOwner,
    queryFn: () => getCopilotAnalytics(token!),
    queryKey: ["copilot-analytics", token],
    retry: false,
  });

  const messages = selectedQuery.data?.messages ?? [];
  const conversations = conversationsQuery.data?.conversations ?? [];
  const unread = messages.filter((message) => message.role === "assistant").length ? 0 : 1;
  const enabled = settingsQuery.data?.settings.enabled ?? true;

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["copilot-conversations", token] });
    if (selectedId) void queryClient.invalidateQueries({ queryKey: ["copilot-conversation", token, selectedId] });
  };

  const sendMutation = useMutation({
    mutationFn: () => sendCopilotMessage(token!, { ...context, conversationId: selectedId, question, tag }),
    onSuccess: (payload) => {
      setSelectedId(payload.conversation.id);
      setQuestion("");
      setTypingMessage("");
      animateTyping(payload.message.content, setTypingMessage);
      invalidate();
    },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<CopilotConversation> }) => updateCopilotConversation(token!, id, input),
    onSuccess: invalidate,
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCopilotConversation(token!, id),
    onSuccess: () => {
      setSelectedId(undefined);
      invalidate();
    },
  });
  const settingsMutation = useMutation({
    mutationFn: (enabledNext: boolean) => updateCopilotSettings(token!, { enabled: enabledNext, provider: settingsQuery.data?.settings.provider ?? "RuleBasedRAG" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["copilot-settings", token] }),
  });

  useEffect(() => {
    setTag(context.contextType === "patient" ? "Clinical Summary" : context.contextType === "case" ? "ECG Interpretation" : "ECG Interpretation");
  }, [context.contextType]);

  if (!token) return null;

  if (!open) {
    return (
      <Pressable
        accessibilityLabel="Open Medical AI Copilot"
        accessibilityRole="button"
        onPress={() => setOpen(true)}
        style={[styles.floatingButton, position]}
      >
        <Feather name="cpu" size={24} color={medicalTheme.background} />
        {unread ? <View style={styles.unreadBadge}><Text style={styles.unreadText}>{unread}</Text></View> : null}
      </Pressable>
    );
  }

  return (
    <View style={[styles.widget, fullscreen && styles.fullscreen, minimized && styles.minimized, !fullscreen && position]}>
      <View style={styles.header}>
        <View style={styles.headerTitle}>
          <Text style={styles.title}>Medical AI Copilot</Text>
          <Text style={styles.subtitle}>{enabled ? "Clinical RAG assistant" : "Disabled by owner"}</Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable onPress={() => setPosition((current) => ({ ...current, bottom: current.bottom === 24 ? 96 : 24 }))} style={styles.iconButton}><Feather name="move" size={15} color={medicalTheme.primary} /></Pressable>
          <Pressable onPress={() => setMinimized((value) => !value)} style={styles.iconButton}><Feather name="minus" size={15} color={medicalTheme.primary} /></Pressable>
          <Pressable onPress={() => setFullscreen((value) => !value)} style={styles.iconButton}><Feather name={fullscreen ? "minimize-2" : "maximize-2"} size={15} color={medicalTheme.primary} /></Pressable>
          <Pressable onPress={() => setOpen(false)} style={styles.iconButton}><Feather name="x" size={15} color={medicalTheme.critical} /></Pressable>
        </View>
      </View>

      {!minimized ? (
        <View style={styles.body}>
          <View style={styles.sidebar}>
            <TextInput placeholder="Search conversations..." placeholderTextColor={medicalTheme.muted} onChangeText={setSearch} style={styles.search} value={search} />
            <PrimaryButton label="New Conversation" onPress={() => setSelectedId(undefined)} />
            <ScrollView style={styles.conversationList}>
              {conversations.map((conversation) => (
                <Pressable key={conversation.id} onPress={() => setSelectedId(conversation.id)} style={[styles.conversationItem, selectedId === conversation.id && styles.conversationActive]}>
                  <Text numberOfLines={1} style={styles.conversationTitle}>{conversation.title}</Text>
                  <Text style={styles.conversationMeta}>{conversation.tag}{conversation.favorite ? " • Favorite" : ""}</Text>
                </Pressable>
              ))}
            </ScrollView>
            {selectedId ? (
              <View style={styles.row}>
                <PrimaryButton label="Rename" onPress={() => updateMutation.mutate({ id: selectedId, input: { title: `Clinical chat ${new Date().toLocaleTimeString()}` } })} variant="outline" />
                <PrimaryButton label="Favorite" onPress={() => updateMutation.mutate({ id: selectedId, input: { favorite: true } })} variant="outline" />
                <PrimaryButton label="Delete" onPress={() => deleteMutation.mutate(selectedId)} variant="danger" />
              </View>
            ) : null}
          </View>

          <View style={styles.chat}>
            <Text style={styles.disclaimer}>{disclaimer}</Text>
            <View style={styles.contextCard}>
              <Badge label={context.contextType} tone="primary" />
              <Text style={styles.contextText}>{context.contextPath}</Text>
            </View>
            <View style={styles.tagRow}>
              {tags.map((item) => <PrimaryButton key={item} label={item} onPress={() => setTag(item)} variant={tag === item ? "primary" : "outline"} />)}
            </View>
            <ScrollView style={styles.messages}>
              {messages.map((message) => <MessageBubble key={message.id} message={message} />)}
              {typingMessage ? <MessageBubble message={{ citations: [], content: typingMessage, createdAt: new Date().toISOString(), id: "typing", role: "assistant" }} /> : null}
              {!messages.length && !typingMessage ? (
                <Text style={styles.emptyText}>Ask: Explain this ECG, summarize patient history, suggest differentials, occupational concerns, or follow-up recommendations.</Text>
              ) : null}
            </ScrollView>
            <View style={styles.composer}>
              <TextInput
                multiline
                onChangeText={setQuestion}
                placeholder="Ask the Medical AI Copilot..."
                placeholderTextColor={medicalTheme.muted}
                style={styles.input}
                value={question}
              />
              <PrimaryButton disabled={!enabled || !question.trim() || sendMutation.isPending} label={sendMutation.isPending ? "Thinking..." : "Send"} onPress={() => sendMutation.mutate()} />
            </View>
            {selectedId ? <PrimaryButton label="Export Conversation PDF" onPress={() => exportConversation(selectedId, token)} variant="outline" /> : null}
            {isOwner ? (
              <View style={styles.ownerPanel}>
                <Text style={styles.ownerTitle}>Owner Controls</Text>
                <PrimaryButton label={enabled ? "Disable Copilot" : "Enable Copilot"} onPress={() => settingsMutation.mutate(!enabled)} variant={enabled ? "danger" : "primary"} />
                <Text style={styles.ownerMetric}>Provider: {settingsQuery.data?.settings.provider ?? "RuleBasedRAG"}</Text>
                <Text style={styles.ownerMetric}>Conversations: {analyticsQuery.data?.analytics.totalConversations ?? 0} • Active users: {analyticsQuery.data?.analytics.activeUsers ?? 0} • Avg response: {analyticsQuery.data?.analytics.averageResponseTimeMs ?? 0} ms</Text>
              </View>
            ) : null}
          </View>
        </View>
      ) : null}
    </View>
  );
}

function MessageBubble({ message }: { message: CopilotMessage }) {
  const assistant = message.role === "assistant";
  return (
    <View style={[styles.message, assistant ? styles.assistantMessage : styles.userMessage]}>
      <Text style={styles.messageRole}>{assistant ? "Medical AI Copilot" : "You"}</Text>
      <MarkdownText value={message.content} />
      {message.confidence !== undefined ? <Text style={styles.confidence}>Confidence: {Math.round(message.confidence * 100)}%</Text> : null}
      {message.citations?.length ? (
        <View style={styles.citations}>
          {message.citations.map((citation) => <Text key={`${citation.type}-${citation.id}`} style={styles.citation}>[{citation.type}] {citation.label} - {citation.source}</Text>)}
        </View>
      ) : null}
    </View>
  );
}

function Badge({ label, tone = "primary" }: { label: string; tone?: "critical" | "primary" | "success" | "warning" }) {
  const color = tone === "critical" ? medicalTheme.critical : tone === "success" ? medicalTheme.success : tone === "warning" ? medicalTheme.warning : medicalTheme.primary;
  return (
    <View style={[styles.badge, { borderColor: color }]}>
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

function PrimaryButton({
  disabled,
  label,
  onPress,
  variant = "primary",
}: {
  disabled?: boolean;
  label: string;
  onPress: () => void;
  variant?: "danger" | "outline" | "primary";
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[styles.button, variant === "outline" && styles.buttonOutline, variant === "danger" && styles.buttonDanger, disabled && styles.buttonDisabled]}
    >
      <Text style={[styles.buttonText, variant === "outline" && styles.buttonTextOutline]}>{label}</Text>
    </Pressable>
  );
}

function MarkdownText({ value }: { value: string }) {
  return (
    <View style={styles.markdown}>
      {value.split(/\n/).map((line, index) => {
        if (line.startsWith("## ")) return <Text key={index} style={styles.markdownHeading}>{line.replace(/^## /, "")}</Text>;
        if (line.startsWith("- ")) return <Text key={index} style={styles.markdownBullet}>• {line.replace(/^- /, "")}</Text>;
        if (/^\|/.test(line)) return <Text key={index} style={styles.markdownCode}>{line}</Text>;
        if (/^```/.test(line)) return <Text key={index} style={styles.markdownCode}>{line}</Text>;
        return <Text key={index} style={styles.messageText}>{line}</Text>;
      })}
    </View>
  );
}

function contextFromPath(pathname: string) {
  const patientMatch = pathname.match(/\/patients\/([^/?]+)/);
  const caseMatch = pathname.match(/\/ecg-cases\/([^/?]+)/);
  if (caseMatch?.[1]) return { caseId: caseMatch[1], contextPath: pathname, contextType: "case" as const };
  if (patientMatch?.[1] && patientMatch[1] !== "create" && patientMatch[1] !== "new") return { contextPath: pathname, contextType: "patient" as const, patientId: patientMatch[1] };
  return { contextPath: pathname, contextType: "global" as const };
}

function animateTyping(text: string, setValue: (value: string) => void) {
  if (Platform.OS !== "web") {
    setValue(text);
    return;
  }
  let index = 0;
  const timer = window.setInterval(() => {
    index += 18;
    setValue(text.slice(0, index));
    if (index >= text.length) window.clearInterval(timer);
  }, 18);
}

function exportConversation(conversationId: string, token: string) {
  if (Platform.OS !== "web" || typeof window === "undefined") return;
  void fetch(copilotExportUrl(conversationId), { headers: { authorization: `Bearer ${token}` } })
    .then((response) => response.blob())
    .then((blob) => {
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    });
}

const styles = StyleSheet.create({
  assistantMessage: { alignSelf: "flex-start", backgroundColor: medicalTheme.surface, borderColor: medicalTheme.border },
  badge: { alignSelf: "flex-start", backgroundColor: "rgba(20,221,230,0.08)", borderRadius: 999, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 4 },
  badgeText: { fontSize: 10, fontWeight: "900", textTransform: "uppercase" },
  body: { flex: 1, flexDirection: "row", gap: 12, minHeight: 0 },
  button: { alignItems: "center", backgroundColor: medicalTheme.primary, borderRadius: 12, justifyContent: "center", minHeight: 36, paddingHorizontal: 10, paddingVertical: 8 },
  buttonDanger: { backgroundColor: medicalTheme.critical },
  buttonDisabled: { opacity: 0.45 },
  buttonOutline: { backgroundColor: "transparent", borderColor: medicalTheme.border, borderWidth: 1 },
  buttonText: { color: medicalTheme.background, fontSize: 11, fontWeight: "900" },
  buttonTextOutline: { color: medicalTheme.primary },
  chat: { flex: 1, gap: 10, minWidth: 0 },
  citation: { color: medicalTheme.primary, fontSize: 10, fontWeight: "800" },
  citations: { gap: 3, marginTop: 6 },
  composer: { alignItems: "flex-end", flexDirection: "row", gap: 8 },
  confidence: { color: medicalTheme.success, fontSize: 11, fontWeight: "900", marginTop: 4 },
  contextCard: { alignItems: "center", backgroundColor: medicalTheme.surface, borderColor: medicalTheme.border, borderRadius: 12, borderWidth: 1, flexDirection: "row", gap: 8, padding: 9 },
  contextText: { color: medicalTheme.muted, flex: 1, fontSize: 11, fontWeight: "800" },
  conversationActive: { borderColor: medicalTheme.primary },
  conversationItem: { backgroundColor: medicalTheme.surface, borderColor: medicalTheme.border, borderRadius: 12, borderWidth: 1, gap: 4, padding: 10 },
  conversationList: { maxHeight: 260 },
  conversationMeta: { color: medicalTheme.muted, fontSize: 10, fontWeight: "800" },
  conversationTitle: { color: medicalTheme.text, fontSize: 12, fontWeight: "900" },
  disclaimer: { color: medicalTheme.warning, fontSize: 11, fontWeight: "900" },
  emptyText: { color: medicalTheme.muted, fontSize: 13, fontWeight: "700", lineHeight: 20, padding: 14 },
  floatingButton: { alignItems: "center", backgroundColor: medicalTheme.primary, borderRadius: 999, bottom: 24, height: 58, justifyContent: "center", position: "absolute", right: 24, shadowColor: medicalTheme.primary, shadowOpacity: 0.36, shadowRadius: 16, width: 58, zIndex: 100 },
  fullscreen: { bottom: 18, left: 18, position: "absolute", right: 18, top: 18, width: "auto" },
  header: { alignItems: "center", borderBottomColor: medicalTheme.border, borderBottomWidth: 1, flexDirection: "row", gap: 8, justifyContent: "space-between", paddingBottom: 10 },
  headerActions: { flexDirection: "row", gap: 6 },
  headerTitle: { flex: 1 },
  iconButton: { alignItems: "center", backgroundColor: medicalTheme.surface, borderColor: medicalTheme.border, borderRadius: 9, borderWidth: 1, height: 30, justifyContent: "center", width: 30 },
  input: { backgroundColor: medicalTheme.surface, borderColor: medicalTheme.border, borderRadius: 14, borderWidth: 1, color: medicalTheme.text, flex: 1, maxHeight: 110, minHeight: 46, padding: 10 },
  markdown: { gap: 2 },
  markdownBullet: { color: medicalTheme.text, fontSize: 12, lineHeight: 19 },
  markdownCode: { backgroundColor: "#020617", borderRadius: 6, color: "#BAE6FD", fontFamily: "monospace", fontSize: 11, padding: 4 },
  markdownHeading: { color: medicalTheme.text, fontSize: 14, fontWeight: "900", marginTop: 4 },
  message: { borderRadius: 14, borderWidth: 1, gap: 3, maxWidth: "92%", padding: 10 },
  messageRole: { color: medicalTheme.primary, fontSize: 10, fontWeight: "900", textTransform: "uppercase" },
  messageText: { color: medicalTheme.text, fontSize: 12, lineHeight: 19 },
  messages: { flex: 1, minHeight: 260 },
  minimized: { height: 58, overflow: "hidden" },
  ownerMetric: { color: medicalTheme.muted, fontSize: 11, fontWeight: "800" },
  ownerPanel: { backgroundColor: medicalTheme.surface, borderColor: medicalTheme.border, borderRadius: 12, borderWidth: 1, gap: 8, padding: 10 },
  ownerTitle: { color: medicalTheme.text, fontSize: 12, fontWeight: "900" },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  search: { backgroundColor: medicalTheme.surface, borderColor: medicalTheme.border, borderRadius: 12, borderWidth: 1, color: medicalTheme.text, minHeight: 40, paddingHorizontal: 10 },
  sidebar: { gap: 8, width: 210 },
  subtitle: { color: medicalTheme.muted, fontSize: 11, fontWeight: "800" },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  title: { color: medicalTheme.text, fontSize: 16, fontWeight: "900" },
  unreadBadge: { alignItems: "center", backgroundColor: medicalTheme.critical, borderRadius: 99, minWidth: 20, paddingHorizontal: 5, position: "absolute", right: -2, top: -2 },
  unreadText: { color: "#fff", fontSize: 10, fontWeight: "900" },
  userMessage: { alignSelf: "flex-end", backgroundColor: "#0E3345", borderColor: "#1F7085" },
  widget: { backgroundColor: medicalTheme.card, borderColor: medicalTheme.border, borderRadius: 20, borderWidth: 1, bottom: 24, height: 660, maxHeight: "88%", padding: 14, position: "absolute", right: 24, shadowColor: "#000", shadowOpacity: 0.35, shadowRadius: 24, width: 780, zIndex: 100 },
});
