import type { CopilotAttachment, CopilotMessage } from "@/services/copilot";
import type { VoiceStatus } from "@/services/voiceEngine";

export type SpeechControl = {
  muted: boolean;
  onMuteToggle: () => void;
  onPauseResume: () => void;
  onReplay: (content: string, id: string) => void;
  onSpeak: (content: string, id: string) => void;
  onStop: () => void;
  paused: boolean;
  speakingMessageId?: string;
};

export type UploadPipelineStage =
  | "upload"
  | "detect"
  | "ocr"
  | "metadata"
  | "context"
  | "validation"
  | "completed"
  | "failed"
  | "cancelled";

export type UploadPipelineJob = {
  attachmentId?: string;
  cancel?: () => void;
  error?: string;
  fileName: string;
  progress: number;
  retry?: () => void;
  stage: UploadPipelineStage;
  stageLabel: string;
};

export type CopilotPanelId = "patient" | "ecg" | "chat" | "measurements" | "timeline" | "interpretation" | "reports";

export type CopilotWorkspaceLayout = {
  collapsed: Partial<Record<CopilotPanelId, boolean>>;
  sizes: Partial<Record<CopilotPanelId, number>>;
};

export const UPLOAD_STAGE_LABELS: Record<UploadPipelineStage, string> = {
  cancelled: "Cancelled",
  completed: "Complete",
  context: "Building clinical context",
  detect: "Detecting document type",
  failed: "Failed",
  metadata: "Extracting medical metadata",
  ocr: "Running OCR",
  upload: "Uploading",
  validation: "Clinical validation",
};

export const DEFAULT_UPLOAD_ANALYSIS_PROMPT =
  "Review the attached medical files, perform OCR-informed analysis, identify document or image type, explain findings, cite trusted medical knowledge, provide warnings, and suggest next steps.";

export type MessageListHandle = {
  scrollToEnd: (opts?: { animated?: boolean }) => void;
  scrollToOffset: (opts: { animated?: boolean; offset: number }) => void;
};

export type MessageListProps = {
  messages: CopilotMessage[];
  onNotice: (text: string, tone?: "error" | "success") => void;
  onScrollNearBottomChange: (nearBottom: boolean) => void;
  onShowNewMessages?: () => void;
  showNewMessagesButton: boolean;
  speechControl: SpeechControl;
  status?: string;
  streamingMessage?: string;
  voiceStatus: VoiceStatus;
};
