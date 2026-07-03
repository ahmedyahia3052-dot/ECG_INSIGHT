import { Feather } from "@expo/vector-icons";
import React, { useCallback, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { medicalTheme, PrimaryButton } from "@/components/enterprise/EnterpriseUI";
import type { CopilotAttachment } from "@/services/copilot";
import type { VoiceStatus } from "@/services/voiceEngine";
import { safeArray } from "@/utils/collections";

import { AttachmentChip } from "./CopilotMessageCard";
import { UploadPipelineProgress } from "./UploadPipelineProgress";
import type { UploadPipelineJob } from "./types";

const TUTOR_COMMANDS = [
  { command: "/teach", label: "Teach" },
  { command: "/quiz", label: "Quiz" },
  { command: "/case", label: "Case" },
  { command: "/explain", label: "Explain" },
  { command: "/summarize", label: "Summarize" },
] as const;

const COMPOSER_MIN_HEIGHT = 48;
const COMPOSER_MAX_HEIGHT = 120;

type CopilotComposerProps = {
  attachments: CopilotAttachment[];
  attachmentPreviews: Record<string, string>;
  characterCount: number;
  composerEditable?: boolean;
  draft: string;
  isRecording: boolean;
  liveTranscript: string;
  onCaptureEcg?: () => void;
  onDraftChange: (value: string) => void;
  onOpenFilePicker: (kind: "ecg" | "file" | "image") => void;
  onRemoveAttachment: (attachmentId: string) => void;
  onSend: () => void;
  onStopStream: () => void;
  onToggleVoice: () => void;
  pipelineJobs: UploadPipelineJob[];
  sendDisabled: boolean;
  showCamera: boolean;
  stopDisabled: boolean;
  voiceStatus: VoiceStatus;
  waveformLevels?: number[];
};

function ComposerTool({ active, icon, label, onPress, testID }: { active?: boolean; icon: keyof typeof Feather.glyphMap; label: string; onPress: () => void; testID?: string }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={[styles.composerTool, active && styles.composerToolActive]} testID={testID}>
      <Feather name={icon} size={13} color={medicalTheme.primary} />
      <Text style={styles.composerToolText}>{label}</Text>
    </Pressable>
  );
}

function VoiceWaveform({ levels }: { levels: number[] }) {
  if (!levels.length) return null;
  return (
    <View accessibilityLabel="Recording waveform" style={styles.waveform}>
      {levels.map((level, index) => (
        <View key={`wave-${index}`} style={[styles.waveBar, { height: Math.max(4, level * 28) }]} />
      ))}
    </View>
  );
}

