import { Feather } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";

import { Badge, Card, EmptyState, medicalTheme, PrimaryButton } from "@/components/enterprise/EnterpriseUI";
import { CopilotClinicalPanel } from "@/components/copilot/CopilotClinicalPanel";
import { CopilotComposer } from "@/components/copilot/CopilotComposer";
import { CopilotErrorBoundary } from "@/components/copilot/CopilotErrorBoundary";
import { AttachmentChip, CopilotMessageCard, sanitizeAssistantContent } from "@/components/copilot/CopilotMessageCard";
import { CopilotMessageList, type MessageListHandle } from "@/components/copilot/CopilotMessageList";
import { CopilotResizableWorkspace, useClinicalPanelCollapse } from "@/components/copilot/CopilotResizableWorkspace";
import type { SpeechControl, UploadPipelineJob } from "@/components/copilot/types";
import { DEFAULT_UPLOAD_ANALYSIS_PROMPT } from "@/components/copilot/types";
import { useAuth } from "@/context/AuthContext";
import {
  downloadCopilotExport,
  getCopilotConversation,
  listCopilotConversations,
  streamCopilotMessage,
  transcribeVoiceAudio,
  type CopilotAttachment,
  type CopilotClinicalLinkage,
  type CopilotConversation,
  type CopilotMessage,
  type CopilotTag,
} from "@/services/copilot";
import {
  buildCopilotUploadFormData,
  captureCopilotCameraAsset,
  formatUploadNotice,
  pickCopilotUploadAssets,
  validateUploadAsset,
  type UploadableAsset,
} from "@/services/copilotUpload";
import { runUploadPipeline } from "@/services/uploadPipeline";
import { friendlyUploadError } from "@/utils/clinicalErrors";
import { canSendMessage, canStopStream, isComposerEditable, isConversationLocked, type ConversationPhase } from "@/services/conversationFsm";
import { emitRuntimeEvent } from "@/services/runtimeEvents";
import { ClinicalVoiceEngine, type VoiceStatus } from "@/services/voiceEngine";
import { voiceLanguageLabel, type VoiceLanguageMode } from "@/services/voiceLanguage";
import { safeArray } from "@/utils/collections";

type AttachmentKind = "ecg" | "file" | "image";

export { CopilotMessageCard as MessageCard, AttachmentChip };

const ATTACHMENT_RULES: Record<AttachmentKind, { accept: string; extensions: string[]; maxBytes: number; multiple: boolean }> = {
  ecg: { accept: ".jpg,.jpeg,.png,.pdf,.zip,.dcm,.dicom,application/pdf,image/jpeg,image/png,application/zip,application/dicom", extensions: [".jpg", ".jpeg", ".pdf", ".png", ".zip", ".dcm", ".dicom"], maxBytes: 25 * 1024 * 1024, multiple: true },
  file: { accept: ".pdf,.docx,.txt,.jpg,.jpeg,.png,.zip,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,image/jpeg,image/png,application/zip", extensions: [".docx", ".jpg", ".jpeg", ".pdf", ".png", ".txt", ".zip"], maxBytes: 25 * 1024 * 1024, multiple: true },
  image: { accept: "image/*,.jpg,.jpeg,.png,.webp", extensions: [".jpg", ".jpeg", ".png", ".webp"], maxBytes: 25 * 1024 * 1024, multiple: true },
};

