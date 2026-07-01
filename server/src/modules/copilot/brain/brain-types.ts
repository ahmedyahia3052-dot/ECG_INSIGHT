import type { AttachmentForAnalysis, ChatContextInput, ClinicalContext, ConversationMemory, KnowledgeHit, MedicalIntent } from "../copilot-types";
import type { ConversationPlan, CopilotTool, IntentClassificationResult } from "../smart-intent-types";

export type BrainPluginId =
  | "chest_xray_ai"
  | "clinical_calculator"
  | "drug_interaction_engine"
  | "echo_ai"
  | "holter_ai"
  | "lab_ai"
  | "ultrasound_ai";

export type ClinicalPlanAction =
  | "compare_ecg"
  | "extract_findings"
  | "generate_report"
  | "generate_summary"
  | "lookup_guidelines"
  | "lookup_patient"
  | "respond"
  | "run_drug_check"
  | "run_ecg_engine"
  | "run_knowledge_search"
  | "run_ocr";

export type ClinicalExecutionStep = {
  action: ClinicalPlanAction;
  description: string;
  order: number;
  tool: CopilotTool;
};

export type ClinicalExecutionPlan = {
  description: string;
  steps: ClinicalExecutionStep[];
};

export type ConversationMemoryState = {
  currentDiscussionTopic: string;
  currentPatientAge?: number;
  currentPatientGender?: string;
  currentPatientName?: string;
  followUpTopics: string[];
  hasActiveCase: boolean;
  hasActivePatient: boolean;
  hasUploadedEcg: boolean;
  hasUploadedFiles: boolean;
  hasUploadedReport: boolean;
  turnCount: number;
};

export type BrainDecision = {
  conversationalOnly: boolean;
  decisionPath: string[];
  emergencyEscalation: boolean;
  isClinical: boolean;
  isConversational: boolean;
  isEcgAnalysis: boolean;
  requiresGuidelines: boolean;
  requiresOcr: boolean;
  requiresPatientData: boolean;
  requiresUploadedFiles: boolean;
  requiresClarification: boolean;
  clarificationPrompt?: string;
  runClinicalContext: boolean;
  runDrugDatabase: boolean;
  runEcgEngine: boolean;
  runGuidelines: boolean;
  runKnowledgeSearch: boolean;
  runOcr: boolean;
  runPatientDatabase: boolean;
  runReportGenerator: boolean;
  selectedTools: CopilotTool[];
  shouldRunTools: boolean;
};

export type BrainInput = {
  attachments: AttachmentForAnalysis[];
  chatInput: ChatContextInput;
  clinicianName?: string | null;
  conversationId?: string;
  memory: ConversationMemory;
  question: string;
};

export type BrainComposeBase = {
  attachments: AttachmentForAnalysis[];
  clarificationPrompt?: string;
  clinicianName?: string | null;
  intent: MedicalIntent;
  memory: ConversationMemory;
  question: string;
  requiresClarification: boolean;
};

export type BrainResult = {
  classification: IntentClassificationResult;
  clinicalPlan: ClinicalExecutionPlan;
  composeBase: BrainComposeBase;
  decision: BrainDecision;
  executionTimeMs: number;
  medicalIntent: MedicalIntent;
  memoryState: ConversationMemoryState;
  plan: ConversationPlan;
  tag: string;
};

export type BrainDebugPayload = {
  brainVersion: "v3";
  classification: IntentClassificationResult;
  clinicalPlan: ClinicalExecutionPlan;
  decision: BrainDecision;
  executionTimeMs: number;
  memoryState: ConversationMemoryState;
  plan: ConversationPlan;
};

export type BrainResponseInput = {
  brain: BrainResult;
  clinicalContext: ClinicalContext;
  knowledgeHits: KnowledgeHit[];
  storedCitations?: import("../copilot-types").Citation[];
};
