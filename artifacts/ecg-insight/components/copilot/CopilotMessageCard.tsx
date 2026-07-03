import { Feather } from "@expo/vector-icons";
import React, { memo } from "react";
import { Image, Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { medicalTheme } from "@/components/enterprise/EnterpriseUI";
import type { CopilotAttachment, CopilotMessage } from "@/services/copilot";
import { safeArray } from "@/utils/collections";

import type { SpeechControl } from "./types";

function sanitizeAssistantContent(content: string) {
  return content
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

function safeTime(value: unknown, fallback = "--:--") {
  const date = new Date(safeString(value));
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
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

function InlineMarkdown({ text }: { text: string }) {
  const parts = text.split(/(\*\*.+?\*\*|\*.+?\*|`[^`]+`)/g);
  return (
    <Text>
      {parts.map((part, index) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return <Text key={index} style={styles.inlineBold}>{part.slice(2, -2)}</Text>;
        }
        if (part.startsWith("*") && part.endsWith("*") && !part.startsWith("**")) {
          return <Text key={index} style={styles.inlineItalic}>{part.slice(1, -1)}</Text>;
        }
        if (part.startsWith("`") && part.endsWith("`")) {
          return <Text key={index} style={styles.inlineCode}>{part.slice(1, -1)}</Text>;
        }
        return part;
      })}
    </Text>
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
        if (line.startsWith("## ")) return <Text key={index} style={styles.messageHeading}><InlineMarkdown text={line.replace(/^##\s*/, "")} /></Text>;
        if (line.startsWith("### ")) return <Text key={index} style={styles.messageSubheading}><InlineMarkdown text={line.replace(/^###\s*/, "")} /></Text>;
        if (line.startsWith("- ")) return <Text key={index} style={styles.messageBullet}>• <InlineMarkdown text={line.slice(2)} /></Text>;
        if (/^\d+\.\s/.test(line)) return <Text key={index} style={styles.messageText}><InlineMarkdown text={line} /></Text>;
        if (line.includes("|")) return <Text key={index} style={styles.messageTable}>{line}</Text>;
        return <Text key={index} style={styles.messageText}><InlineMarkdown text={line} /></Text>;
      })}
    </View>
  );
}

function MiniAction({ active, disabled, icon, label, onPress, tone }: { active?: boolean; disabled?: boolean; icon: keyof typeof Feather.glyphMap; label: string; onPress: () => void; tone?: "danger" }) {
  return (
    <Pressable accessibilityLabel={label} accessibilityRole="button" disabled={disabled} onPress={onPress} style={[styles.miniAction, active && styles.miniActionActive, disabled && styles.disabled]}>
      <Feather name={icon} size={12} color={tone === "danger" ? medicalTheme.critical : active ? medicalTheme.primary : medicalTheme.muted} />
    </Pressable>
  );
}

export function AttachmentChip({ attachment, onRemove, previewUrl }: { attachment: CopilotAttachment; onRemove?: () => void; previewUrl?: string }) {
  const originalName = safeString(attachment?.originalName, "Uploaded file");
  const attachmentKind = safeString(attachment?.kind, "file");
  const documentType = safeString(attachment?.documentType, "").replace(/_/g, " ");
  const confidence = typeof attachment?.confidence === "number" ? `${Math.round(attachment.confidence * 100)}% confidence` : undefined;
  const summary = attachment?.analysisSummary?.slice(0, 120);
  return (
    <View style={styles.attachmentChip}>
      {previewUrl ? <Image accessibilityLabel={`${originalName} preview`} source={{ uri: previewUrl }} style={styles.attachmentPreview} /> : null}
      <Feather name={attachmentKind === "camera" ? "camera" : attachmentKind === "image" ? "image" : attachmentKind === "ecg" ? "activity" : attachmentKind === "echo" ? "heart" : attachmentKind === "labs" ? "clipboard" : "paperclip"} size={13} color={medicalTheme.primary} />
      <View style={styles.attachmentChipText}>
        <Text numberOfLines={1} style={styles.attachmentName}>{originalName}</Text>
        <Text style={styles.attachmentMeta}>
          {[documentType, confidence, formatFileSize(attachment?.sizeBytes)].filter(Boolean).join(" • ")}
        </Text>
        {summary ? <Text numberOfLines={2} style={styles.attachmentSummary}>{summary}</Text> : null}
      </View>
      {onRemove ? (
        <Pressable accessibilityLabel={`Remove ${originalName}`} accessibilityRole="button" onPress={onRemove} style={styles.attachmentRemove}>
          <Feather name="x" size={12} color={medicalTheme.text} />
        </Pressable>
      ) : null}
    </View>
  );
}

type CopilotMessageCardProps = {
  message: CopilotMessage;
  onNotice: (text: string, tone?: "error" | "success") => void;
  speechControl: SpeechControl;
};

function CopilotMessageCardComponent({ message, onNotice, speechControl }: CopilotMessageCardProps) {
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

export const CopilotMessageCard = memo(CopilotMessageCardComponent);

const glassBorder = "rgba(148,163,184,0.22)";

const styles = StyleSheet.create({
  answerTools: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 8 },
  assistantMessage: { alignSelf: "flex-start", backgroundColor: "rgba(8,18,34,0.96)", borderColor: "rgba(20,221,230,0.22)" },
  attachmentChip: { alignItems: "center", backgroundColor: "rgba(20,221,230,0.08)", borderColor: glassBorder, borderRadius: 14, borderWidth: 1, flexDirection: "row", gap: 8, maxWidth: 260, paddingHorizontal: 10, paddingVertical: 8 },
  attachmentChipText: { flex: 1, minWidth: 0 },
  attachmentMeta: { color: medicalTheme.muted, fontSize: 10, fontWeight: "800" },
  attachmentName: { color: medicalTheme.text, fontSize: 12, fontWeight: "900" },
  attachmentPreview: { backgroundColor: "rgba(2,6,23,0.72)", borderColor: glassBorder, borderRadius: 10, borderWidth: 1, height: 42, width: 42 },
  attachmentRemove: { alignItems: "center", backgroundColor: "rgba(239,68,68,0.18)", borderRadius: 999, height: 22, justifyContent: "center", width: 22 },
  attachmentSummary: { color: medicalTheme.muted, fontSize: 10, fontWeight: "700", lineHeight: 14, marginTop: 3 },
  codeText: { backgroundColor: "#020617", borderColor: glassBorder, borderRadius: 8, borderWidth: 1, color: "#D6E4FF", fontFamily: Platform.select({ web: "monospace", default: undefined }), fontSize: 12, lineHeight: 18, padding: 8 },
  disabled: { opacity: 0.45 },
  inlineBold: { fontWeight: "800" },
  inlineCode: { backgroundColor: "rgba(15,23,42,0.8)", color: "#D6E4FF", fontFamily: Platform.select({ web: "monospace", default: undefined }), fontSize: 12 },
  inlineItalic: { fontStyle: "italic" },
  message: { borderRadius: 20, borderWidth: 1, gap: 4, maxWidth: "86%", padding: 12 },
  messageAttachments: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  messageBullet: { color: medicalTheme.text, fontSize: 14, lineHeight: 22, paddingLeft: 8 },
  messageHeading: { color: medicalTheme.text, fontSize: 16, fontWeight: "900", marginTop: 8 },
  messageRole: { color: medicalTheme.primary, fontSize: 10, fontWeight: "900", textTransform: "uppercase" },
  messageSpace: { height: 5 },
  messageSubheading: { color: medicalTheme.primary, fontSize: 14, fontWeight: "900", marginTop: 6 },
  messageTable: { backgroundColor: "rgba(2,6,23,0.42)", borderColor: glassBorder, borderRadius: 8, borderWidth: 1, color: medicalTheme.text, fontFamily: Platform.select({ web: "monospace", default: undefined }), fontSize: 11, lineHeight: 17, padding: 6 },
  messageText: { color: medicalTheme.text, fontSize: 14, lineHeight: 22 },
  messageTime: { color: medicalTheme.muted, fontSize: 10, fontWeight: "800" },
  messageTop: { alignItems: "center", flexDirection: "row", gap: 8, justifyContent: "space-between" },
  miniAction: { alignItems: "center", backgroundColor: "rgba(2,6,23,0.34)", borderRadius: 999, height: 24, justifyContent: "center", width: 24 },
  miniActionActive: { backgroundColor: "rgba(20,221,230,0.16)" },
  richText: { gap: 2 },
  speakingState: { color: medicalTheme.primary, fontSize: 11, fontWeight: "800" },
  userMessage: { alignSelf: "flex-end", backgroundColor: "rgba(20,221,230,0.1)", borderColor: "rgba(20,221,230,0.35)" },
});

export { sanitizeAssistantContent };
