import type { AttachmentForAnalysis, ChatContextInput, ClinicalContext, ConversationMemory, KnowledgeHit } from "../copilot-types";
import type { BrainResult } from "../brain/brain-types";
import type { SmartIntent } from "../smart-intent-types";

export const COMMUNICATION_LAYER_VERSION = "v1" as const;
export const INTENT_CONFIDENCE_THRESHOLD = 0.55;

export type CommunicationIntent =
  | "Comparison"
  | "DocumentReview"
  | "DrugInformation"
  | "ECGAnalysis"
  | "ECGUpload"
  | "EmergencyAdvice"
  | "FileAnalysis"
  | "FollowUpQuestion"
  | "Greeting"
  | "GuidelineSearch"
  | "ImageInterpretation"
  | "MedicalQuestion"
  | "OccupationalFitness"
  | "PatientLookup"
  | "ReportGeneration"
  | "RiskAssessment"
  | "SmallTalk"
  | "SystemQuestion"
  | "Unknown";

export type KnowledgeSource =
  | "aha_guidelines"
  | "cardiology_kb"
  | "clinical_calculator"
  | "drug_database"
  | "ecg_knowledge_base"
  | "esc_guidelines"
  | "internal_patient_records"
  | "laboratory_database"
  | "occupational_medicine"
  | "risk_scores"
  | "uploaded_documents"
  | "uploaded_ecg";

export type ConversationTopic = {
  label: string;
  slug: string;
};

export type ContextWindowTurn = {
  content: string;
  role: "assistant" | "user";
};

export type SessionState = {
  conversationId: string;
  lastIntent: CommunicationIntent;
  lastUpdatedAt: number;
  topic: ConversationTopic | null;
  turnCount: number;
  voiceSessionActive: boolean;
};

export type CommunicationMemory = ConversationMemory & {
  activeTopic: ConversationTopic | null;
  resolvedFollowUps: string[];
  summary: string;
};

export type KnowledgeRoute = {
  query: string;
  sources: KnowledgeSource[];
};

export type ResponsePlan = {
  allowBullets: boolean;
  maxParagraphs: number;
  style: "conversational" | "clinical_brief" | "supportive";
  suggestFollowUps: boolean;
};

export type CommunicationInput = {
  attachments: AttachmentForAnalysis[];
  chatInput: ChatContextInput;
  clinicianName?: string | null;
  conversationId: string;
  memory: ConversationMemory;
  question: string;
};

export type CommunicationResult = {
  brain: BrainResult;
  clarificationPrompt?: string;
  communicationIntent: CommunicationIntent;
  intentConfidence: number;
  knowledgeRoute: KnowledgeRoute;
  memory: CommunicationMemory;
  requiresClarification: boolean;
  resolvedQuestion: string;
  responsePlan: ResponsePlan;
  session: SessionState;
  executionTimeMs: number;
};

export type CommunicationComposeInput = {
  brain: BrainResult;
  clinicalContext: ClinicalContext;
  communicationIntent: CommunicationIntent;
  knowledgeHits: KnowledgeHit[];
  responsePlan: ResponsePlan;
};

export type CommunicationComposeResult = {
  citations: never[];
  confidence: null;
  content: string;
};

export type CommunicationDebugPayload = {
  communicationVersion: typeof COMMUNICATION_LAYER_VERSION;
  intent: CommunicationIntent;
  intentConfidence: number;
  knowledgeSources: KnowledgeSource[];
  memoryTopic: string | null;
  resolvedQuestion: string;
  responsePlan: ResponsePlan;
  sessionTurnCount: number;
  brain: import("../brain/brain-types").BrainDebugPayload;
};

export function mapSmartIntentToCommunicationIntent(intent: SmartIntent): CommunicationIntent {
  const map: Partial<Record<SmartIntent, CommunicationIntent>> = {
    administrative: "SystemQuestion",
    cardiology_question: "MedicalQuestion",
    conversation: "SmallTalk",
    create_follow_up_plan: "FollowUpQuestion",
    current_patient_question: "PatientLookup",
    drug_information: "DrugInformation",
    drug_interaction: "DrugInformation",
    ecg_comparison: "Comparison",
    ecg_interpretation: "ECGAnalysis",
    emergency_warning: "EmergencyAdvice",
    evidence_search: "GuidelineSearch",
    explain_medical_concept: "MedicalQuestion",
    fitness_for_work: "OccupationalFitness",
    general_medical_question: "MedicalQuestion",
    generate_letter: "ReportGeneration",
    generate_medical_report: "ReportGeneration",
    generate_referral: "ReportGeneration",
    goodbye: "SmallTalk",
    greeting: "Greeting",
    medical_guidelines: "GuidelineSearch",
    occupational_fitness: "OccupationalFitness",
    patient_history: "PatientLookup",
    patient_lookup: "PatientLookup",
    report_generation: "ReportGeneration",
    rewrite: "SmallTalk",
    small_talk: "SmallTalk",
    summarize: "DocumentReview",
    thanks: "SmallTalk",
    translate: "SmallTalk",
    unknown: "Unknown",
    uploaded_ecg_analysis: "ECGUpload",
    voice_conversation: "SystemQuestion",
  };
  return map[intent] ?? "Unknown";
}
