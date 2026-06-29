import { Feather } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";

import { Badge, Card, EmptyState, medicalTheme, PrimaryButton } from "@/components/enterprise/EnterpriseUI";
import { useAuth } from "@/context/AuthContext";
import { listCases, listPatients } from "@/services/clinical";
import {
  archiveCopilotConversation,
  createCopilotConversation,
  deleteCopilotConversation,
  duplicateCopilotConversation,
  favoriteCopilotConversation,
  getCopilotConversation,
  listCopilotConversations,
  pinCopilotConversation,
  renameCopilotConversation,
  restoreCopilotConversation,
  streamCopilotMessage,
  uploadCopilotAttachment,
  type CopilotAttachment,
  type CopilotCitation,
  type CopilotConversation,
  type CopilotMessage,
  type CopilotTag,
} from "@/services/copilot";

type WorkspacePrompt = {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  prompt: string;
  tag: CopilotTag;
};

type AttachmentKind = "ecg" | "echo" | "file" | "labs";
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

const ATTACHMENT_RULES: Record<AttachmentKind, { accept: string; extensions: string[]; maxBytes: number; multiple: boolean }> = {
  ecg: { accept: ".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf", extensions: [".jpg", ".jpeg", ".png", ".pdf"], maxBytes: 25 * 1024 * 1024, multiple: false },
  echo: { accept: ".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf", extensions: [".jpg", ".jpeg", ".png", ".pdf"], maxBytes: 25 * 1024 * 1024, multiple: false },
  labs: { accept: ".csv,.jpg,.jpeg,.png,.pdf,text/csv,image/jpeg,image/png,application/pdf", extensions: [".csv", ".jpg", ".jpeg", ".png", ".pdf"], maxBytes: 20 * 1024 * 1024, multiple: false },
  file: { accept: ".pdf,.docx,.txt,.csv,.jpg,.jpeg,.png,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/csv,image/jpeg,image/png", extensions: [".csv", ".docx", ".jpg", ".jpeg", ".pdf", ".png", ".txt"], maxBytes: 20 * 1024 * 1024, multiple: true },
};

const ACTIONS: WorkspacePrompt[] = [
  { icon: "activity", label: "Interpret ECG", prompt: "Interpret the active ECG using all available patient, case, file, note, report, and knowledge retrieval context. Include rhythm, intervals, morphology, red flags, and confidence.", tag: "ECG Interpretation" },
  { icon: "edit-3", label: "Generate Impression", prompt: "Generate a concise physician-ready ECG impression with clinical caveats, confidence, and urgent action criteria.", tag: "ECG Interpretation" },
  { icon: "user", label: "Patient Summary", prompt: "Summarize the current patient context, demographics, ECG history, uploaded documents, reports, labs, and clinically relevant risk factors.", tag: "Clinical Summary" },
  { icon: "git-branch", label: "Differential Diagnosis", prompt: "Provide a ranked differential diagnosis with ECG evidence, patient-context support, and recommended next discriminating tests.", tag: "Differential Diagnosis" },
  { icon: "briefcase", label: "Occupational Fitness", prompt: "Assess occupational fitness, restrictions, risk tier, return-to-work considerations, and follow-up requirements from the active ECG and patient context.", tag: "Occupational Fitness" },
  { icon: "calendar", label: "Follow-up Plan", prompt: "Create a follow-up plan with escalation thresholds, referral timing, repeat ECG guidance, and patient safety instructions.", tag: "Follow-up" },
  { icon: "file-text", label: "Generate Report", prompt: "Draft a structured medical ECG report including interpretation, impression, differential, recommendations, occupational considerations, and physician sign-off disclaimer.", tag: "Clinical Summary" },
];

const EMPTY_MESSAGES = [
  "Ask anything about ECG interpretation, clinical reasoning, occupational fitness, reports, or follow-up.",
  "Use the action bar above to inject a clinical workflow prompt into this persistent conversation.",
];

export default function CopilotRoute() {
  return <CopilotWorkspaceScreen />;
}

