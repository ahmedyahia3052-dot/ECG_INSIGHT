import type {
  AttachmentForAnalysis,
  AttachmentInsight,
  ChatContextInput,
  ClinicalContext,
  ConversationMemory,
  KnowledgeHit,
} from "../../copilot-types";
import type { ContextState } from "../types";
import type { SessionRecord } from "../conversation-manager";

export const CLINICAL_AI_CORE_V2 = "v2" as const;

export type ConversationMode =
  | "clarification"
  | "clinical_question"
  | "education"
  | "emergency"
  | "farewell"
  | "follow_up"
  | "greeting"
  | "patient_context"
  | "small_talk"
  | "vision_review";

export type EducationalTopic = "ecg_basics" | "general_medicine" | "none";

export type EmergencyLevel = "HIGH" | "MODERATE" | "NONE";

export type ReasoningResult = {
  clarificationPrompt?: string;
  educationalMode: boolean;
  educationalTopic: EducationalTopic;
  emergencyLevel: EmergencyLevel;
  internalIntent: import("./conversation-intent").ConversationIntent;
  knowledgeQuery: string;
  learningStep: number;
  mode: ConversationMode;
  needsClarification: boolean;
  needsKnowledge: boolean;
  needsPatientContext: boolean;
  needsVision: boolean;
  responseTag: string;
};

export type PipelineInput = {
  attachments: AttachmentForAnalysis[];
  chatInput: ChatContextInput;
  clinicianName?: string | null;
  conversationId: string;
  memory: ConversationMemory;
  question: string;
  voiceMode?: boolean;
};

export type PipelineContext = {
  clinicalContext: ClinicalContext;
  contextState: ContextState;
  insights: AttachmentInsight[];
  isFollowUp: boolean;
  knowledgeHits: KnowledgeHit[];
  knowledgeRoute: import("../types").KnowledgeRoute;
  memory: ConversationMemory;
  reasoning: ReasoningResult;
  resolvedQuestion: string;
  session: SessionRecord | undefined;
};

export type PipelineOutput = {
  content: string;
  context: PipelineContext;
  executionTimeMs: number;
};

export const ECG_LEARNING_PATH = [
  "Cardiac anatomy",
  "Conduction system",
  "ECG paper",
  "Calibration",
  "Lead placement",
  "Heart rate",
  "Rhythm",
  "Axis",
] as const;
