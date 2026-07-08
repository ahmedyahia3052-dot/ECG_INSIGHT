import type {
  EcgClinicalKnowledgeCategory,
  EcgClinicalKnowledgeEmergencyLevel,
  EcgClinicalKnowledgeSeverity,
} from "@prisma/client";

export type GuidelineReference = {
  organization: "AHA" | "ACC/AHA" | "ESC" | "HRS" | "OTHER";
  title: string;
  url?: string;
  year?: number;
};

export type LiteratureReference = {
  citation: string;
  source?: string;
  url?: string;
  year?: number;
};

export type EcgClinicalKnowledgeEntry = {
  diagnosisId: string;
  clinicalName: string;
  category: EcgClinicalKnowledgeCategory;
  severity: EcgClinicalKnowledgeSeverity;
  emergencyLevel: EcgClinicalKnowledgeEmergencyLevel;
  description: string;
  ecgCriteria: string[];
  diagnosticFeatures: string[];
  supportingLeads: string[];
  differentialDiagnoses: string[];
  recommendedNextTests: string[];
  recommendedManagement: string[];
  contraindications: string[];
  clinicalNotes: string[];
  references: LiteratureReference[];
  icd10Code?: string;
  snomedCode?: string;
  guidelineReferences: GuidelineReference[];
};

export type KnowledgeSearchFilters = {
  category?: EcgClinicalKnowledgeCategory;
  emergencyLevel?: EcgClinicalKnowledgeEmergencyLevel;
  q?: string;
  severity?: EcgClinicalKnowledgeSeverity;
};

export type KnowledgeCatalogStats = {
  byCategory: Record<string, number>;
  byEmergencyLevel: Record<string, number>;
  total: number;
};