export function CopilotComposer({
  attachments,
  attachmentPreviews,
  characterCount,
  composerEditable = true,
  draft,
  isRecording,
  liveTranscript,
  onCaptureEcg,
  onDraftChange,
  onOpenFilePicker,
  onRemoveAttachment,
  onSend,
  onStopStream,
  onToggleVoice,
  pipelineJobs,
  sendDisabled,
  showCamera,
  stopDisabled,
  voiceStatus,
  waveformLevels = [],
}: CopilotComposerProps) {
  const [inputHeight, setInputHeight] = useState(COMPOSER_MIN_HEIGHT);

  const handleContentSizeChange = useCallback((event: { nativeEvent: { contentSize: { height: number } } }) => {
    const next = Math.min(COMPOSER_MAX_HEIGHT, Math.max(COMPOSER_MIN_HEIGHT, event.nativeEvent.contentSize.height + 16));
    setInputHeight(next);
  }, []);

  return (
    <View style={styles.composerDock}>
      <View style={styles.composer}>
        <View style={styles.attachmentRow}>
          <ComposerTool active={isRecording} icon="mic" label={isRecording ? "Stop Voice" : "Voice"} onPress={onToggleVoice} />
          <ComposerTool icon="activity" label="Upload ECG" onPress={() => onOpenFilePicker("ecg")} testID="copilot-upload-ecg" />
          {showCamera ? <ComposerTool icon="camera" label="Camera ECG" onPress={() => onCaptureEcg?.()} testID="copilot-camera-ecg" /> : null}
          <ComposerTool icon="paperclip" label="Upload Files" onPress={() => onOpenFilePicker("file")} testID="copilot-upload-file" />
          <ComposerTool icon="image" label="Upload Image" onPress={() => onOpenFilePicker("image")} testID="copilot-upload-image" />
        </View>
        {attachments.length ? (
          <View style={styles.attachmentPanel}>
            {attachments.map((attachment, index) => (
              <AttachmentChip
                attachment={attachment}
                key={attachment?.id ?? `attachment-${index}`}
                onRemove={() => attachment?.id && onRemoveAttachment(attachment.id)}
                previewUrl={attachment?.id ? attachmentPreviews[attachment.id] : undefined}
              />
            ))}
          </View>
        ) : null}
        {pipelineJobs.length ? <UploadPipelineProgress jobs={pipelineJobs} /> : null}
        <View style={styles.commandRow}>
          {TUTOR_COMMANDS.map(({ command }) => (
            <Pressable
              accessibilityLabel={`Insert ${command} command`}
              accessibilityRole="button"
              key={command}
              onPress={() => onDraftChange(draft.trim() ? `${draft.trim()} ${command}` : `${command} `)}
              style={styles.commandChip}
            >
              <Text style={styles.commandChipText}>{command}</Text>
            </Pressable>
          ))}
        </View>
        {(isRecording || voiceStatus === "processing" || voiceStatus === "recording") && liveTranscript ? (
          <Text style={styles.liveTranscript} testID="copilot-live-transcript">{liveTranscript}</Text>
        ) : null}
        {(isRecording || voiceStatus === "recording") && waveformLevels.length ? <VoiceWaveform levels={waveformLevels} /> : null}
        <View style={styles.inputRow}>
          <TextInput
            editable={composerEditable}
            multiline
            accessibilityLabel="Message the assistant"
            onChangeText={onDraftChange}
            onContentSizeChange={handleContentSizeChange}
            onKeyPress={({ nativeEvent }) => {
              if (Platform.OS !== "web" || !composerEditable) return;
              const event = nativeEvent as unknown as { key?: string; shiftKey?: boolean };
              if (event.key === "Enter" && !event.shiftKey) onSend();
            }}
            placeholder="Message the assistant..."
            placeholderTextColor={medicalTheme.muted}
            scrollEnabled={inputHeight >= COMPOSER_MAX_HEIGHT}
            style={[styles.composerInput, { height: inputHeight, maxHeight: COMPOSER_MAX_HEIGHT }, !composerEditable && styles.composerInputDisabled]}
            testID="copilot-composer-input"
            value={draft}
          />
          <PrimaryButton disabled={sendDisabled} icon="send" label="Send" onPress={onSend} testID="copilot-send-button" />
          {stopDisabled ? null : <PrimaryButton disabled={stopDisabled} icon="square" label="Stop" onPress={onStopStream} testID="copilot-stop-button" variant="outline" />}
        </View>
        <Text style={styles.counter}>{characterCount}/8000 • Enter sends • Shift+Enter creates a new line</Text>
      </View>
    </View>
  );
}

const glassBorder = "rgba(148,163,184,0.22)";

const styles = StyleSheet.create({
  attachmentPanel: { borderColor: "rgba(148,163,184,0.16)", borderRadius: 16, borderWidth: 1, flexDirection: "row", flexWrap: "wrap", gap: 8, padding: 8 },
  attachmentRow: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: 8 },
  commandChip: { backgroundColor: "rgba(30,41,59,0.85)", borderColor: glassBorder, borderRadius: 999, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6 },
  commandChipText: { color: medicalTheme.primary, fontSize: 11, fontWeight: "800" },
  commandRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  composer: { backgroundColor: "rgba(15,23,42,0.92)", borderColor: glassBorder, borderRadius: 22, borderWidth: 1, gap: 10, padding: 12 },
  composerDock: { flexShrink: 0 },
  composerInput: {
    color: medicalTheme.text,
    flex: 1,
    fontSize: 14,
    lineHeight: 21,
    minHeight: COMPOSER_MIN_HEIGHT,
    minWidth: 240,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  composerInputDisabled: { opacity: 0.65 },
  composerTool: { alignItems: "center", backgroundColor: "rgba(20,221,230,0.08)", borderColor: glassBorder, borderRadius: 999, borderWidth: 1, flexDirection: "row", gap: 6, paddingHorizontal: 9, paddingVertical: 6 },
  composerToolActive: { backgroundColor: "rgba(239,68,68,0.16)", borderColor: "rgba(239,68,68,0.45)" },
  composerToolText: { color: medicalTheme.text, fontSize: 11, fontWeight: "900" },
  counter: { color: medicalTheme.muted, fontSize: 11, fontWeight: "800", textAlign: "right" },
  inputRow: { alignItems: "flex-end", flexDirection: "row", flexWrap: "wrap", gap: 8 },
  liveTranscript: { color: medicalTheme.primary, fontSize: 13, fontWeight: "800", lineHeight: 20, paddingHorizontal: 4 },
  waveBar: { backgroundColor: medicalTheme.primary, borderRadius: 2, width: 3 },
  waveform: { alignItems: "flex-end", flexDirection: "row", gap: 3, height: 32, paddingHorizontal: 4 },
});
