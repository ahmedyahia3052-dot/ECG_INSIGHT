import type { AttachmentForAnalysis, ChatContextInput, ConversationMemory } from "../copilot-types";
import type { CommunicationIntent, ContextState, TopicFrame } from "../engine/types";
import type { SessionRecord } from "../engine/conversation-manager";
import type { ConversationIntentResult } from "../engine/v2/conversation-intent";
import type { EducationalTopic } from "../engine/v2/types";
import type { TutorSlashCommand } from "./slash-commands";

export const CLINICAL_AI_CORE_VERSION = "clinical-ai-core-v1" as const;

export type UserRole = "medical_student" | "patient" | "physician" | "unknown";

export type MemoryState = {
  activeTopic: TopicFrame | null;
  currentCaseId?: string;
  currentPatientId?: string;
  educationalMode: boolean;
  educationalTopic: EducationalTopic;
  hasUploadedFiles: boolean;
  isFollowUp: boolean;
  learningStep: number;
  topicStack: TopicFrame[];
  turnCount: number;
  userRole: UserRole;
};

export type ExtendedIntentResult = ConversationIntentResult & {
  allowKnowledgeTools: boolean;
  allowPatientTools: boolean;
  resolvedQuestion: string;
  slashArgument: string;
  slashCommand: TutorSlashCommand | null;
  tutorMode: boolean;
};

export type CorePipelineInput = {
  attachments: AttachmentForAnalysis[];
  chatInput: ChatContextInput;
  clinicianName?: string | null;
  conversationId: string;
  memory: ConversationMemory;
  question: string;
  voiceMode?: boolean;
};

export type CorePipelineDeps = {
  retrieveClinicalContext: (input: ChatContextInput) => Promise<import("../copilot-types").ClinicalContext>;
};

export type CoreStreamCallbacks = {
  onStatus?: (message: string) => void;
  onToken?: (token: string) => void;
};

export type CoreTurnContext = {
  contextState: ContextState;
  input: CorePipelineInput;
  intent: ExtendedIntentResult;
  memoryState: MemoryState;
  session: SessionRecord;
};

export type CorePipelineResult = {
  communicationIntent: CommunicationIntent;
  content: string;
  contextState: ContextState;
  intent: ExtendedIntentResult;
  knowledgeHits: import("../copilot-types").KnowledgeHit[];
  memoryState: MemoryState;
  model: string;
  session: SessionRecord;
  toolCallsUsed: string[];
};
