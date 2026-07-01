import type { Prisma } from "@prisma/client";

export type Citation = { id: string; label: string; source: string; tags?: string[]; type: string };

export type ClinicalContext = {
  criticalAlerts: string[];
  currentCase?: {
    axis?: number | null;
    diagnosis?: string | null;
    doctorDiagnosis?: string | null;
    heartRate?: number | null;
    intervals: string;
    rhythm?: string | null;
    severity?: string;
    status?: string;
  };
  documents: string[];
  patient?: {
    age: number;
    allergies: string;
    company?: string | null;
    department?: string | null;
    employeeId?: string | null;
    fullName: string;
    gender: string;
    history: string;
    medications: string;
    occupation?: string | null;
    riskFactors: string[];
  };
  previousEcgs: string[];
  reports: string[];
  sources: Citation[];
};

export type KnowledgeHit = {
  category: string;
  content: string;
  id: string;
  references: string[];
  relevanceScore: number;
  sourceName: string;
  sourceUrl?: string;
  tags: string[];
  topic: string;
};

export type MedicalIntent =
  | "current_ecg_case"
  | "ecg_interpretation"
  | "emergency_triage"
  | "explain_diagnosis"
  | "follow_up_plan"
  | "general_medical_question"
  | "generate_report"
  | "greeting"
  | "medication_question"
  | "occupational_fitness"
  | "patient_information"
  | "show_sources"
  | "small_talk"
  | "unknown"
  | "upload_analysis"
  | "voice_conversation";

export type AttachmentForAnalysis = {
  attachmentId?: string;
  analysisSummary: string | null;
  confidence: number | null;
  documentType: string | null;
  extractedText: string | null;
  kind: string;
  medicalAnalysis: Prisma.JsonValue | null;
  mimeType: string;
  originalName: string;
  recommendations: string[];
  sizeBytes: number;
  warnings: string[];
};

export type AttachmentInsight = {
  confidence: number;
  documentType: string;
  findings: string[];
  interpretation: string;
  name: string;
  ocrStatus: string;
  recommendations: string[];
  warnings: string[];
};

export type ConversationMemory = {
  attachments: AttachmentInsight[];
  summary: string;
  turns: Array<{ content: string; role: string }>;
};

export type ChatContextInput = {
  caseId?: string;
  patientId?: string;
};
