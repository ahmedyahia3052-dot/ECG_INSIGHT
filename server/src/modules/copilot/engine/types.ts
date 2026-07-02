import type { Prisma } from "@prisma/client";
import type { ClinicalKnowledgeRouteResult } from "./clinical-knowledge-router";
import type {
  AttachmentForAnalysis,
  AttachmentInsight,
  ChatContextInput,
  ClinicalContext,
  ConversationMemory,
  KnowledgeHit,
  MedicalIntent,
} from "../copilot-types";
import type { CopilotTool, IntentClassificationResult, SmartIntent } from "../smart-intent-types";

export const CLINICAL_AI_ENGINE_VERSION = "clinical-ai-core-v1" as const;

export type KnowledgeSource =
  | "aha_guidelines"
  | "cardiology_kb"
  | "clinical_calculator"
  | "drug_database"
  | "ecg_database"
  | "esc_guidelines"
  | "internal_knowledge_base"
  | "laboratory_database"
  | "occupational_medicine"
  | "patient_database"
  | "risk_scores"
  | "uploaded_documents"
  | "uploaded_ecg"
  | "uploaded_images";

export type CommunicationIntent =
  | "Comparison"
  | "DocumentReview"
  | "DrugInformation"
  | "ECGAnalysis"
  | "ECGUpload"
  | "Education"
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

export type TopicFrame = {
  label: string;
  slug: string;
};

export type EntityMemory = {
  ages: number[];
  diseases: string[];
  drugs: string[];
  patientNames: string[];
};

export type ContextState = {
  activeTopic: TopicFrame | null;
  entityMemory: EntityMemory;
  hasActiveCase: boolean;
  hasActivePatient: boolean;
  hasUploadedEcg: boolean;
  hasUploadedFiles: boolean;
  hasUploadedImages: boolean;
  resolvedQuestion: string;
  topicStack: TopicFrame[];
};

export type KnowledgeRoute = {
  query: string;
  sources: KnowledgeSource[];
};

export type ToolPlan = {
  runClinicalContext: boolean;
  runDrugDatabase: boolean;
  runEcgEngine: boolean;
  runKnowledge: boolean;
  runOcr: boolean;
  runPatientDatabase: boolean;
  runReportGenerator: boolean;
  tools: CopilotTool[];
};

export type ResponsePlan = {
  allowBullets: boolean;
  maxParagraphs: number;
  style: "conversational" | "clinical_brief" | "supportive";
  suggestFollowUps: boolean;
};

export type ClinicalPlanStep = {
  action: string;
  order: number;
  tool: CopilotTool;
};

export type EngineInput = {
  attachments: AttachmentForAnalysis[];
  chatInput: ChatContextInput;
  clinicianName?: string | null;
  conversationId: string;
  memory: ConversationMemory;
  question: string;
  voiceMode?: boolean;
};

export type EngineResult = {
  classification: IntentClassificationResult;
  communicationIntent: CommunicationIntent;
  context: ContextState;
  conversationState?: import("./conversation-manager").ConversationState;
  executionTimeMs: number;
  intentConfidence: number;
  knowledgeDomain: ClinicalKnowledgeRouteResult;
  knowledgeHits: KnowledgeHit[];
  knowledgeRoute: KnowledgeRoute;
  medicalIntent: MedicalIntent;
  plan: ResponsePlan;
  requiresClarification: boolean;
  response: { content: string };
  sessionTurnCount: number;
  tag: string;
  toolPlan: ToolPlan;
};

export type EngineDebugPayload = {
  classification: IntentClassificationResult;
  communicationIntent: CommunicationIntent;
  context: ContextState;
  conversationState?: {
    conversationSummary: string;
    currentTopic: TopicFrame | null;
    isFollowUp: boolean;
    previousTopic: TopicFrame | null;
    voiceActive: boolean;
    voiceStatus: string;
  };
  engineVersion: typeof CLINICAL_AI_ENGINE_VERSION;
  executionTimeMs: number;
  knowledgeRoute: KnowledgeRoute;
  plan: ResponsePlan;
  toolPlan: ToolPlan;
};

export type GenerateInput = {
  attachments: AttachmentForAnalysis[];
  clarificationPrompt?: string;
  clinicianName?: string | null;
  clinicalContext: ClinicalContext;
  communicationIntent: CommunicationIntent;
  intent: MedicalIntent;
  knowledge: KnowledgeHit[];
  knowledgeDomain?: ClinicalKnowledgeRouteResult;
  memory: ConversationMemory;
  plan: ResponsePlan;
  question: string;
  requiresClarification: boolean;
  topic: TopicFrame | null;
};

export type AttachmentInsightResult = AttachmentInsight;

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
    medical_education: "Education",
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

export type StoredCitation = { id: string; label: string; source: string; tags?: string[]; type: string };

export type AttachmentAnalysisRow = AttachmentForAnalysis & { medicalAnalysis: Prisma.JsonValue | null };
