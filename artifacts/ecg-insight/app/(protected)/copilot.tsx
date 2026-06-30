import { Feather } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Image, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";

import { Badge, Card, EmptyState, medicalTheme, PrimaryButton } from "@/components/enterprise/EnterpriseUI";
import { useAuth } from "@/context/AuthContext";
import {
  downloadCopilotExport,
  getCopilotSettings,
  getCopilotConversation,
  listCopilotConversations,
  streamCopilotMessage,
  uploadCopilotAttachment,
  type CopilotAttachment,
  type CopilotConversation,
  type CopilotIntentDebug,
  type CopilotMessage,
  type CopilotTag,
} from "@/services/copilot";
import { safeArray } from "@/utils/collections";

type AttachmentKind = "ecg" | "file" | "image";
type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onend: (() => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onresult: ((event: { results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }> }) => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechWindow = Window & {
  SpeechRecognition?: new () => SpeechRecognitionLike;
  webkitSpeechRecognition?: new () => SpeechRecognitionLike;
};

type SpeechControl = {
  muted: boolean;
  onMuteToggle: () => void;
  onPauseResume: () => void;
  onReplay: (content: string, id: string) => void;
  onSpeak: (content: string, id: string) => void;
  onStop: () => void;
  paused: boolean;
  speakingMessageId?: string;
};

const ATTACHMENT_RULES: Record<AttachmentKind, { accept: string; extensions: string[]; maxBytes: number; multiple: boolean }> = {
  ecg: { accept: ".jpg,.jpeg,.png,.pdf,application/pdf,image/jpeg,image/png", extensions: [".jpg", ".jpeg", ".pdf", ".png"], maxBytes: 25 * 1024 * 1024, multiple: true },
  file: { accept: ".pdf,.docx,.txt,.jpg,.jpeg,.png,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,image/jpeg,image/png", extensions: [".docx", ".jpg", ".jpeg", ".pdf", ".png", ".txt"], maxBytes: 25 * 1024 * 1024, multiple: true },
  image: { accept: "image/*,.jpg,.jpeg,.png,.webp", extensions: [".jpg", ".jpeg", ".png", ".webp"], maxBytes: 25 * 1024 * 1024, multiple: true },
};

const EMPTY_MESSAGES = [
  "Start a natural conversation — say hello, ask a cardiology question, or upload an ECG when you're ready.",
];

const WORKSPACE_STATE_KEY = "ecg-insight:copilot-workspace-state";

function sanitizeAssistantContent(content: string) {
  return content
    .replace(/^##+\s.+$/gm, "")
    .replace(/^Short Answer\s*$/gim, "")
    .replace(/^References:[\s\S]*$/im, "")
    .replace(/\nConfidence Score:\s*\d+%/gi, "")
    .replace(/\nCitations:\s*.+$/gim, "")
    .replace(/Risk tier:\s*(HIGH|MODERATE|LOW)/gi, "")
    .replace(/Knowledge Base|Retrieved Medical Knowledge|Conversation memory:|Previously uploaded files:|Uploaded Document Review|I can go deeper if you want\.?/gi, "")
    .replace(/Continuing from our earlier discussion about .+?\./gi, "")
    .replace(/I am using the earlier messages in this conversation for context\./gi, "")
    .replace(/AI assistance only\. Clinical decisions remain the responsibility of the physician\./gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function safeString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function safeDateTime(value: unknown, fallback = "Unknown time") {
  const date = new Date(safeString(value));
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

function safeTime(value: unknown, fallback = "--:--") {
  const date = new Date(safeString(value));
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function CopilotRoute() {
  return <CopilotWorkspaceScreen />;
}

export function CopilotWorkspaceScreen({ routeConversationId }: { routeConversationId?: string }) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { caseId: scopedCaseId, patientId: scopedPatientId } = useLocalSearchParams<{ caseId?: string; patientId?: string }>();
  const attachmentPreviewsRef = useRef<Record<string, string>>({});
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const streamAbort = useRef<AbortController | null>(null);
  const { width } = useWindowDimensions();
  const { authToken, user } = useAuth();
  const token = authToken?.token;
  const [voiceMode, setVoiceMode] = useState(false);
  const [actionNotice, setActionNotice] = useState<{ tone: "error" | "success"; text: string } | undefined>();
  const [attachments, setAttachments] = useState<CopilotAttachment[]>([]);
  const [attachmentPreviews, setAttachmentPreviews] = useState<Record<string, string>>({});
  const [draft, setDraft] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [speechMuted, setSpeechMuted] = useState(false);
  const [speechPaused, setSpeechPaused] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | undefined>();
  const [intentDebug, setIntentDebug] = useState<CopilotIntentDebug | undefined>();
  const [showIntentDebug, setShowIntentDebug] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState("");
  const [status, setStatus] = useState("");
  const [uploadingFiles, setUploadingFiles] = useState<string[]>([]);

  const isMobile = width < 760;

  const settingsQuery = useQuery({
    enabled: !!token && (user?.protectedOwner || user?.role === "super_admin"),
    queryFn: () => getCopilotSettings(token!),
    queryKey: ["copilot-settings", token],
    retry: false,
  });
  const developerModeEnabled = useMemo(() => {
    const provider = settingsQuery.data?.settings.provider ?? "";
    if (provider.startsWith("{")) {
      try {
        return Boolean(JSON.parse(provider).developerMode);
      } catch {
        return false;
      }
    }
    return provider.includes("Debug") || __DEV__;
  }, [settingsQuery.data?.settings.provider]);

  const conversationsQuery = useQuery({
    enabled: !!token,
    queryFn: () => listCopilotConversations(token!),
    queryKey: ["copilot-workspace-conversations", token],
    retry: false,
  });
  const selectedQuery = useQuery({
    enabled: !!token && !!selectedId,
    queryFn: () => getCopilotConversation(token!, selectedId!),
    queryKey: ["copilot-workspace-conversation", token, selectedId],
    retry: false,
  });

  const conversations = safeArray(conversationsQuery.data?.conversations);
  const messages = safeArray(selectedQuery.data?.messages);
  const selectedConversation = conversations.find((item) => item.id === selectedId) ?? selectedQuery.data?.conversation;
  const explicitCaseId = typeof scopedCaseId === "string" && scopedCaseId.trim() ? scopedCaseId : undefined;
  const explicitPatientId = typeof scopedPatientId === "string" && scopedPatientId.trim() ? scopedPatientId : undefined;
  const characterCount = draft.length;
  const chatTitle = selectedConversation?.title ?? "New Clinical Conversation";

  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["copilot-workspace-conversations", token] });
    if (selectedId) void queryClient.invalidateQueries({ queryKey: ["copilot-workspace-conversation", token, selectedId] });
  }, [queryClient, selectedId, token]);

  const showActionNotice = useCallback((text: string, tone: "error" | "success" = "success") => {
    setActionNotice({ text, tone });
  }, []);

  const stopVoiceInput = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setIsRecording(false);
  }, []);

  const uploadComposerFile = useCallback(async (file: File, kind: AttachmentKind) => {
    if (!token) {
      showActionNotice("Upload failed.", "error");
      return;
    }
    const rule = ATTACHMENT_RULES[kind];
    const extension = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
    if (!rule.extensions.includes(extension)) {
      showActionNotice("Unsupported format.", "error");
      return;
    }
    if (file.size > rule.maxBytes) {
      showActionNotice("File too large.", "error");
      return;
    }
    const formData = new FormData();
    formData.append("file", file);
    formData.append("kind", kind);
    formData.append("contextType", explicitCaseId ? "case" : explicitPatientId ? "patient" : "global");
    if (explicitPatientId) formData.append("patientId", explicitPatientId);
    if (explicitCaseId) formData.append("caseId", explicitCaseId);
    if (selectedId) formData.append("conversationId", selectedId);
    try {
      setUploadingFiles((current) => current.concat(file.name));
      const payload = await uploadCopilotAttachment(token, formData);
      if (!payload?.attachment?.id) {
        showActionNotice("Upload response was incomplete.", "error");
        return;
      }
      if (file.type.startsWith("image/")) {
        const previewUrl = URL.createObjectURL(file);
        setAttachmentPreviews((current) => ({ ...current, [payload.attachment.id]: previewUrl }));
      }
      setAttachments((current) => current.concat(payload.attachment));
      showActionNotice(`${payload.attachment.originalName} attached.`);
    } catch (error) {
      showActionNotice(error instanceof Error ? error.message : "Upload failed.", "error");
    } finally {
      setUploadingFiles((current) => safeArray(current).filter((item) => item !== file.name));
    }
  }, [explicitCaseId, explicitPatientId, selectedId, showActionNotice, token]);

  const openFilePicker = useCallback((kind: AttachmentKind) => {
    if (Platform.OS !== "web" || typeof document === "undefined") {
      showActionNotice("Upload failed.", "error");
      return;
    }
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ATTACHMENT_RULES[kind].accept;
    input.multiple = ATTACHMENT_RULES[kind].multiple;
    input.onchange = () => {
      const files = Array.from(input.files ?? []);
      if (!files.length) return;
      void Promise.all(files.map((file) => uploadComposerFile(file, kind)));
    };
    input.click();
  }, [showActionNotice, uploadComposerFile]);

  const toggleVoiceInput = useCallback(() => {
    if (isRecording) {
      stopVoiceInput();
      return;
    }
    if (Platform.OS !== "web" || typeof window === "undefined") {
      showActionNotice("Voice input is not supported by this browser.", "error");
      return;
    }
    const speechWindow = window as SpeechWindow;
    const Recognition = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
    if (!Recognition) {
      showActionNotice("Voice input is not supported by this browser.", "error");
      return;
    }
    try {
      const recognition = new Recognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";
      recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map((result) => result[0].transcript)
          .join(" ")
          .trim();
        if (transcript) setDraft((current) => `${current}${current ? " " : ""}${transcript}`.trimStart());
      };
      recognition.onerror = (event) => {
        stopVoiceInput();
        showActionNotice(event.error === "not-allowed" ? "Microphone denied. Microphone permission denied." : "Voice input failed.", "error");
      };
      recognition.onend = () => setIsRecording(false);
      recognitionRef.current = recognition;
      recognition.start();
      setIsRecording(true);
      showActionNotice("Voice recording started.");
    } catch {
      showActionNotice("Microphone denied. Microphone permission denied.", "error");
    }
  }, [isRecording, showActionNotice, stopVoiceInput]);

  const stopSpeaking = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setSpeakingMessageId(undefined);
    setSpeechPaused(false);
  }, []);

  const speakAssistantMessage = useCallback((content: string, messageId: string) => {
    const text = content
      .replace(/^#{1,3}\s+/gm, "")
      .replace(/\[[^\]]+\]/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (!text) {
      showActionNotice("No answer text available for speech.", "error");
      return;
    }
    if (speechMuted) {
      showActionNotice("Voice output is muted.", "error");
      return;
    }
    if (typeof window === "undefined" || !("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) {
      showActionNotice("Voice playback is not supported by this browser.", "error");
      return;
    }
    window.speechSynthesis.cancel();
    const SpeechUtterance = window.SpeechSynthesisUtterance;
    const utterance = new SpeechUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1;
    utterance.onend = () => {
      setSpeakingMessageId(undefined);
      setSpeechPaused(false);
    };
    utterance.onerror = () => {
      setSpeakingMessageId(undefined);
      setSpeechPaused(false);
      showActionNotice("Voice playback failed.", "error");
    };
    setSpeakingMessageId(messageId);
    setSpeechPaused(false);
    try {
      window.speechSynthesis.speak(utterance);
    } catch {
      setSpeakingMessageId(undefined);
      setSpeechPaused(false);
      showActionNotice("Voice playback failed.", "error");
    }
  }, [showActionNotice, speechMuted]);

  const pauseOrResumeSpeech = useCallback(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window) || !speakingMessageId) return;
    if (speechPaused) {
      window.speechSynthesis.resume();
      setSpeechPaused(false);
      return;
    }
    window.speechSynthesis.pause();
    setSpeechPaused(true);
  }, [speakingMessageId, speechPaused]);

  const replaySpeech = useCallback((content: string, id: string) => {
    speakAssistantMessage(content, id);
  }, [speakAssistantMessage]);

  const toggleSpeechMute = useCallback(() => {
    setSpeechMuted((current) => {
      const next = !current;
      if (next) stopSpeaking();
      return next;
    });
  }, [stopSpeaking]);

  const navigateConversation = useCallback((conversationId: string) => {
    setSelectedId(conversationId);
    setMobileSidebarOpen(false);
    router.push(`/copilot/${conversationId}` as never);
  }, [router]);

  const sendMutation = useMutation({
    mutationFn: async (input: { attachmentIds: string[]; prompt: string; tag: CopilotTag }) => {
      const controller = new AbortController();
      streamAbort.current = controller;
      setStatus("Thinking...");
      setStreamingMessage("");
      setIntentDebug(undefined);
      let finalConversation: CopilotConversation | undefined;
      await streamCopilotMessage(token!, {
        caseId: explicitCaseId,
        attachmentIds: input.attachmentIds,
        contextPath: "/copilot",
        contextType: explicitCaseId ? "case" : explicitPatientId ? "patient" : "global",
        conversationId: selectedId,
        patientId: explicitPatientId,
        question: input.prompt,
        tag: input.tag,
      }, (event) => {
        if (event.type === "status") setStatus(event.status ?? "");
        if (event.type === "intent_debug" && event.intentDebug) setIntentDebug(event.intentDebug);
        if (event.type === "token" && event.token) setStreamingMessage((current) => `${current}${event.token}`);
        if (event.conversation) {
          finalConversation = event.conversation;
          setSelectedId(event.conversation.id);
          router.replace(`/copilot/${event.conversation.id}` as never);
        }
      }, controller.signal);
      return finalConversation;
    },
    retry: 1,
    retryDelay: 1200,
    onSuccess: () => {
      Object.values(attachmentPreviews).forEach((previewUrl) => URL.revokeObjectURL(previewUrl));
      setAttachments([]);
      setAttachmentPreviews({});
      setDraft("");
      setStatus("");
      setStreamingMessage("");
      streamAbort.current = null;
      invalidate();
    },
    onError: () => {
      setStatus("Connection interrupted. Your conversation is saved; please retry when ready.");
      setStreamingMessage("");
      streamAbort.current = null;
    },
  });

  useEffect(() => {
    if (routeConversationId && routeConversationId !== selectedId) setSelectedId(routeConversationId);
  }, [routeConversationId, selectedId]);

  useEffect(() => {
    if (routeConversationId || selectedId || typeof window === "undefined") return;
    const rawState = window.localStorage.getItem(WORKSPACE_STATE_KEY);
    if (!rawState) return;
    try {
      const saved = JSON.parse(rawState) as { selectedId?: unknown };
      if (typeof saved.selectedId === "string" && saved.selectedId.trim()) router.replace(`/copilot/${saved.selectedId}` as never);
    } catch {
      window.localStorage.removeItem(WORKSPACE_STATE_KEY);
    }
  }, [routeConversationId, router, selectedId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(WORKSPACE_STATE_KEY, JSON.stringify({ selectedId }));
    } catch {
      window.localStorage.removeItem(WORKSPACE_STATE_KEY);
    }
  }, [selectedId]);

  useEffect(() => {
    attachmentPreviewsRef.current = attachmentPreviews;
  }, [attachmentPreviews]);

  useEffect(() => () => {
    Object.values(attachmentPreviewsRef.current).forEach((previewUrl) => URL.revokeObjectURL(previewUrl));
  }, []);

  useEffect(() => {
    if (!routeConversationId && selectedId) setSelectedId(undefined);
  }, [routeConversationId, selectedId]);

  useEffect(() => {
    if (selectedQuery.isError && routeConversationId) {
      setSelectedId(undefined);
      router.replace("/copilot" as never);
    }
  }, [routeConversationId, router, selectedQuery.isError]);

  useEffect(() => {
    if (typeof window !== "undefined" && selectedId && !streamingMessage) {
      const savedScroll = Number(window.localStorage.getItem(`${WORKSPACE_STATE_KEY}:scroll:${selectedId}`));
      if (Number.isFinite(savedScroll) && savedScroll > 0) {
        scrollRef.current?.scrollTo({ animated: false, y: savedScroll });
        return;
      }
    }
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages.length, selectedId, streamingMessage]);

  function sendPrompt(prompt: string, tag: CopilotTag) {
    const trimmed = safeString(prompt).trim() || (attachments.length ? "Review the attached medical files, perform OCR-informed analysis, identify document or image type, explain findings, cite trusted medical knowledge, provide warnings, and suggest next steps." : "");
    if (!trimmed || !token || sendMutation.isPending) return;
    sendMutation.mutate({ attachmentIds: safeArray(attachments).map((attachment) => attachment?.id).filter(Boolean) as string[], prompt: trimmed, tag });
  }

  function startNewChat() {
    setSelectedId(undefined);
    setAttachments([]);
    Object.values(attachmentPreviews).forEach((previewUrl) => URL.revokeObjectURL(previewUrl));
    setAttachmentPreviews({});
    setDraft("");
    setStatus("");
    setStreamingMessage("");
    setMobileSidebarOpen(false);
    router.replace("/copilot" as never);
  }

  function regenerateLastAnswer() {
    const lastUserMessage = [...messages].reverse().find((message) => message.role === "user");
    if (lastUserMessage) sendPrompt(lastUserMessage.content, selectedConversation?.tag ?? "Clinical Summary");
  }

  function continueGeneration() {
    sendPrompt("Continue the previous answer with the same clinical topic.", selectedConversation?.tag ?? "Clinical Summary");
  }

  async function exportConversation(format: "pdf" | "txt") {
    if (!selectedId || !token || typeof window === "undefined") {
      showActionNotice("Select a conversation before exporting.", "error");
      return;
    }
    try {
      const blob = await downloadCopilotExport(token, selectedId, format);
      downloadBlob(blob, `${selectedConversation?.title ?? "copilot-conversation"}.${format}`);
      showActionNotice(format === "pdf" ? "PDF export downloaded." : "TXT export downloaded.");
    } catch {
      showActionNotice("Export failed.", "error");
    }
  }

  async function shareConversation() {
    if (!selectedId || !token || typeof window === "undefined") {
      showActionNotice("Select a conversation before sharing.", "error");
      return;
    }
    const deepLink = `${window.location.origin}/copilot/${selectedId}`;
    const text = [selectedConversation?.title ?? "ECG Insight AI Copilot conversation", deepLink, ...messages.map((message) => `${safeString(message?.role, "message").toUpperCase()}: ${safeString(message?.content)}`)].join("\n\n");
    const webNavigator = navigator as Navigator & {
      clipboard?: { writeText: (text: string) => Promise<void> };
      share?: (data: { text: string; title: string; url: string }) => Promise<void>;
    };
    try {
      if (webNavigator.share) {
        await webNavigator.share({ text, title: "ECG Insight AI Copilot conversation", url: deepLink });
        showActionNotice("Share sheet opened.");
        return;
      }
    } catch {
      // Fall through to clipboard/download sharing when native share is unavailable or cancelled.
    }
    try {
      if (!webNavigator.clipboard) throw new Error("Clipboard unavailable.");
      await webNavigator.clipboard.writeText(text);
      showActionNotice("Conversation deep link and text copied.");
    } catch {
      downloadBlob(new Blob([text], { type: "text/plain;charset=utf-8" }), `${selectedConversation?.title ?? "copilot-conversation"}-share.txt`);
      showActionNotice("Clipboard unavailable. Conversation text downloaded.");
    }
  }

  const sidebarVisible = !isMobile || mobileSidebarOpen;
  const speechControl: SpeechControl = {
    muted: speechMuted,
    onMuteToggle: toggleSpeechMute,
    onPauseResume: pauseOrResumeSpeech,
    onReplay: replaySpeech,
    onSpeak: speakAssistantMessage,
    onStop: stopSpeaking,
    paused: speechPaused,
    speakingMessageId,
  };

  return (
    <View style={styles.shell}>
      {sidebarVisible ? (
        <Card style={[styles.sidebar, isMobile && styles.sidebarMobile]}>
          <View style={styles.sidebarHeader}>
            <View>
              <Text style={styles.sidebarEyebrow}>ECG Insight</Text>
              <Text style={styles.sidebarTitle}>AI Copilot</Text>
            </View>
            {isMobile ? (
              <Pressable accessibilityRole="button" onPress={() => setMobileSidebarOpen(false)} style={styles.iconButton}>
                <Feather name="x" size={18} color={medicalTheme.text} />
              </Pressable>
            ) : null}
          </View>
          <PrimaryButton icon="plus" label="New Chat" onPress={startNewChat} />
          <ScrollView contentContainerStyle={styles.sidebarList} showsVerticalScrollIndicator={false}>
            <ConversationList conversations={conversations} onSelect={navigateConversation} selectedId={selectedId} />
          </ScrollView>
        </Card>
      ) : null}

      <View style={styles.main}>
        <View style={styles.topBar}>
          <View style={styles.topTitleBlock}>
            {isMobile ? (
              <Pressable accessibilityRole="button" onPress={() => setMobileSidebarOpen(true)} style={styles.iconButton}>
                <Feather name="menu" size={18} color={medicalTheme.text} />
              </Pressable>
            ) : null}
            <View style={styles.titleStack}>
              <Text style={styles.kicker}>Enterprise Medical AI</Text>
              <Text style={styles.workspaceTitle}>Clinical Copilot Workspace</Text>
            </View>
          </View>
          <View style={styles.topButtons}>
            <Badge label={sendMutation.isPending ? "Streaming" : voiceMode ? "Voice mode" : "Ready"} tone={sendMutation.isPending ? "warning" : "success"} />
            <Pressable accessibilityRole="button" onPress={() => setVoiceMode((current) => !current)} style={styles.contextToggle}>
              <Feather name={voiceMode ? "headphones" : "mic"} size={16} color={medicalTheme.primary} />
              <Text style={styles.contextToggleText}>{voiceMode ? "Voice mode on" : "Voice mode"}</Text>
            </Pressable>
            {developerModeEnabled ? (
              <Pressable accessibilityRole="button" onPress={() => setShowIntentDebug((current) => !current)} style={styles.contextToggle}>
                <Feather name="activity" size={16} color={medicalTheme.primary} />
                <Text style={styles.contextToggleText}>{showIntentDebug ? "Hide intent debug" : "Intent debug"}</Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        {developerModeEnabled && showIntentDebug && intentDebug ? (
          <View style={styles.intentDebugPanel}>
            <Text style={styles.intentDebugTitle}>Intent Classifier (Developer Mode)</Text>
            <Text style={styles.intentDebugLine}>Intent: {intentDebug.classification.primaryIntent} ({Math.round(intentDebug.classification.confidence * 100)}%)</Text>
            <Text style={styles.intentDebugLine}>Medical intent: {intentDebug.classification.primaryMedicalIntent}</Text>
            <Text style={styles.intentDebugLine}>Tools: {intentDebug.plan.tools.join(", ")}</Text>
            <Text style={styles.intentDebugLine}>Latency: {intentDebug.classification.executionTimeMs} ms</Text>
            <Text style={styles.intentDebugLine}>Emergency: {intentDebug.classification.emergencyPriority}</Text>
            {intentDebug.classification.intents.length > 1 ? (
              <Text style={styles.intentDebugLine}>Multi-intent: {intentDebug.classification.intents.map((item) => item.intent).join(" → ")}</Text>
            ) : null}
            {Object.entries(intentDebug.classification.entities).some(([, values]) => Array.isArray(values) && values.length > 0) ? (
              <Text style={styles.intentDebugLine}>
                Entities: {Object.entries(intentDebug.classification.entities).filter(([, values]) => Array.isArray(values) && values.length > 0).map(([key, values]) => `${key}=${(values as string[]).join("|")}`).join("; ")}
              </Text>
            ) : null}
          </View>
        ) : null}

        {actionNotice ? (
          <View style={[styles.actionNotice, actionNotice.tone === "error" ? styles.actionNoticeError : styles.actionNoticeSuccess]}>
            <Text style={styles.actionNoticeText}>{actionNotice.text}</Text>
            <Pressable accessibilityLabel="Dismiss action message" accessibilityRole="button" onPress={() => setActionNotice(undefined)} style={styles.actionNoticeDismiss}>
              <Feather name="x" size={13} color={medicalTheme.text} />
            </Pressable>
          </View>
        ) : null}

        <Card style={styles.chatPanel}>
          <View style={styles.chatHeader}>
            <View style={styles.chatIdentity}>
              <View style={styles.avatarGlow}>
                <Feather name="cpu" size={20} color={medicalTheme.primary} />
              </View>
              <View style={styles.chatHeaderMain}>
                <Text style={styles.titleInput}>{chatTitle}</Text>
                <Text style={styles.chatMeta}>
                  {selectedConversation?.tag ?? "Free medical conversation"} • {messages.length} messages
                </Text>
              </View>
            </View>
            <View style={styles.chatTools}>
              <HeaderTool disabled={!selectedId} icon="share-2" label="Share" onPress={shareConversation} />
              <HeaderTool disabled={!selectedId} icon="download" label="Export PDF" onPress={() => exportConversation("pdf")} />
              <HeaderTool disabled={!selectedId} icon="file" label="Export TXT" onPress={() => exportConversation("txt")} />
              <HeaderTool disabled={!messages.length || sendMutation.isPending} icon="refresh-cw" label="Regenerate" onPress={regenerateLastAnswer} />
              <HeaderTool disabled={!selectedId || sendMutation.isPending} icon="fast-forward" label="Continue" onPress={continueGeneration} />
            </View>
          </View>

          <ScrollView
            contentContainerStyle={styles.messageList}
            onScroll={({ nativeEvent }) => {
              if (typeof window !== "undefined") {
                try {
                  window.localStorage.setItem(`${WORKSPACE_STATE_KEY}:scroll:${selectedId ?? "new"}`, String(nativeEvent.contentOffset.y));
                } catch {
                  // Ignore browser storage failures; chat rendering must never depend on scroll persistence.
                }
              }
            }}
            ref={scrollRef}
            scrollEventThrottle={400}
            style={styles.messages}
          >
            {!messages.length && !streamingMessage ? (
              <View style={styles.emptyChat}>
                <Text style={styles.emptyTitle}>Start a clinical conversation</Text>
                {EMPTY_MESSAGES.map((message) => <Text key={message} style={styles.emptyMessage}>{message}</Text>)}
              </View>
            ) : null}
            {messages.map((message, index) => <MessageCard key={message?.id ?? `message-${index}`} message={message} onNotice={showActionNotice} speechControl={speechControl} />)}
            {status && !streamingMessage ? <Text style={styles.statusText}>{status}</Text> : null}
            {streamingMessage ? <MessageCard message={{ attachments: [], citations: [], content: streamingMessage, createdAt: new Date().toISOString(), id: "streaming", role: "assistant" }} onNotice={showActionNotice} speechControl={speechControl} /> : null}
          </ScrollView>

          <View style={styles.composer}>
            <View style={styles.attachmentRow}>
              <ComposerTool active={isRecording} icon="mic" label={isRecording ? "Stop Voice" : "Voice"} onPress={toggleVoiceInput} />
              <ComposerTool icon="activity" label="Upload ECG" onPress={() => openFilePicker("ecg")} />
              <ComposerTool icon="paperclip" label="Upload Files" onPress={() => openFilePicker("file")} />
              <ComposerTool icon="image" label="Upload Image" onPress={() => openFilePicker("image")} />
            </View>
            {attachments.length ? (
              <View style={styles.attachmentPanel}>
                {attachments.map((attachment, index) => (
                  <AttachmentChip
                    attachment={attachment}
                    key={attachment?.id ?? `attachment-${index}`}
                    onRemove={() => {
                      const attachmentId = attachment?.id;
                      if (!attachmentId) return;
                      const previewUrl = attachmentPreviews[attachmentId];
                      if (previewUrl) URL.revokeObjectURL(previewUrl);
                      setAttachmentPreviews((current) => {
                        const next = { ...current };
                        delete next[attachmentId];
                        return next;
                      });
                      setAttachments((current) => safeArray(current).filter((item) => item?.id !== attachmentId));
                    }}
                    previewUrl={attachment?.id ? attachmentPreviews[attachment.id] : undefined}
                  />
                ))}
              </View>
            ) : null}
            {uploadingFiles.length ? (
              <View style={styles.uploadProgress}>
                <Feather name="loader" size={13} color={medicalTheme.primary} />
                <Text style={styles.uploadProgressText}>Uploading {uploadingFiles.join(", ")}...</Text>
              </View>
            ) : null}
            <View style={styles.inputRow}>
              <TextInput
                multiline
                onChangeText={setDraft}
                onKeyPress={({ nativeEvent }) => {
                  if (Platform.OS !== "web") return;
                  const event = nativeEvent as unknown as { key?: string; shiftKey?: boolean };
                  if (event.key === "Enter" && !event.shiftKey) sendPrompt(draft, "Clinical Summary");
                }}
                placeholder="Message the assistant..."
                placeholderTextColor={medicalTheme.muted}
                style={styles.composerInput}
                value={draft}
              />
              <PrimaryButton disabled={(!draft.trim() && !attachments.length) || sendMutation.isPending} icon="send" label="Send" onPress={() => sendPrompt(draft, "Clinical Summary")} />
              <PrimaryButton disabled={!sendMutation.isPending} icon="square" label="Stop" onPress={() => { streamAbort.current?.abort(); setStatus(""); setStreamingMessage(""); }} variant="outline" />
            </View>
            <Text style={styles.counter}>{characterCount}/8000 • Enter sends • Shift+Enter creates a new line</Text>
          </View>
        </Card>
      </View>
    </View>
  );
}

function ConversationList({
  conversations,
  onSelect,
  selectedId,
}: {
  conversations: CopilotConversation[];
  onSelect: (id: string) => void;
  selectedId?: string;
}) {
  const safeConversations = safeArray(conversations);
  return (
    <View style={styles.group}>
      <View style={styles.groupHeader}>
        <Feather name="message-square" size={13} color={medicalTheme.primary} />
        <Text style={styles.groupTitle}>Conversations</Text>
      </View>
      {safeConversations.length ? safeConversations.slice(0, 50).map((conversation, index) => {
        const conversationId = safeString(conversation?.id);
        if (!conversationId) return null;
        return (
        <Pressable accessibilityRole="button" key={conversationId || `conversation-${index}`} onPress={() => onSelect(conversationId)} style={[styles.conversationItem, selectedId === conversationId && styles.conversationItemActive]}>
          <Text numberOfLines={1} style={styles.conversationTitle}>{safeString(conversation?.title, "New Clinical Conversation")}</Text>
          <Text numberOfLines={2} style={styles.conversationPreview}>{safeString(conversation?.lastMessagePreview, "No messages yet.")}</Text>
          <Text style={styles.conversationMeta}>{safeDateTime(conversation?.updatedAt)}</Text>
        </Pressable>
        );
      }) : <Text style={styles.emptyText}>No conversations yet.</Text>}
    </View>
  );
}

function MessageCard({ message, onNotice, speechControl }: { message: CopilotMessage; onNotice: (text: string, tone?: "error" | "success") => void; speechControl: SpeechControl }) {
  const assistant = message?.role === "assistant";
  const attachments = safeArray(message?.attachments);
  const rawContent = safeString(message?.content);
  const content = assistant ? sanitizeAssistantContent(rawContent) : rawContent;
  const messageId = safeString(message?.id, "assistant-message");
  const isSpeaking = assistant && speechControl.speakingMessageId === messageId;
  return (
    <View style={[styles.message, assistant ? styles.assistantMessage : styles.userMessage]}>
      <View style={styles.messageTop}>
        <Text style={styles.messageRole}>{assistant ? "Assistant" : "You"}</Text>
        <Text style={styles.messageTime}>{safeTime(message?.createdAt)}</Text>
      </View>
      <RichMedicalText content={content} />
      {attachments.length ? (
        <View style={styles.messageAttachments}>
          {attachments.map((attachment, index) => <AttachmentChip attachment={attachment} key={attachment?.id ?? `message-attachment-${index}`} />)}
        </View>
      ) : null}
      {assistant ? (
        <View style={styles.answerTools}>
          <MiniAction icon="copy" label="Copy answer" onPress={() => copyText(content, onNotice)} />
          <MiniAction icon="volume-2" label="Play answer" onPress={() => speechControl.onSpeak(content, messageId)} />
          <MiniAction icon="repeat" label="Replay answer" onPress={() => speechControl.onReplay(content, messageId)} />
          <MiniAction disabled={!isSpeaking} icon={speechControl.paused ? "play" : "pause"} label={speechControl.paused ? "Resume voice" : "Pause voice"} onPress={speechControl.onPauseResume} />
          <MiniAction icon="square" label="Stop voice" onPress={speechControl.onStop} />
          <MiniAction active={speechControl.muted} icon={speechControl.muted ? "volume-x" : "volume-1"} label={speechControl.muted ? "Unmute voice" : "Mute voice"} onPress={speechControl.onMuteToggle} />
          {isSpeaking ? <Text style={styles.speakingState}>{speechControl.paused ? "Voice paused" : "Speaking..."}</Text> : null}
        </View>
      ) : null}
    </View>
  );
}

function RichMedicalText({ content }: { content: string }) {
  const lines = safeString(content).split("\n");
  let inCode = false;
  return (
    <View style={styles.richText}>
      {lines.map((line, index) => {
        if (line.trim().startsWith("```")) {
          inCode = !inCode;
          return <View key={`code-marker-${index}`} />;
        }
        if (inCode) return <Text key={index} style={styles.codeText}>{line || " "}</Text>;
        if (!line.trim()) return <View key={`space-${index}`} style={styles.messageSpace} />;
        if (line.startsWith("## ")) return <Text key={index} style={styles.messageHeading}>{line.replace(/^##\s*/, "")}</Text>;
        if (line.startsWith("### ")) return <Text key={index} style={styles.messageSubheading}>{line.replace(/^###\s*/, "")}</Text>;
        if (line.startsWith("- ")) return <Text key={index} style={styles.messageBullet}>• {line.slice(2)}</Text>;
        if (/^\d+\.\s/.test(line)) return <Text key={index} style={styles.messageText}>{line}</Text>;
        if (line.includes("|")) return <Text key={index} style={styles.messageTable}>{line}</Text>;
        return <Text key={index} style={styles.messageText}>{line}</Text>;
      })}
    </View>
  );
}

function HeaderTool({ disabled, icon, label, onPress }: { disabled?: boolean; icon: keyof typeof Feather.glyphMap; label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={[styles.headerTool, disabled && styles.disabled]}>
      <Feather name={icon} size={14} color={medicalTheme.primary} />
      <Text style={styles.headerToolText}>{label}</Text>
    </Pressable>
  );
}

function MiniAction({ active, disabled, icon, label, onPress, tone }: { active?: boolean; disabled?: boolean; icon: keyof typeof Feather.glyphMap; label: string; onPress: () => void; tone?: "danger" }) {
  return (
    <Pressable accessibilityLabel={label} accessibilityRole="button" disabled={disabled} onPress={onPress} style={[styles.miniAction, active && styles.miniActionActive, disabled && styles.disabled]}>
      <Feather name={icon} size={12} color={tone === "danger" ? medicalTheme.critical : active ? medicalTheme.primary : medicalTheme.muted} />
    </Pressable>
  );
}

function AttachmentChip({ attachment, onRemove, previewUrl }: { attachment: CopilotAttachment; onRemove?: () => void; previewUrl?: string }) {
  const originalName = safeString(attachment?.originalName, "Uploaded file");
  const attachmentKind = safeString(attachment?.kind, "file");
  return (
    <View style={styles.attachmentChip}>
      {previewUrl ? <Image accessibilityLabel={`${originalName} preview`} source={{ uri: previewUrl }} style={styles.attachmentPreview} /> : null}
      <Feather name={attachmentKind === "camera" ? "camera" : attachmentKind === "image" ? "image" : attachmentKind === "ecg" ? "activity" : attachmentKind === "echo" ? "heart" : attachmentKind === "labs" ? "clipboard" : "paperclip"} size={13} color={medicalTheme.primary} />
      <View style={styles.attachmentChipText}>
        <Text numberOfLines={1} style={styles.attachmentName}>{originalName}</Text>
        <Text style={styles.attachmentMeta}>{formatFileSize(attachment?.sizeBytes)}</Text>
      </View>
      {onRemove ? (
        <Pressable accessibilityLabel={`Remove ${originalName}`} accessibilityRole="button" onPress={onRemove} style={styles.attachmentRemove}>
          <Feather name="x" size={12} color={medicalTheme.text} />
        </Pressable>
      ) : null}
    </View>
  );
}

function ComposerTool({ active, icon, label, onPress }: { active?: boolean; icon: keyof typeof Feather.glyphMap; label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={[styles.composerTool, active && styles.composerToolActive]}>
      <Feather name={icon} size={13} color={medicalTheme.primary} />
      <Text style={styles.composerToolText}>{label}</Text>
    </Pressable>
  );
}

function formatFileSize(sizeBytes: number | null | undefined) {
  const safeSize = typeof sizeBytes === "number" && Number.isFinite(sizeBytes) && sizeBytes >= 0 ? sizeBytes : undefined;
  if (safeSize === undefined) return "Unknown size";
  if (safeSize < 1024) return `${safeSize} B`;
  if (safeSize < 1024 * 1024) return `${Math.round(safeSize / 1024)} KB`;
  return `${(safeSize / (1024 * 1024)).toFixed(1)} MB`;
}

function copyText(content: string, onNotice?: (text: string, tone?: "error" | "success") => void) {
  if (typeof navigator !== "undefined" && "clipboard" in navigator) {
    void navigator.clipboard.writeText(content)
      .then(() => onNotice?.("Answer copied."))
      .catch(() => onNotice?.("Copy failed.", "error"));
    return;
  }
  onNotice?.("Copy is not available in this browser.", "error");
}

function downloadBlob(blob: Blob, filename: string) {
  if (typeof document === "undefined") return;
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = safeFileName(filename);
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function safeFileName(filename: string) {
  const dotIndex = filename.lastIndexOf(".");
  const extension = dotIndex >= 0 ? filename.slice(dotIndex) : "";
  const basename = dotIndex >= 0 ? filename.slice(0, dotIndex) : filename;
  return `${basename.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "copilot-conversation"}${extension}`;
}

const glassBorder = "rgba(148,163,184,0.22)";

const styles = StyleSheet.create({
  actionBar: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: 9, paddingBottom: 2 },
  actionNotice: { alignItems: "center", borderRadius: 16, borderWidth: 1, flexDirection: "row", gap: 10, justifyContent: "space-between", paddingHorizontal: 12, paddingVertical: 10 },
  actionNoticeDismiss: { alignItems: "center", borderRadius: 999, height: 24, justifyContent: "center", width: 24 },
  actionNoticeError: { backgroundColor: "rgba(239,68,68,0.12)", borderColor: "rgba(239,68,68,0.35)" },
  actionNoticeSuccess: { backgroundColor: "rgba(34,197,94,0.1)", borderColor: "rgba(34,197,94,0.28)" },
  actionNoticeText: { color: medicalTheme.text, flex: 1, fontSize: 12, fontWeight: "900" },
  actionPill: { alignItems: "center", backgroundColor: "rgba(15,23,42,0.72)", borderColor: glassBorder, borderRadius: 999, borderWidth: 1, flexDirection: "row", gap: 7, paddingHorizontal: 12, paddingVertical: 9 },
  actionText: { color: medicalTheme.text, fontSize: 12, fontWeight: "900" },
  answerTools: { alignItems: "center", flexDirection: "row", gap: 10, marginTop: 8 },
  assistantMessage: { alignSelf: "flex-start", backgroundColor: "rgba(8,18,34,0.96)", borderColor: "rgba(20,221,230,0.22)" },
  attachmentChip: { alignItems: "center", backgroundColor: "rgba(20,221,230,0.08)", borderColor: glassBorder, borderRadius: 14, borderWidth: 1, flexDirection: "row", gap: 8, maxWidth: 260, paddingHorizontal: 10, paddingVertical: 8 },
  attachmentChipText: { flex: 1, minWidth: 0 },
  attachmentMeta: { color: medicalTheme.muted, fontSize: 10, fontWeight: "800" },
  attachmentName: { color: medicalTheme.text, fontSize: 12, fontWeight: "900" },
  attachmentPanel: { borderColor: "rgba(148,163,184,0.16)", borderRadius: 16, borderWidth: 1, flexDirection: "row", flexWrap: "wrap", gap: 8, padding: 8 },
  attachmentPreview: { backgroundColor: "rgba(2,6,23,0.72)", borderColor: glassBorder, borderRadius: 10, borderWidth: 1, height: 42, width: 42 },
  attachmentRemove: { alignItems: "center", backgroundColor: "rgba(239,68,68,0.18)", borderRadius: 999, height: 22, justifyContent: "center", width: 22 },
  attachmentRow: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: 8 },
  attachmentSummary: { color: medicalTheme.muted, fontSize: 10, fontWeight: "700", lineHeight: 14, marginTop: 3 },
  attachmentWarning: { color: medicalTheme.warning, fontSize: 10, fontWeight: "800", lineHeight: 14, marginTop: 3 },
  avatarGlow: { alignItems: "center", backgroundColor: "rgba(20,221,230,0.12)", borderColor: "rgba(20,221,230,0.35)", borderRadius: 16, borderWidth: 1, height: 44, justifyContent: "center", shadowColor: medicalTheme.primary, shadowOpacity: 0.3, shadowRadius: 18, width: 44 },
  chatHeader: { alignItems: "center", borderBottomColor: glassBorder, borderBottomWidth: 1, flexDirection: "row", flexWrap: "wrap", gap: 12, justifyContent: "space-between", paddingBottom: 12 },
  chatHeaderMain: { flex: 1, minWidth: 0 },
  chatIdentity: { alignItems: "center", flex: 1, flexDirection: "row", gap: 12, minWidth: 280 },
  chatMeta: { color: medicalTheme.muted, fontSize: 12, fontWeight: "800", marginTop: 4 },
  chatPanel: { backgroundColor: "rgba(2,6,23,0.82)", borderColor: glassBorder, flex: 1, gap: 12, minHeight: 0, minWidth: 320, padding: 16 },
  chatTools: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: 8 },
  citation: { alignItems: "center", backgroundColor: "rgba(20,221,230,0.08)", borderColor: glassBorder, borderRadius: 999, borderWidth: 1, flexDirection: "row", gap: 6, paddingHorizontal: 9, paddingVertical: 6 },
  citationText: { color: medicalTheme.text, fontSize: 11, fontWeight: "800" },
  citations: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
  codeText: { backgroundColor: "#020617", borderColor: glassBorder, borderRadius: 8, borderWidth: 1, color: "#D6E4FF", fontFamily: Platform.select({ web: "monospace", default: undefined }), fontSize: 12, lineHeight: 18, padding: 8 },
  composer: { backgroundColor: "rgba(15,23,42,0.92)", borderColor: glassBorder, borderRadius: 22, borderWidth: 1, gap: 10, padding: 12 },
  composerInput: { color: medicalTheme.text, flex: 1, fontSize: 14, lineHeight: 21, maxHeight: 150, minHeight: 54, minWidth: 240, padding: 10 },
  composerTool: { alignItems: "center", backgroundColor: "rgba(20,221,230,0.08)", borderColor: glassBorder, borderRadius: 999, borderWidth: 1, flexDirection: "row", gap: 6, paddingHorizontal: 9, paddingVertical: 6 },
  composerToolActive: { backgroundColor: "rgba(239,68,68,0.16)", borderColor: "rgba(239,68,68,0.45)" },
  composerToolText: { color: medicalTheme.text, fontSize: 11, fontWeight: "900" },
  confidence: { color: medicalTheme.success, fontSize: 11, fontWeight: "900" },
  contextBody: { gap: 8, paddingBottom: 12 },
  contextHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  contextIcon: { alignItems: "center", backgroundColor: "rgba(20,221,230,0.09)", borderRadius: 12, height: 34, justifyContent: "center", width: 34 },
  contextLabel: { color: medicalTheme.muted, fontSize: 11, fontWeight: "900", textTransform: "uppercase" },
  contextLine: { alignItems: "flex-start", borderBottomColor: "rgba(148,163,184,0.12)", borderBottomWidth: 1, flexDirection: "row", gap: 10, paddingVertical: 10 },
  contextPanel: { backgroundColor: "rgba(15,23,42,0.84)", borderColor: glassBorder, flexBasis: 320, gap: 12, width: 320 },
  contextPanelTablet: { display: "none" },
  contextText: { flex: 1, gap: 4 },
  contextTitle: { color: medicalTheme.text, fontSize: 16, fontWeight: "900" },
  contextToggle: { alignItems: "center", borderColor: glassBorder, borderRadius: 999, borderWidth: 1, flexDirection: "row", gap: 7, paddingHorizontal: 11, paddingVertical: 8 },
  contextToggleText: { color: medicalTheme.primary, fontSize: 12, fontWeight: "900" },
  contextValue: { color: medicalTheme.text, fontSize: 13, fontWeight: "800", lineHeight: 18 },
  conversationItem: { backgroundColor: "rgba(15,33,53,0.64)", borderColor: "transparent", borderRadius: 16, borderWidth: 1, gap: 8, padding: 10 },
  conversationItemActive: { borderColor: medicalTheme.primary, shadowColor: medicalTheme.primary, shadowOpacity: 0.24, shadowRadius: 16 },
  conversationMeta: { color: medicalTheme.muted, fontSize: 10, fontWeight: "800" },
  conversationPreview: { color: medicalTheme.muted, fontSize: 11, fontWeight: "700", lineHeight: 16 },
  conversationTitle: { color: medicalTheme.text, fontSize: 12, fontWeight: "900" },
  counter: { color: medicalTheme.muted, fontSize: 11, fontWeight: "800", textAlign: "right" },
  legalFooter: { color: medicalTheme.muted, fontSize: 10, fontWeight: "600", lineHeight: 14, marginTop: 6, textAlign: "center" },
  disabled: { opacity: 0.45 },
  dropHint: { color: medicalTheme.muted, fontSize: 11, fontWeight: "800" },
  emptyChat: { alignItems: "center", gap: 8, justifyContent: "center", minHeight: 320, padding: 28 },
  emptyMessage: { color: medicalTheme.muted, fontSize: 14, fontWeight: "700", lineHeight: 21, textAlign: "center" },
  emptyText: { color: medicalTheme.muted, fontSize: 12, fontWeight: "800" },
  emptyTitle: { color: medicalTheme.text, fontSize: 24, fontWeight: "900", textAlign: "center" },
  group: { gap: 8 },
  groupHeader: { alignItems: "center", flexDirection: "row", gap: 7 },
  groupTitle: { color: medicalTheme.primary, fontSize: 11, fontWeight: "900", textTransform: "uppercase" },
  headerTool: { alignItems: "center", backgroundColor: "rgba(15,33,53,0.72)", borderColor: glassBorder, borderRadius: 999, borderWidth: 1, flexDirection: "row", gap: 6, paddingHorizontal: 10, paddingVertical: 7 },
  headerToolText: { color: medicalTheme.text, fontSize: 11, fontWeight: "900" },
  iconButton: { alignItems: "center", backgroundColor: "rgba(15,33,53,0.86)", borderColor: glassBorder, borderRadius: 999, borderWidth: 1, height: 34, justifyContent: "center", width: 34 },
  intentDebugLine: { color: medicalTheme.muted, fontFamily: Platform.OS === "web" ? "monospace" : undefined, fontSize: 11, lineHeight: 16 },
  intentDebugPanel: { backgroundColor: "rgba(15,23,42,0.88)", borderColor: "rgba(56,189,248,0.35)", borderRadius: 14, borderWidth: 1, gap: 4, marginBottom: 10, padding: 12 },
  intentDebugTitle: { color: medicalTheme.primary, fontSize: 12, fontWeight: "900", marginBottom: 4 },
  inputRow: { alignItems: "flex-end", flexDirection: "row", flexWrap: "wrap", gap: 8 },
  kicker: { color: medicalTheme.primary, fontSize: 11, fontWeight: "900", letterSpacing: 1.2, textTransform: "uppercase" },
  main: { flex: 1, gap: 12, minHeight: 0, minWidth: 0 },
  message: { borderRadius: 20, borderWidth: 1, gap: 4, maxWidth: "86%", padding: 14 },
  messageBullet: { color: medicalTheme.text, fontSize: 14, lineHeight: 22, paddingLeft: 8 },
  messageHeading: { color: medicalTheme.text, fontSize: 16, fontWeight: "900", marginTop: 8 },
  messageList: { gap: 12, paddingBottom: 18 },
  messageAttachments: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  messageRole: { color: medicalTheme.primary, fontSize: 10, fontWeight: "900", textTransform: "uppercase" },
  messageSpace: { height: 5 },
  messageSubheading: { color: medicalTheme.primary, fontSize: 14, fontWeight: "900", marginTop: 6 },
  messageTable: { backgroundColor: "rgba(2,6,23,0.42)", borderColor: glassBorder, borderRadius: 8, borderWidth: 1, color: medicalTheme.text, fontFamily: Platform.select({ web: "monospace", default: undefined }), fontSize: 11, lineHeight: 17, padding: 6 },
  messageText: { color: medicalTheme.text, fontSize: 14, lineHeight: 22 },
  messageTime: { color: medicalTheme.muted, fontSize: 10, fontWeight: "800" },
  messageTop: { alignItems: "center", flexDirection: "row", gap: 8, justifyContent: "space-between" },
  messages: { flex: 1, minHeight: 0 },
  miniAction: { alignItems: "center", backgroundColor: "rgba(2,6,23,0.34)", borderRadius: 999, height: 24, justifyContent: "center", width: 24 },
  miniActionActive: { backgroundColor: "rgba(20,221,230,0.16)" },
  richText: { gap: 2 },
  shell: { backgroundColor: "#020617", flex: 1, flexDirection: "row", gap: 14, minHeight: Platform.OS === "web" ? "calc(100vh - 130px)" as unknown as number : 760, overflow: "hidden", padding: 2 },
  sidebar: { backgroundColor: "rgba(15,23,42,0.88)", borderColor: glassBorder, flexBasis: 320, gap: 12, padding: 14, width: 320 },
  sidebarEyebrow: { color: medicalTheme.primary, fontSize: 11, fontWeight: "900", letterSpacing: 1, textTransform: "uppercase" },
  sidebarHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  sidebarList: { gap: 14, paddingBottom: 20 },
  sidebarMobile: { bottom: 0, left: 0, position: "absolute", top: 0, zIndex: 20 },
  sidebarTitle: { color: medicalTheme.text, fontSize: 22, fontWeight: "900" },
  speakingState: { color: medicalTheme.primary, fontSize: 11, fontWeight: "900" },
  statusText: { color: medicalTheme.primary, fontSize: 13, fontWeight: "900", padding: 10 },
  titleInput: { borderBottomColor: "transparent", color: medicalTheme.text, fontSize: 18, fontWeight: "900", minHeight: 34, paddingVertical: 4 },
  titleStack: { gap: 2 },
  topBar: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: 12, justifyContent: "space-between" },
  topButtons: { alignItems: "center", flexDirection: "row", gap: 8 },
  topTitleBlock: { alignItems: "center", flexDirection: "row", gap: 10 },
  uploadProgress: { alignItems: "center", backgroundColor: "rgba(20,221,230,0.08)", borderColor: glassBorder, borderRadius: 999, borderWidth: 1, flexDirection: "row", gap: 8, paddingHorizontal: 10, paddingVertical: 7 },
  uploadProgressText: { color: medicalTheme.text, fontSize: 11, fontWeight: "900" },
  userMessage: { alignSelf: "flex-end", backgroundColor: "rgba(14,51,69,0.98)", borderColor: "#1F7085" },
  workspaceTitle: { color: medicalTheme.text, fontSize: 26, fontWeight: "900", letterSpacing: -0.7 },
});
