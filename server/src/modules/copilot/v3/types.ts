import type { AttachmentForAnalysis, ChatContextInput, ClinicalContext, ConversationMemory } from "../copilot-types";

export type LlmRole = "system" | "user" | "assistant" | "tool";

export type LlmMessage = {
  content: string;
  name?: string;
  role: LlmRole;
  tool_call_id?: string;
};

export type LlmToolCall = {
  arguments: string;
  id: string;
  name: string;
};

export type V3PipelineInput = {
  attachments: AttachmentForAnalysis[];
  chatInput: ChatContextInput;
  clinicianName?: string | null;
  conversationId: string;
  memory: ConversationMemory;
  question: string;
  voiceMode?: boolean;
};

export type V3PipelineDeps = {
  retrieveClinicalContext: (input: ChatContextInput) => Promise<ClinicalContext>;
};

export type V3StreamCallbacks = {
  onStatus?: (message: string) => void;
  onToken?: (token: string) => void;
};

export type V3PipelineResult = {
  content: string;
  model: string;
  toolCallsUsed: string[];
};

export type DocumentAnalysisJson = {
  abnormalValues?: string[];
  documentType: string;
  extractedTextPreview?: string;
  findings: string[];
  impression?: string;
  intervals?: Record<string, string | number | null>;
  measurements?: Record<string, string | number | null>;
  morphology?: string[];
  name: string;
  pipeline: "ecg" | "laboratory" | "radiology" | "general";
  recommendations?: string[];
  rhythm?: string | null;
  warnings?: string[];
};
