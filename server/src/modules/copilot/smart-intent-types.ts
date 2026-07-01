import type { AttachmentForAnalysis, ChatContextInput, ConversationMemory, MedicalIntent } from "./copilot-types";

export type SmartIntent =
  | "administrative"
  | "cardiology_question"
  | "conversation"
  | "create_follow_up_plan"
  | "current_patient_question"
  | "drug_information"
  | "drug_interaction"
  | "ecg_comparison"
  | "ecg_interpretation"
  | "emergency_warning"
  | "evidence_search"
  | "explain_medical_concept"
  | "fitness_for_work"
  | "general_medical_question"
  | "generate_letter"
  | "generate_medical_report"
  | "generate_referral"
  | "goodbye"
  | "greeting"
  | "medical_guidelines"
  | "medical_education"
  | "occupational_fitness"
  | "patient_history"
  | "patient_lookup"
  | "report_generation"
  | "rewrite"
  | "small_talk"
  | "summarize"
  | "thanks"
  | "translate"
  | "unknown"
  | "uploaded_ecg_analysis"
  | "voice_conversation";

export type CopilotTool =
  | "conversation"
  | "drug_database"
  | "ecg_ai"
  | "guidelines"
  | "image_analysis"
  | "knowledge_search"
  | "no_tool"
  | "ocr"
  | "patient_database"
  | "report_generator";

export type ExtractedEntities = {
  ages: number[];
  dates: string[];
  diseases: string[];
  drugs: string[];
  ecgFindings: string[];
  genders: string[];
  heartRates: number[];
  occupations: string[];
  patientNames: string[];
  prIntervals: string[];
  qrsDurations: string[];
  qtValues: string[];
  reportTypes: string[];
  rhythms: string[];
  riskFactors: string[];
};

export type ConversationContextState = {
  currentCaseId?: string;
  currentPatientId?: string;
  discussionTopic: string;
  hasUploadedEcg: boolean;
  hasUploadedImage: boolean;
  hasUploadedReport: boolean;
  patientName?: string;
  requiresClarification: boolean;
  clarificationPrompt?: string;
};

export type IntentMatch = {
  confidence: number;
  intent: SmartIntent;
  reason: string;
};

export type IntentClassificationResult = {
  confidence: number;
  emergencyPriority: "HIGH" | "LOW" | "MODERATE" | "NONE";
  entities: ExtractedEntities;
  executionTimeMs: number;
  intents: IntentMatch[];
  normalizedQuestion: string;
  primaryIntent: SmartIntent;
  primaryMedicalIntent: MedicalIntent;
  requiresClarification: boolean;
  clarificationPrompt?: string;
};

export type PlannerStep = {
  intent: SmartIntent;
  medicalIntent: MedicalIntent;
  note: string;
  tools: CopilotTool[];
};

export type ConversationPlan = {
  context: ConversationContextState;
  emergencyPriority: IntentClassificationResult["emergencyPriority"];
  requiresClarification: boolean;
  clarificationPrompt?: string;
  steps: PlannerStep[];
  tools: CopilotTool[];
};

export type IntentPipelineInput = {
  attachments: AttachmentForAnalysis[];
  chatInput: ChatContextInput;
  memory: ConversationMemory;
  question: string;
};

export type IntentPipelineResult = {
  classification: IntentClassificationResult;
  plan: ConversationPlan;
};

export type IntentDebugPayload = {
  classification: IntentClassificationResult;
  plan: ConversationPlan;
};