const WORKSPACE_STATE_KEY = "ecg-insight:copilot-workspace-state";

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
  const voiceEngineRef = useRef<ClinicalVoiceEngine | null>(null);
  const voiceModeRef = useRef(false);
  const speechMutedRef = useRef(false);
  const sendPromptRef = useRef<(prompt: string, tag: CopilotTag) => void>(() => undefined);
  const sendPendingRef = useRef(false);
  const conversationTagRef = useRef<CopilotTag>("Clinical Summary");
  const scrollRef = useRef<MessageListHandle>(null);
  const userNearBottomRef = useRef(true);
  const uploadAbortRef = useRef<AbortController | null>(null);
  const streamAbort = useRef<AbortController | null>(null);
  const { width } = useWindowDimensions();
  const { authToken, user } = useAuth();
  const token = authToken?.token;
  const [voiceMode, setVoiceMode] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus>("idle");
  const [liveTranscript, setLiveTranscript] = useState("");
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
  const [streamingMessage, setStreamingMessage] = useState("");
  const [status, setStatus] = useState("");
  const [uploadingFiles, setUploadingFiles] = useState<string[]>([]);
  const [pipelineJobs, setPipelineJobs] = useState<UploadPipelineJob[]>([]);
  const [waveformLevels, setWaveformLevels] = useState<number[]>([]);
  const [showNewMessagesButton, setShowNewMessagesButton] = useState(false);
  const [clinicalLinkage, setClinicalLinkage] = useState<CopilotClinicalLinkage | undefined>();
  const { clinicalCollapsed, toggleClinicalCollapse } = useClinicalPanelCollapse();
  const [voiceLanguageMode, setVoiceLanguageMode] = useState<VoiceLanguageMode>("auto");
  const [conversationPhase, setConversationPhase] = useState<ConversationPhase>("idle");

  const isMobile = width < 760;

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
    voiceEngineRef.current?.stopRecording();
    setIsRecording(false);
  }, []);

  useEffect(() => {
    voiceModeRef.current = voiceMode;
  }, [voiceMode]);

  useEffect(() => {
    speechMutedRef.current = speechMuted;
  }, [speechMuted]);

  useEffect(() => {
    conversationTagRef.current = selectedConversation?.tag ?? "Clinical Summary";
  }, [selectedConversation?.tag]);

  useEffect(() => {
    if (!token) return;
    voiceEngineRef.current = new ClinicalVoiceEngine({
      onError: (message) => showActionNotice(message, "error"),
      onFinalTranscript: (transcript) => {
        setDraft(transcript);
        setLiveTranscript(transcript);
        if (voiceModeRef.current) {
          voiceEngineRef.current?.markThinking();
          sendPromptRef.current(transcript, conversationTagRef.current);
        }
      },
      onNetworkChange: (online) => {
        if (!online) showActionNotice("Network connection lost.", "error");
      },
      onPartialTranscript: (transcript) => {
        setLiveTranscript(transcript);
        setDraft(transcript);
      },
      onPermissionDenied: () => showActionNotice("Microphone permission denied.", "error"),
      onRecordingEnd: () => setIsRecording(false),
      onRecordingStart: () => {
        setIsRecording(true);
        setLiveTranscript("");
      },
      onSilence: () => {
        if (!voiceModeRef.current) showActionNotice("Voice input paused after silence.", "success");
      },
      onSpeakingEnd: () => {
        setSpeakingMessageId(undefined);
        setSpeechPaused(false);
        if (voiceModeRef.current && !speechMutedRef.current && !sendPendingRef.current) {
          void voiceEngineRef.current?.startRecording();
        }
      },
      onSpeakingStart: (messageId) => {
        setSpeakingMessageId(messageId);
        setSpeechPaused(false);
      },
      onStatusChange: (status) => setVoiceStatus(status),
      onAudioLevel: (levels) => setWaveformLevels(levels),
    }, async (audio, mimeType) => {
      const payload = await transcribeVoiceAudio(token, audio, mimeType);
      return payload.text;
    });
    return () => voiceEngineRef.current?.dispose();
  }, [showActionNotice, token]);

  useEffect(() => {
    voiceEngineRef.current?.setLanguage(voiceLanguageMode);
  }, [voiceLanguageMode]);

  const uploadComposerAsset = useCallback(async (asset: File | UploadableAsset, kind: AttachmentKind) => {
    if (!token) {
      showActionNotice("Upload failed.", "error");
      return;
    }
    const assetName = asset.name;
    const assetMime = "uri" in asset ? asset.mimeType : asset.type;
    try {
      if (!("uri" in asset)) {
        const rule = ATTACHMENT_RULES[kind];
        const extension = asset.name.slice(asset.name.lastIndexOf(".")).toLowerCase();
        if (!rule.extensions.includes(extension)) {
          showActionNotice("Unsupported format.", "error");
          return;
        }
        if (asset.size > rule.maxBytes) {
          showActionNotice("File too large.", "error");
          return;
        }
      } else {
        validateUploadAsset(kind, asset);
      }
      const formData = buildCopilotUploadFormData(asset, kind, {
        caseId: explicitCaseId,
        conversationId: selectedId,
        patientId: explicitPatientId,
      });
      setUploadingFiles((current) => current.concat(assetName));
      setConversationPhase((current) => (current === "streaming" ? "streaming" : "uploading"));
      const abort = new AbortController();
      uploadAbortRef.current = abort;
      const result = await runUploadPipeline(token, formData, assetName, (job) => {
        setPipelineJobs((current) => current.filter((item) => item.fileName !== assetName).concat({ ...job, retry: () => { void uploadComposerAsset(asset, kind); } }));
      }, abort.signal);
      if (!result?.attachment?.id) {
        showActionNotice("Upload response was incomplete.", "error");
        return;
      }
      if (Platform.OS === "web" && "type" in asset && asset.type.startsWith("image/")) {
        const previewUrl = URL.createObjectURL(asset);
        setAttachmentPreviews((current) => ({ ...current, [result.attachment.id]: previewUrl }));
      } else if ("uri" in asset && assetMime.startsWith("image/")) {
        setAttachmentPreviews((current) => ({ ...current, [result.attachment.id]: asset.uri }));
      }
      setAttachments((current) => current.concat(result.attachment));
      if (result.clinicalLinkage) setClinicalLinkage(result.clinicalLinkage);
      showActionNotice(formatUploadNotice({ attachment: result.attachment, clinicalLinkage: result.clinicalLinkage }));
      setPipelineJobs((current) => current.filter((item) => item.fileName !== assetName));
    } catch (error) {
      showActionNotice(friendlyUploadError(error), "error");
      setPipelineJobs((current) => current.filter((item) => item.fileName !== assetName));
    } finally {
      uploadAbortRef.current = null;
      setUploadingFiles((current) => safeArray(current).filter((item) => item !== assetName));
      setConversationPhase((current) => (current === "streaming" ? "streaming" : "idle"));
    }
  }, [explicitCaseId, explicitPatientId, selectedId, showActionNotice, token]);

  const uploadComposerFile = useCallback(async (file: File, kind: AttachmentKind) => {
    await uploadComposerAsset(file, kind);
  }, [uploadComposerAsset]);

  const openFilePicker = useCallback((kind: AttachmentKind) => {
    if (Platform.OS === "web" && typeof document !== "undefined") {
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
      return;
    }
    void (async () => {
      try {
        const assets = await pickCopilotUploadAssets(kind);
        for (const asset of assets) {
          await uploadComposerAsset(asset, kind);
        }
      } catch (error) {
        showActionNotice(error instanceof Error ? error.message : "Upload failed.", "error");
      }
    })();
  }, [showActionNotice, uploadComposerAsset, uploadComposerFile]);

  const captureEcgFromCamera = useCallback(() => {
    if (Platform.OS === "web") {
      openFilePicker("image");
      return;
    }
    void (async () => {
      try {
        const asset = await captureCopilotCameraAsset();
        if (!asset) return;
        await uploadComposerAsset(asset, "ecg");
      } catch (error) {
        showActionNotice(error instanceof Error ? error.message : "Camera capture failed.", "error");
      }
    })();
  }, [openFilePicker, showActionNotice, uploadComposerAsset]);

  const cycleVoiceLanguage = useCallback(() => {
    setVoiceLanguageMode((current) => {
      if (current === "auto") return "en-US";
      if (current === "en-US") return "ar-SA";
      return "auto";
    });
  }, []);

  const toggleVoiceInput = useCallback(() => {
    if (isRecording) {
      stopVoiceInput();
      return;
    }
    if (voiceMode) {
      void voiceEngineRef.current?.startRecording();
      return;
    }
    void voiceEngineRef.current?.startRecording();
  }, [isRecording, stopVoiceInput, voiceMode]);

  const stopSpeaking = useCallback(() => {
    voiceEngineRef.current?.stopSpeaking();
    setSpeakingMessageId(undefined);
    setSpeechPaused(false);
  }, []);

  const speakAssistantMessage = useCallback((content: string, messageId: string) => {
    voiceEngineRef.current?.setMuted(speechMuted);
    voiceEngineRef.current?.speak(content, messageId);
  }, [speechMuted]);

  const pauseOrResumeSpeech = useCallback(() => {
    voiceEngineRef.current?.pauseOrResumeSpeaking();
    setSpeechPaused((current) => !current);
  }, []);

  const replaySpeech = useCallback((content: string, id: string) => {
    speakAssistantMessage(content, id);
  }, [speakAssistantMessage]);

  const toggleSpeechMute = useCallback(() => {
    setSpeechMuted((current) => {
      const next = !current;
      voiceEngineRef.current?.setMuted(next);
      return next;
    });
  }, []);

  const navigateConversation = useCallback((conversationId: string) => {
    setSelectedId(conversationId);
    setMobileSidebarOpen(false);
    router.push(`/copilot/${conversationId}` as never);
  }, [router]);

  const finalizeStream = useCallback((options: { preserveStatus?: boolean; willSpeak?: boolean } = {}) => {
    if (!options.preserveStatus) setStatus("");
    setStreamingMessage("");
    streamAbort.current = null;
    setConversationPhase("idle");
    voiceEngineRef.current?.resetAfterStream(!!options.willSpeak);
    emitRuntimeEvent("StreamingFinished");
  }, []);

  const stopActiveStream = useCallback(() => {
    streamAbort.current?.abort();
    finalizeStream();
    voiceEngineRef.current?.returnToIdle();
  }, [finalizeStream]);

  const sendMutation = useMutation({
    mutationFn: async (input: { attachmentIds: string[]; prompt: string; tag: CopilotTag }) => {
      setConversationPhase("streaming");
      emitRuntimeEvent("StreamingStarted");
      const controller = new AbortController();
      streamAbort.current = controller;
      setStatus("Thinking...");
      setStreamingMessage("");
      voiceEngineRef.current?.markThinking();
      let finalConversation: CopilotConversation | undefined;
      let assistantContent = "";
      let assistantMessageId = "stream-assistant";
      await streamCopilotMessage(token!, {
        caseId: explicitCaseId,
        attachmentIds: input.attachmentIds,
        contextPath: "/copilot",
        contextType: explicitCaseId ? "case" : explicitPatientId ? "patient" : "global",
        conversationId: selectedId,
        patientId: explicitPatientId,
        question: input.prompt,
        tag: input.tag,
        voiceMode: voiceModeRef.current,
      }, (event) => {
        if (event.type === "status") setStatus(event.status ?? "");
        if (event.type === "error" && event.status) {
          setStatus(event.status);
          throw new Error(event.status);
        }
        if (event.type === "token" && event.token) {
          assistantContent += event.token;
          setStreamingMessage((current) => `${current}${event.token}`);
          if (voiceModeRef.current) {
            voiceEngineRef.current?.markStreaming();
            voiceEngineRef.current?.feedSpeech(assistantContent, assistantMessageId);
          }
        }
        if (event.message?.content) {
          assistantContent = event.message.content;
          assistantMessageId = event.message.id ?? assistantMessageId;
        }
        if (event.conversation) {
          finalConversation = event.conversation;
          setSelectedId(event.conversation.id);
          router.replace(`/copilot/${event.conversation.id}` as never);
        }
      }, controller.signal);
      return { assistantContent, assistantMessageId, conversation: finalConversation };
    },
    onSuccess: (result) => {
      Object.values(attachmentPreviews).forEach((previewUrl) => URL.revokeObjectURL(previewUrl));
      setAttachments([]);
      setAttachmentPreviews({});
      setDraft("");
      setLiveTranscript("");
      invalidate();
      const willSpeak = !!(voiceModeRef.current && result?.assistantContent);
      voiceEngineRef.current?.resetAfterStream(willSpeak);
      if (willSpeak && voiceEngineRef.current?.getState().status !== "speaking") {
        voiceEngineRef.current?.speak(sanitizeAssistantContent(result.assistantContent), result.assistantMessageId);
      }
    },
    onError: (error) => {
      const message = error instanceof Error && error.message.trim()
        ? error.message
        : "Connection interrupted. Your conversation is saved; please retry when ready.";
      setStatus(message);
      voiceEngineRef.current?.resetAfterStream(false);
      if (voiceModeRef.current) {
        void voiceEngineRef.current?.startRecording();
      }
    },
    onSettled: (result, error) => {
      const willSpeak = !error && !!(voiceModeRef.current && result?.assistantContent);
      finalizeStream({ preserveStatus: !!error, willSpeak });
    },
  });

  useEffect(() => {
    sendPendingRef.current = sendMutation.isPending;
  }, [sendMutation.isPending]);

  useEffect(() => {
    voiceEngineRef.current?.setVoiceMode(voiceMode);
    if (voiceMode && conversationPhase === "idle" && voiceStatus === "idle" && !isRecording) {
      void voiceEngineRef.current?.startRecording();
    }
    if (!voiceMode) {
      voiceEngineRef.current?.cancelRecording();
    }
  }, [conversationPhase, isRecording, voiceMode, voiceStatus]);

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
    if (!userNearBottomRef.current) {
      setShowNewMessagesButton(true);
      return;
    }
    setShowNewMessagesButton(false);
    if (typeof window !== "undefined" && selectedId && !streamingMessage) {
      const savedScroll = Number(window.localStorage.getItem(`${WORKSPACE_STATE_KEY}:scroll:${selectedId}`));
      if (Number.isFinite(savedScroll) && savedScroll > 0) {
        scrollRef.current?.scrollToOffset({ animated: false, offset: savedScroll });
        return;
      }
    }
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages.length, selectedId, streamingMessage]);

  function sendPrompt(prompt: string, tag: CopilotTag) {
    const trimmed = safeString(prompt).trim() || (attachments.length ? DEFAULT_UPLOAD_ANALYSIS_PROMPT : "");
    if (!trimmed || !token || conversationPhase !== "idle") return;
    voiceEngineRef.current?.stopRecording();
    sendMutation.mutate({ attachmentIds: safeArray(attachments).map((attachment) => attachment?.id).filter(Boolean) as string[], prompt: trimmed, tag });
  }

  useEffect(() => {
    sendPromptRef.current = sendPrompt;
  });

  function startNewChat() {
    if (conversationPhase === "streaming") stopActiveStream();
    setVoiceMode(false);
    voiceEngineRef.current?.interrupt();
    voiceEngineRef.current?.returnToIdle();
    setSelectedId(undefined);
    setAttachments([]);
    setPipelineJobs([]);
    setUploadingFiles([]);
    Object.values(attachmentPreviews).forEach((previewUrl) => URL.revokeObjectURL(previewUrl));
    setAttachmentPreviews({});
    setDraft("");
    setStatus("");
    setStreamingMessage("");
    setConversationPhase("idle");
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
  const attachmentsProcessing = pipelineJobs.some((job) => job.stage !== "completed" && job.stage !== "failed" && job.stage !== "cancelled");
  const conversationLocked = isConversationLocked(conversationPhase) || attachmentsProcessing || uploadingFiles.length > 0;
  const composerEditable = isComposerEditable(conversationPhase, attachmentsProcessing, uploadingFiles.length);
  const sendDisabled = !canSendMessage({
    attachmentsCount: attachments.length,
    draftTrimmed: !!draft.trim(),
    phase: conversationPhase,
    pendingUploadCount: uploadingFiles.length,
    pipelineBusy: attachmentsProcessing,
  });
  const stopDisabled = !canStopStream(conversationPhase);
  const conversationReady = conversationPhase === "idle" && !attachmentsProcessing && uploadingFiles.length === 0;
  const statusBadgeLabel = conversationPhase === "streaming"
    ? "Thinking"
    : voiceStatus === "error"
      ? "Error"
      : voiceStatus === "timeout"
        ? "Timeout"
        : voiceStatus === "cancelled"
          ? "Cancelled"
          : voiceStatus === "permission"
            ? "Permission"
            : voiceStatus === "uploading"
              ? "Uploading audio"
              : voiceStatus === "recording"
                ? "Recording"
                : voiceStatus === "listening"
                  ? "Listening"
                  : voiceStatus === "processing"
                    ? "Processing"
                    : voiceStatus === "streaming"
                      ? "Streaming"
                      : voiceStatus === "speaking"
                        ? "Speaking"
                        : voiceStatus === "completed"
                          ? "Completed"
                          : voiceMode
                            ? "Voice mode"
                            : "Ready";
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

  const sidebarNode = sidebarVisible ? (
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
  ) : null;

  const chatNode = (
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
          <View testID="copilot-voice-status">
            <Badge label={statusBadgeLabel} tone={conversationPhase === "streaming" || voiceStatus === "processing" || voiceStatus === "uploading" ? "warning" : voiceStatus === "listening" || voiceStatus === "speaking" || voiceStatus === "streaming" ? "primary" : "success"} />
          </View>
          {conversationReady ? <View testID="copilot-conversation-ready" /> : null}
          <Pressable accessibilityRole="button" onPress={cycleVoiceLanguage} style={styles.contextToggle} testID="copilot-voice-language">
            <Feather name="globe" size={16} color={medicalTheme.primary} />
            <Text style={styles.contextToggleText}>{voiceLanguageLabel(voiceLanguageMode)}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => setVoiceMode((current) => !current)} style={styles.contextToggle} testID="copilot-voice-mode-toggle">
            <Feather name={voiceMode ? "headphones" : "mic"} size={16} color={medicalTheme.primary} />
            <Text style={styles.contextToggleText}>{voiceMode ? "Voice mode on" : "Voice mode"}</Text>
          </Pressable>
        </View>
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
            <HeaderTool disabled={!messages.length || conversationLocked} icon="refresh-cw" label="Regenerate" onPress={regenerateLastAnswer} />
            <HeaderTool disabled={!selectedId || conversationLocked} icon="fast-forward" label="Continue" onPress={continueGeneration} />
          </View>
        </View>

        <CopilotErrorBoundary>
          <CopilotMessageList
            messages={messages}
            onNotice={showActionNotice}
            onScrollNearBottomChange={(nearBottom) => {
              userNearBottomRef.current = nearBottom;
              if (nearBottom) setShowNewMessagesButton(false);
            }}
            onShowNewMessages={() => setShowNewMessagesButton(false)}
            ref={scrollRef}
            showNewMessagesButton={showNewMessagesButton}
            speechControl={speechControl}
            status={status}
            streamingMessage={streamingMessage}
            voiceStatus={voiceStatus}
          />
        </CopilotErrorBoundary>

        <CopilotComposer
          attachments={attachments}
          attachmentPreviews={attachmentPreviews}
          characterCount={characterCount}
          draft={draft}
          isRecording={isRecording}
          liveTranscript={liveTranscript}
          onCaptureEcg={captureEcgFromCamera}
          onDraftChange={setDraft}
          onOpenFilePicker={openFilePicker}
          onRemoveAttachment={(attachmentId) => {
            const previewUrl = attachmentPreviews[attachmentId];
            if (previewUrl) URL.revokeObjectURL(previewUrl);
            setAttachmentPreviews((current) => {
              const next = { ...current };
              delete next[attachmentId];
              return next;
            });
            setAttachments((current) => safeArray(current).filter((item) => item?.id !== attachmentId));
          }}
          onSend={() => sendPrompt(draft, "Clinical Summary")}
          onStopStream={stopActiveStream}
          onToggleVoice={toggleVoiceInput}
          pipelineJobs={pipelineJobs}
          composerEditable={composerEditable}
          sendDisabled={sendDisabled}
          showCamera={Platform.OS !== "web"}
          stopDisabled={stopDisabled}
          voiceStatus={voiceStatus}
          waveformLevels={waveformLevels}
        />
      </Card>
    </View>
  );

  return (
    <View style={styles.shell}>
      <CopilotResizableWorkspace
        chat={chatNode}
        clinicalPanel={(
          <CopilotClinicalPanel
            attachments={attachments}
            clinicalLinkage={clinicalLinkage}
            collapsed={clinicalCollapsed}
            onToggleCollapse={toggleClinicalCollapse}
          />
        )}
        sidebar={sidebarNode ?? <View />}
      />
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

function HeaderTool({ disabled, icon, label, onPress }: { disabled?: boolean; icon: keyof typeof Feather.glyphMap; label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={[styles.headerTool, disabled && styles.disabled]}>
      <Feather name={icon} size={14} color={medicalTheme.primary} />
      <Text style={styles.headerToolText}>{label}</Text>
    </Pressable>
  );
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
  chatPanel: { backgroundColor: "rgba(2,6,23,0.82)", borderColor: glassBorder, flex: 1, flexDirection: "column", gap: 8, minHeight: 0, minWidth: 320, padding: 16 },
  chatTools: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: 8 },
  citation: { alignItems: "center", backgroundColor: "rgba(20,221,230,0.08)", borderColor: glassBorder, borderRadius: 999, borderWidth: 1, flexDirection: "row", gap: 6, paddingHorizontal: 9, paddingVertical: 6 },
  citationText: { color: medicalTheme.text, fontSize: 11, fontWeight: "800" },
  citations: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
  codeText: { backgroundColor: "#020617", borderColor: glassBorder, borderRadius: 8, borderWidth: 1, color: "#D6E4FF", fontFamily: Platform.select({ web: "monospace", default: undefined }), fontSize: 12, lineHeight: 18, padding: 8 },
  inlineBold: { fontWeight: "800" },
  inlineCode: { backgroundColor: "rgba(15,23,42,0.8)", color: "#D6E4FF", fontFamily: Platform.select({ web: "monospace", default: undefined }), fontSize: 12 },
  inlineItalic: { fontStyle: "italic" },
  composer: { backgroundColor: "rgba(15,23,42,0.92)", borderColor: glassBorder, borderRadius: 22, borderWidth: 1, gap: 10, padding: 12 },
  composerDock: { flexShrink: 0 },
  commandChip: { backgroundColor: "rgba(30,41,59,0.85)", borderColor: glassBorder, borderRadius: 999, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6 },
  commandChipText: { color: medicalTheme.primary, fontSize: 11, fontWeight: "800" },
  commandRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  composerInput: { color: medicalTheme.text, flex: 1, fontSize: 14, lineHeight: 21, maxHeight: 120, minHeight: 54, minWidth: 240, padding: 10 },
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
  liveTranscript: { color: medicalTheme.primary, fontSize: 13, fontWeight: "800", lineHeight: 20, paddingHorizontal: 4 },
  main: { flex: 1, gap: 12, minHeight: 0, minWidth: 0 },
  message: { borderRadius: 20, borderWidth: 1, gap: 4, maxWidth: "86%", padding: 12 },
  messageBullet: { color: medicalTheme.text, fontSize: 14, lineHeight: 22, paddingLeft: 8 },
  messageHeading: { color: medicalTheme.text, fontSize: 16, fontWeight: "900", marginTop: 8 },
  messageList: { gap: 8, paddingBottom: 12 },
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
  shell: { backgroundColor: "#020617", flex: 1, flexDirection: "column", minHeight: 0, overflow: "hidden", width: "100%" },
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
