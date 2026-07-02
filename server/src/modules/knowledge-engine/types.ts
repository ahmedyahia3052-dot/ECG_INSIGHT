export const KNOWLEDGE_ENGINE_VERSION = "knowledge-engine-v1" as const;

export type KnowledgeDomainPath =
  | "cardiology"
  | "cardiology/ecg"
  | "cardiology/arrhythmias"
  | "cardiology/acs"
  | "cardiology/heart-failure"
  | "cardiology/hypertension"
  | "cardiology/valvular"
  | "cardiology/congenital"
  | "internal-medicine"
  | "emergency"
  | "pharmacology"
  | "laboratory"
  | "radiology"
  | "occupational"
  | "guidelines";

export type ReferenceMetadata = {
  label: string;
  source: string;
  url?: string;
};

export type MedicalTopicSections = {
  classification: string;
  clinicalFeatures: string;
  clinicalPearls: string[];
  complications: string;
  definition: string;
  diagnosis: string;
  differentialDiagnosis: string;
  investigations: string;
  keyPoints: string[];
  management: string;
  pathophysiology: string;
  patientExplanation: string;
  redFlags: string[];
  teachingNotes: string;
};

export type MedicalTopic = {
  domain: KnowledgeDomainPath;
  references: ReferenceMetadata[];
  searchTags: string[];
  sections: MedicalTopicSections;
  slug: string;
  title: string;
};

export type EcgEducationNode = {
  id: string;
  order: number;
  parentId: string | null;
  slug: string;
  teachingFocus: string;
  title: string;
  topicSlug?: string;
};

export type KnowledgeSearchRequest = {
  activeTopic?: string | null;
  domains?: KnowledgeDomainPath[];
  intent?: string;
  limit?: number;
  query: string;
};

export type KnowledgeSearchResult = {
  ecgEducationStep: EcgEducationNode | null;
  hits: import("../copilot/copilot-types").KnowledgeHit[];
  query: string;
  structuredTopics: MedicalTopic[];
};