export function CopilotWorkspaceScreen({ routeConversationId }: { routeConversationId?: string }) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const streamAbort = useRef<AbortController | null>(null);
  const { width } = useWindowDimensions();
  const { authToken, user } = useAuth();
  const token = authToken?.token;
  const [conversationSearch, setConversationSearch] = useState("");
  const [contextOpen, setContextOpen] = useState(false);
  const [actionNotice, setActionNotice] = useState<{ tone: "error" | "success"; text: string } | undefined>();
  const [attachments, setAttachments] = useState<CopilotAttachment[]>([]);
  const [draft, setDraft] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [renameTitle, setRenameTitle] = useState("");
  const [renameTarget, setRenameTarget] = useState<CopilotConversation | undefined>();
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [streamingMessage, setStreamingMessage] = useState("");
  const [status, setStatus] = useState("");

  const isMobile = width < 760;
  const isTablet = width >= 760 && width < 1120;

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
  const characterCount = draft.length;

  const groupedConversations = useMemo(() => ({
    archived: conversations.filter((item) => !!item.archivedAt),
    favorites: conversations.filter((item) => item.isFavorite && !item.archivedAt),
    pinned: conversations.filter((item) => item.isPinned && !item.archivedAt),
    recent: conversations.filter((item) => !item.isPinned && !item.isFavorite && !item.archivedAt),
  }), [conversations]);

  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["copilot-workspace-conversations", token] });
    if (selectedId) void queryClient.invalidateQueries({ queryKey: ["copilot-workspace-conversation", token, selectedId] });
  }, [queryClient, selectedId, token]);

  const applyConversationPatch = useCallback((conversationId: string, patch: Partial<CopilotConversation>) => {
    queryClient.setQueriesData<{ conversations: CopilotConversation[] }>({ queryKey: ["copilot-workspace-conversations", token] }, (current) => {
      if (!current) return current;
      return {
        conversations: current.conversations.map((conversation) => conversation.id === conversationId ? { ...conversation, ...patch } : conversation),
      };
    });
    queryClient.setQueryData<{ conversation: CopilotConversation; messages: CopilotMessage[] }>(["copilot-workspace-conversation", token, conversationId], (current) => {
      if (!current) return current;
      return { ...current, conversation: { ...current.conversation, ...patch } };
    });
  }, [queryClient, token]);

  const commitConversation = useCallback((conversation: CopilotConversation) => {
    applyConversationPatch(conversation.id, conversation);
    if (conversation.id === selectedId) setRenameTitle(conversation.title);
  }, [applyConversationPatch, selectedId]);

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
    if (kind === "ecg" && attachments.some((item) => item.kind === "ecg")) {
      const replace = typeof window !== "undefined" ? window.confirm("An ECG is already attached. Replace it?") : false;
      if (!replace) return;
      setAttachments((current) => current.filter((item) => item.kind !== "ecg"));
    }
    const formData = new FormData();
    formData.append("file", file);
    formData.append("kind", kind);
    formData.append("contextType", currentCase ? "case" : currentPatient ? "patient" : "global");
    if (currentPatient?.id) formData.append("patientId", currentPatient.id);
    if (currentCase?.id) formData.append("caseId", currentCase.id);
    if (selectedId) formData.append("conversationId", selectedId);
    try {
      const payload = await uploadCopilotAttachment(token, formData);
      setAttachments((current) => kind === "ecg" ? current.filter((item) => item.kind !== "ecg").concat(payload.attachment) : current.concat(payload.attachment));
      showActionNotice(`${payload.attachment.originalName} uploaded.`);
    } catch {
      showActionNotice("Upload failed.", "error");
    }
  }, [attachments, currentCase, currentPatient, selectedId, showActionNotice, token]);

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
      showActionNotice("Voice input is not supported in this browser.", "error");
      return;
    }
    const speechWindow = window as SpeechWindow;
    const Recognition = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
    if (!Recognition) {
      showActionNotice("Voice input is not supported in this browser.", "error");
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
        showActionNotice(event.error === "not-allowed" ? "Microphone denied." : "Upload failed.", "error");
      };
      recognition.onend = () => setIsRecording(false);
      recognitionRef.current = recognition;
      recognition.start();
      setIsRecording(true);
      showActionNotice("Voice recording started.");
    } catch {
      showActionNotice("Microphone denied.", "error");
    }
  }, [isRecording, showActionNotice, stopVoiceInput]);

  const navigateConversation = useCallback((conversationId: string) => {
    setSelectedId(conversationId);
    setMobileSidebarOpen(false);
    router.push(`/copilot/${conversationId}` as never);
  }, [router]);

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
      setMobileSidebarOpen(false);
      router.push(`/copilot/${payload.conversation.id}` as never);
      invalidate();
    },
  });

  const renameMutation = useMutation({
    mutationFn: ({ conversationId, title }: { conversationId: string; title: string }) => renameCopilotConversation(token!, conversationId, title),
    onMutate: ({ conversationId, title }) => {
      applyConversationPatch(conversationId, { title });
      if (conversationId === selectedId) setRenameTitle(title);
    },
    onSuccess: (payload) => {
      commitConversation(payload.conversation);
      setRenameModalOpen(false);
      setRenameTarget(undefined);
      showActionNotice("Conversation renamed.");
      invalidate();
    },
    onError: () => {
      showActionNotice("Unable to rename conversation.", "error");
      invalidate();
    },
  });

  const pinMutation = useMutation({
    mutationFn: ({ conversationId, isPinned }: { conversationId: string; isPinned: boolean }) => pinCopilotConversation(token!, conversationId, isPinned),
    onMutate: ({ conversationId, isPinned }) => {
      applyConversationPatch(conversationId, { isPinned });
    },
    onSuccess: (payload) => {
      commitConversation(payload.conversation);
      showActionNotice(payload.conversation.isPinned ? "Conversation pinned." : "Conversation unpinned.");
      invalidate();
    },
    onError: () => {
      showActionNotice("Unable to pin conversation.", "error");
      invalidate();
    },
  });

  const favoriteMutation = useMutation({
    mutationFn: ({ conversationId, isFavorite }: { conversationId: string; isFavorite: boolean }) => favoriteCopilotConversation(token!, conversationId, isFavorite),
    onMutate: ({ conversationId, isFavorite }) => {
      applyConversationPatch(conversationId, { favorite: isFavorite, isFavorite });
    },
    onSuccess: (payload) => {
      commitConversation(payload.conversation);
      showActionNotice(payload.conversation.isFavorite ? "Conversation added to favorites." : "Conversation removed from favorites.");
      invalidate();
    },
    onError: () => {
      showActionNotice("Unable to favorite conversation.", "error");
      invalidate();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (conversationId: string) => deleteCopilotConversation(token!, conversationId),
    onSuccess: (_payload, conversationId) => {
      if (conversationId === selectedId) {
        setSelectedId(undefined);
        setRenameTitle("");
        router.replace("/copilot" as never);
      }
      invalidate();
    },
  });

  const archiveMutation = useMutation({
    mutationFn: (conversationId: string) => archiveCopilotConversation(token!, conversationId),
    onSuccess: (payload) => {
      if (payload.conversation.id === selectedId) {
        setSelectedId(undefined);
        setRenameTitle("");
        router.replace("/copilot" as never);
      }
      invalidate();
    },
  });

  const restoreMutation = useMutation({
    mutationFn: (conversationId: string) => restoreCopilotConversation(token!, conversationId),
    onSuccess: (payload) => {
      navigateConversation(payload.conversation.id);
      invalidate();
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: (conversationId: string) => duplicateCopilotConversation(token!, conversationId),
    onSuccess: (payload) => {
      setRenameTitle(payload.conversation.title);
      navigateConversation(payload.conversation.id);
      invalidate();
    },
  });

  const sendMutation = useMutation({
    mutationFn: async (input: { attachmentIds: string[]; prompt: string; tag: CopilotTag }) => {
      const controller = new AbortController();
      streamAbort.current = controller;
      setStatus("Loading clinical context...");
      setStreamingMessage("");
      let finalConversation: CopilotConversation | undefined;
      await streamCopilotMessage(token!, {
        caseId: currentCase?.id,
        attachmentIds: input.attachmentIds,
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
      setAttachments([]);
      setDraft("");
      setStatus("");
      setStreamingMessage("");
      streamAbort.current = null;
      invalidate();
    },
    onError: () => {
      setStatus("Generation stopped. Your persisted conversation is still available.");
      setStreamingMessage("");
      streamAbort.current = null;
    },
  });

  useEffect(() => {
    if (routeConversationId && routeConversationId !== selectedId) setSelectedId(routeConversationId);
  }, [routeConversationId, selectedId]);

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
    if (selectedConversation) setRenameTitle(selectedConversation.title);
  }, [selectedConversation]);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages.length, streamingMessage]);

  function sendPrompt(prompt: string, tag: CopilotTag) {
    const trimmed = prompt.trim() || (attachments.length ? "Review the attached clinical files and summarize the relevant ECG, echo, labs, and document findings." : "");
    if (!trimmed || !token || sendMutation.isPending) return;
    sendMutation.mutate({ attachmentIds: attachments.map((attachment) => attachment.id), prompt: trimmed, tag });
  }

  function saveRename() {
    const target = renameTarget ?? selectedConversation;
    if (!target || !token) {
      showActionNotice("Unable to rename conversation.", "error");
      return;
    }
    renameMutation.mutate({ conversationId: target.id, title: renameTitle.trim() || "Clinical copilot conversation" });
  }

  function openRenameDialog(conversation?: CopilotConversation) {
    if (!conversation) {
      showActionNotice("Select a conversation before renaming.", "error");
      return;
    }
    setRenameTarget(conversation);
    setRenameTitle(conversation.title);
    setRenameModalOpen(true);
  }

  function togglePin(conversation: CopilotConversation) {
    if (!token) {
      showActionNotice("Unable to pin conversation.", "error");
      return;
    }
    pinMutation.mutate({ conversationId: conversation.id, isPinned: !conversation.isPinned });
  }

  function toggleFavorite(conversation: CopilotConversation) {
    if (!token) {
      showActionNotice("Unable to favorite conversation.", "error");
      return;
    }
    favoriteMutation.mutate({ conversationId: conversation.id, isFavorite: !conversation.isFavorite });
  }

  function regenerateLastAnswer() {
    const lastUserMessage = [...messages].reverse().find((message) => message.role === "user");
    if (lastUserMessage) sendPrompt(lastUserMessage.content, selectedConversation?.tag ?? "Clinical Summary");
  }

  function continueGeneration() {
    sendPrompt("Continue the previous clinical answer with the same structure, context, citations, and safety caveats.", selectedConversation?.tag ?? "Clinical Summary");
  }

  const sidebarVisible = !isMobile || mobileSidebarOpen;
  const contextVisible = contextOpen && !isMobile;

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
          <PrimaryButton icon="plus" label="New Chat" onPress={() => createMutation.mutate()} />
          <TextInput
            onChangeText={setConversationSearch}
            placeholder="Search Conversations..."
            placeholderTextColor={medicalTheme.muted}
            style={styles.searchInput}
            value={conversationSearch}
          />
          <ScrollView contentContainerStyle={styles.sidebarList} showsVerticalScrollIndicator={false}>
            <ConversationGroup conversations={groupedConversations.pinned} icon="map-pin" onArchive={(id) => archiveMutation.mutate(id)} onDelete={(id) => deleteMutation.mutate(id)} onDuplicate={(id) => duplicateMutation.mutate(id)} onFavorite={toggleFavorite} onPin={togglePin} onRename={openRenameDialog} onRestore={(id) => restoreMutation.mutate(id)} onSelect={navigateConversation} selectedId={selectedId} title="Pinned Conversations" />
            <ConversationGroup conversations={groupedConversations.favorites} icon="star" onArchive={(id) => archiveMutation.mutate(id)} onDelete={(id) => deleteMutation.mutate(id)} onDuplicate={(id) => duplicateMutation.mutate(id)} onFavorite={toggleFavorite} onPin={togglePin} onRename={openRenameDialog} onRestore={(id) => restoreMutation.mutate(id)} onSelect={navigateConversation} selectedId={selectedId} title="Favorites" />
            <ConversationGroup conversations={groupedConversations.recent} icon="clock" onArchive={(id) => archiveMutation.mutate(id)} onDelete={(id) => deleteMutation.mutate(id)} onDuplicate={(id) => duplicateMutation.mutate(id)} onFavorite={toggleFavorite} onPin={togglePin} onRename={openRenameDialog} onRestore={(id) => restoreMutation.mutate(id)} onSelect={navigateConversation} selectedId={selectedId} title="Recent Conversations" />
            <ConversationGroup conversations={groupedConversations.archived} icon="archive" onArchive={(id) => archiveMutation.mutate(id)} onDelete={(id) => deleteMutation.mutate(id)} onDuplicate={(id) => duplicateMutation.mutate(id)} onFavorite={toggleFavorite} onPin={togglePin} onRename={openRenameDialog} onRestore={(id) => restoreMutation.mutate(id)} onSelect={navigateConversation} selectedId={selectedId} title="Archived Conversations" />
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
            <Badge label={sendMutation.isPending ? "Streaming" : "Ready"} tone={sendMutation.isPending ? "warning" : "success"} />
            <Pressable accessibilityRole="button" onPress={() => setContextOpen((current) => !current)} style={styles.contextToggle}>
              <Feather name="sidebar" size={16} color={medicalTheme.primary} />
              <Text style={styles.contextToggleText}>{contextOpen ? "Hide Context" : "Context"}</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.actionBar}>
          {ACTIONS.map((action) => (
            <Pressable
              accessibilityRole="button"
              disabled={sendMutation.isPending}
              key={action.label}
              onPress={() => sendPrompt(action.prompt, action.tag)}
              style={[styles.actionPill, sendMutation.isPending && styles.disabled]}
            >
              <Feather name={action.icon} size={14} color={medicalTheme.primary} />
              <Text style={styles.actionText}>{action.label}</Text>
            </Pressable>
          ))}
        </View>

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
                <TextInput
                  editable={false}
                  onChangeText={setRenameTitle}
                  placeholder="Untitled clinical conversation"
                  placeholderTextColor={medicalTheme.muted}
                  style={styles.titleInput}
                  value={renameTitle}
                />
                <Text style={styles.chatMeta}>
                  {selectedConversation?.tag ?? "Free medical conversation"} • {messages.length} persisted messages • Deep link ready
                </Text>
              </View>
            </View>
            <View style={styles.chatTools}>
              <HeaderTool disabled={!selectedConversation} icon="edit-2" label="Rename" onPress={() => openRenameDialog(selectedConversation)} />
              <HeaderTool disabled={!selectedConversation || pinMutation.isPending} icon="map-pin" label={selectedConversation?.isPinned ? "📌 Pinned" : "Pin"} onPress={() => selectedConversation && togglePin(selectedConversation)} />
              <HeaderTool disabled={!selectedConversation || favoriteMutation.isPending} icon="star" label={selectedConversation?.isFavorite ? "★ Favorite" : "Favorite"} onPress={() => selectedConversation && toggleFavorite(selectedConversation)} />
              <HeaderTool disabled={!messages.length || sendMutation.isPending} icon="refresh-cw" label="Regenerate" onPress={regenerateLastAnswer} />
              <HeaderTool disabled={!selectedId || sendMutation.isPending} icon="fast-forward" label="Continue" onPress={continueGeneration} />
            </View>
          </View>

          <ScrollView contentContainerStyle={styles.messageList} ref={scrollRef} style={styles.messages}>
            {!messages.length && !streamingMessage ? (
              <View style={styles.emptyChat}>
                <Text style={styles.emptyTitle}>Start a clinical conversation</Text>
                {EMPTY_MESSAGES.map((message) => <Text key={message} style={styles.emptyMessage}>{message}</Text>)}
              </View>
            ) : null}
            {messages.map((message) => <MessageCard key={message.id} message={message} />)}
            {status && !streamingMessage ? <Text style={styles.statusText}>{status}</Text> : null}
            {streamingMessage ? <MessageCard message={{ attachments: [], citations: [], content: streamingMessage, createdAt: new Date().toISOString(), id: "streaming", role: "assistant" }} /> : null}
          </ScrollView>

          <View style={styles.composer}>
            <View style={styles.attachmentRow}>
              <ComposerTool active={isRecording} icon="mic" label={isRecording ? "Stop Voice" : "Voice"} onPress={toggleVoiceInput} />
              <ComposerTool icon="activity" label="Upload ECG" onPress={() => openFilePicker("ecg")} />
              <ComposerTool icon="heart" label="Upload Echo" onPress={() => openFilePicker("echo")} />
              <ComposerTool icon="clipboard" label="Upload Labs" onPress={() => openFilePicker("labs")} />
              <ComposerTool icon="paperclip" label="Attach Files" onPress={() => openFilePicker("file")} />
              {Platform.OS === "web" ? <Text style={styles.dropHint}>Drag & drop supported by browser upload workflows</Text> : null}
            </View>
            {attachments.length ? (
              <View style={styles.attachmentPanel}>
                {attachments.map((attachment) => (
                  <AttachmentChip
                    attachment={attachment}
                    key={attachment.id}
                    onRemove={() => setAttachments((current) => current.filter((item) => item.id !== attachment.id))}
                  />
                ))}
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
                placeholder="Ask about ECG interpretation, rhythm, risk, occupational fitness, follow-up, reports, or clinical reasoning..."
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

      {contextVisible ? (
        <Card style={[styles.contextPanel, isTablet && styles.contextPanelTablet]}>
          <View style={styles.contextHeader}>
            <Text style={styles.contextTitle}>Clinical Context</Text>
            <Pressable accessibilityRole="button" onPress={() => setContextOpen(false)} style={styles.iconButton}>
              <Feather name="chevron-right" size={18} color={medicalTheme.text} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.contextBody} showsVerticalScrollIndicator={false}>
            <ContextLine icon="user" label="Current Patient" value={currentPatient ? `${currentPatient.firstName} ${currentPatient.lastName}` : "No patient selected"} />
            <ContextLine icon="hash" label="Demographics" value={currentPatient ? `${currentPatient.age} years • ${currentPatient.gender} • MRN ${currentPatient.medicalRecordNumber}` : "No demographics loaded"} />
            <ContextLine icon="activity" label="Active ECG" value={currentCase?.caseNumber ?? currentCase?.caseId ?? "No active ECG"} />
            <ContextLine icon="clock" label="ECG Metadata" value={currentCase ? `${currentCase.ecgType ?? "12-lead ECG"} • ${currentCase.status} • ${currentCase.priority}` : "No ECG metadata"} />
            <ContextLine icon="upload-cloud" label="Uploaded Files" value={`${currentCase?.reportCount ?? 0} reports or files linked to current context`} />
            <ContextLine icon="thermometer" label="Labs" value="Available through uploaded files, documents, and clinical notes context." />
            <ContextLine icon="heart" label="Echo Reports" value="Available when attached to the patient or case record." />
            <ContextLine icon="file-text" label="Clinical History" value={currentCase?.clinicalNotes ?? currentPatient?.medicalHistory ?? "No clinical history recorded"} />
          </ScrollView>
        </Card>
      ) : null}

      <Modal animationType="fade" transparent visible={renameModalOpen} onRequestClose={() => setRenameModalOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.renameDialog}>
            <Text style={styles.renameTitle}>Rename Conversation</Text>
            <Text style={styles.renameSubtitle}>Update the title for this persisted PostgreSQL-backed conversation.</Text>
            <TextInput
              autoFocus
              onChangeText={setRenameTitle}
              onSubmitEditing={saveRename}
              placeholder="Conversation title"
              placeholderTextColor={medicalTheme.muted}
              style={styles.renameInput}
              value={renameTitle}
            />
            <View style={styles.renameActions}>
              <PrimaryButton label="Cancel" onPress={() => { setRenameModalOpen(false); setRenameTarget(undefined); }} variant="outline" />
              <PrimaryButton disabled={renameMutation.isPending || !renameTitle.trim()} icon="save" label={renameMutation.isPending ? "Saving..." : "Save"} onPress={saveRename} />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function ConversationGroup({
  conversations,
  icon,
  onArchive,
  onDelete,
  onDuplicate,
  onFavorite,
  onPin,
  onRename,
  onRestore,
  onSelect,
  selectedId,
  title,
}: {
  conversations: CopilotConversation[];
  icon: keyof typeof Feather.glyphMap;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onFavorite: (conversation: CopilotConversation) => void;
  onPin: (conversation: CopilotConversation) => void;
  onRename: (conversation: CopilotConversation) => void;
  onRestore: (id: string) => void;
  onSelect: (id: string) => void;
  selectedId?: string;
  title: string;
}) {
  return (
    <View style={styles.group}>
      <View style={styles.groupHeader}>
        <Feather name={icon} size={13} color={medicalTheme.primary} />
        <Text style={styles.groupTitle}>{title}</Text>
      </View>
      {conversations.length ? conversations.slice(0, 14).map((conversation) => (
        <View key={conversation.id} style={[styles.conversationItem, selectedId === conversation.id && styles.conversationItemActive]}>
          <Pressable accessibilityRole="button" onPress={() => onSelect(conversation.id)} style={styles.conversationSelect}>
            <Text numberOfLines={1} style={styles.conversationTitle}>
              {conversation.isPinned ? "📌 " : ""}{conversation.isFavorite ? "★ " : ""}{conversation.title.replace("[Archived] ", "")}
            </Text>
            <Text style={styles.conversationMeta}>{conversation.tag} • {new Date(conversation.updatedAt).toLocaleDateString()}</Text>
          </Pressable>
          <View style={styles.conversationMenu}>
            <ConversationAction icon="edit-2" label="Rename" onPress={() => onRename(conversation)} />
            <ConversationAction active={conversation.isPinned} activeText="📌 Pinned" icon="map-pin" label={conversation.isPinned ? "Unpin" : "Pin"} onPress={() => onPin(conversation)} />
            <ConversationAction active={conversation.isFavorite} activeText="★ Favorite" icon="star" label={conversation.isFavorite ? "Unfavorite" : "Favorite"} onPress={() => onFavorite(conversation)} />
            {conversation.archivedAt ? <MiniAction icon="corner-up-left" label="Restore" onPress={() => onRestore(conversation.id)} /> : <MiniAction icon="archive" label="Archive" onPress={() => onArchive(conversation.id)} />}
            <MiniAction icon="copy" label="Duplicate" onPress={() => onDuplicate(conversation.id)} />
            <MiniAction icon="trash-2" label="Delete" onPress={() => onDelete(conversation.id)} tone="danger" />
          </View>
        </View>
      )) : <Text style={styles.emptyText}>No conversations yet.</Text>}
    </View>
  );
}

function MessageCard({ message }: { message: CopilotMessage }) {
  const assistant = message.role === "assistant";
  return (
    <View style={[styles.message, assistant ? styles.assistantMessage : styles.userMessage]}>
      <View style={styles.messageTop}>
        <Text style={styles.messageRole}>{assistant ? "AI Clinical Copilot" : "You"}</Text>
        <Text style={styles.messageTime}>{new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</Text>
      </View>
      <RichMedicalText content={message.content} />
      {message.attachments?.length ? (
        <View style={styles.messageAttachments}>
          {message.attachments.map((attachment) => <AttachmentChip attachment={attachment} key={attachment.id} />)}
        </View>
      ) : null}
      {message.citations?.length ? <CitationList citations={message.citations} /> : null}
      {assistant ? (
        <View style={styles.answerTools}>
          <MiniAction icon="copy" label="Copy answer" onPress={() => copyText(message.content)} />
          {message.confidence !== undefined ? <Text style={styles.confidence}>Confidence {Math.round(message.confidence * 100)}%</Text> : null}
        </View>
      ) : null}
    </View>
  );
}

function RichMedicalText({ content }: { content: string }) {
  const lines = content.split("\n");
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

function CitationList({ citations }: { citations: CopilotCitation[] }) {
  return (
    <View style={styles.citations}>
      {citations.map((citation) => (
        <View key={citation.id} style={styles.citation}>
          <Feather name="link" size={12} color={medicalTheme.primary} />
          <Text style={styles.citationText}>{citation.label} • {citation.source}</Text>
        </View>
      ))}
    </View>
  );
}

function ContextLine({ icon, label, value }: { icon: keyof typeof Feather.glyphMap; label: string; value: string }) {
  return (
    <View style={styles.contextLine}>
      <View style={styles.contextIcon}>
        <Feather name={icon} size={14} color={medicalTheme.primary} />
      </View>
      <View style={styles.contextText}>
        <Text style={styles.contextLabel}>{label}</Text>
        <Text style={styles.contextValue}>{value}</Text>
      </View>
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

function MiniAction({ icon, label, onPress, tone }: { icon: keyof typeof Feather.glyphMap; label: string; onPress: () => void; tone?: "danger" }) {
  return (
    <Pressable accessibilityLabel={label} accessibilityRole="button" onPress={onPress} style={styles.miniAction}>
      <Feather name={icon} size={12} color={tone === "danger" ? medicalTheme.critical : medicalTheme.muted} />
    </Pressable>
  );
}

function ConversationAction({ active, activeText, icon, label, onPress }: { active?: boolean; activeText?: string; icon: keyof typeof Feather.glyphMap; label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityLabel={label} accessibilityRole="button" onPress={onPress} style={[styles.conversationAction, active && styles.conversationActionActive]}>
      <Feather name={icon} size={12} color={active ? medicalTheme.primary : medicalTheme.text} />
      <Text style={[styles.conversationActionText, active && styles.conversationActionTextActive]}>{active && activeText ? activeText : label}</Text>
    </Pressable>
  );
}

function AttachmentChip({ attachment, onRemove }: { attachment: CopilotAttachment; onRemove?: () => void }) {
  return (
    <View style={styles.attachmentChip}>
      <Feather name={attachment.kind === "ecg" ? "activity" : attachment.kind === "echo" ? "heart" : attachment.kind === "labs" ? "clipboard" : "paperclip"} size={13} color={medicalTheme.primary} />
      <View style={styles.attachmentChipText}>
        <Text numberOfLines={1} style={styles.attachmentName}>{attachment.originalName}</Text>
        <Text style={styles.attachmentMeta}>{attachment.kind.toUpperCase()} • {formatFileSize(attachment.sizeBytes)}</Text>
      </View>
      {onRemove ? (
        <Pressable accessibilityLabel={`Remove ${attachment.originalName}`} accessibilityRole="button" onPress={onRemove} style={styles.attachmentRemove}>
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

function formatFileSize(sizeBytes: number) {
  if (sizeBytes < 1024) return `${sizeBytes} B`;
  if (sizeBytes < 1024 * 1024) return `${Math.round(sizeBytes / 1024)} KB`;
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}

function copyText(content: string) {
  if (typeof navigator !== "undefined" && "clipboard" in navigator) {
    void navigator.clipboard.writeText(content);
  }
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
  attachmentRemove: { alignItems: "center", backgroundColor: "rgba(239,68,68,0.18)", borderRadius: 999, height: 22, justifyContent: "center", width: 22 },
  attachmentRow: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: 8 },
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
  conversationAction: { alignItems: "center", backgroundColor: "rgba(2,6,23,0.34)", borderColor: glassBorder, borderRadius: 999, borderWidth: 1, flexDirection: "row", gap: 5, minHeight: 28, paddingHorizontal: 8, paddingVertical: 5 },
  conversationActionActive: { backgroundColor: "rgba(20,221,230,0.12)", borderColor: "rgba(20,221,230,0.45)" },
  conversationActionText: { color: medicalTheme.text, fontSize: 10, fontWeight: "900" },
  conversationActionTextActive: { color: medicalTheme.primary },
  conversationMenu: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  conversationMeta: { color: medicalTheme.muted, fontSize: 10, fontWeight: "800" },
  conversationSelect: { gap: 4 },
  conversationTitle: { color: medicalTheme.text, fontSize: 12, fontWeight: "900" },
  counter: { color: medicalTheme.muted, fontSize: 11, fontWeight: "800", textAlign: "right" },
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
  modalBackdrop: { alignItems: "center", backgroundColor: "rgba(2,6,23,0.72)", flex: 1, justifyContent: "center", padding: 20 },
  renameActions: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: 10, justifyContent: "flex-end" },
  renameDialog: { backgroundColor: "rgba(12,26,45,0.98)", borderColor: glassBorder, borderRadius: 24, borderWidth: 1, gap: 14, maxWidth: 520, padding: 18, shadowColor: medicalTheme.primary, shadowOpacity: 0.24, shadowRadius: 28, width: "100%" },
  renameInput: { backgroundColor: "rgba(2,6,23,0.42)", borderColor: glassBorder, borderRadius: 14, borderWidth: 1, color: medicalTheme.text, fontSize: 16, fontWeight: "800", minHeight: 48, paddingHorizontal: 12 },
  renameSubtitle: { color: medicalTheme.muted, fontSize: 13, fontWeight: "800", lineHeight: 19 },
  renameTitle: { color: medicalTheme.text, fontSize: 20, fontWeight: "900" },
  richText: { gap: 2 },
  searchInput: { backgroundColor: "rgba(2,6,23,0.42)", borderColor: glassBorder, borderRadius: 14, borderWidth: 1, color: medicalTheme.text, minHeight: 42, paddingHorizontal: 12 },
  shell: { backgroundColor: "#020617", flex: 1, flexDirection: "row", gap: 14, minHeight: Platform.OS === "web" ? "calc(100vh - 130px)" as unknown as number : 760, overflow: "hidden", padding: 2 },
  sidebar: { backgroundColor: "rgba(15,23,42,0.88)", borderColor: glassBorder, flexBasis: 320, gap: 12, padding: 14, width: 320 },
  sidebarEyebrow: { color: medicalTheme.primary, fontSize: 11, fontWeight: "900", letterSpacing: 1, textTransform: "uppercase" },
  sidebarHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  sidebarList: { gap: 14, paddingBottom: 20 },
  sidebarMobile: { bottom: 0, left: 0, position: "absolute", top: 0, zIndex: 20 },
  sidebarTitle: { color: medicalTheme.text, fontSize: 22, fontWeight: "900" },
  statusText: { color: medicalTheme.primary, fontSize: 13, fontWeight: "900", padding: 10 },
  titleInput: { borderBottomColor: "transparent", color: medicalTheme.text, fontSize: 18, fontWeight: "900", minHeight: 34, paddingVertical: 4 },
  titleStack: { gap: 2 },
  topBar: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: 12, justifyContent: "space-between" },
  topButtons: { alignItems: "center", flexDirection: "row", gap: 8 },
  topTitleBlock: { alignItems: "center", flexDirection: "row", gap: 10 },
  userMessage: { alignSelf: "flex-end", backgroundColor: "rgba(14,51,69,0.98)", borderColor: "#1F7085" },
  workspaceTitle: { color: medicalTheme.text, fontSize: 26, fontWeight: "900", letterSpacing: -0.7 },
});
