export type ClinicalKnowledgeDomain =
  | "clinical_reasoning"
  | "differential_diagnosis"
  | "drug_information"
  | "ecg_interpretation"
  | "education"
  | "emergency_assessment"
  | "general_conversation"
  | "guidelines"
  | "laboratory_interpretation"
  | "radiology_interpretation";

export type EducationalTopic = "ecg_basics" | "general_medicine" | "none";

export type ClinicalKnowledgeRouteResult = {
  confidence: number;
  domain: ClinicalKnowledgeDomain;
  educationalMode: boolean;
  educationalTopic: EducationalTopic;
  learningStep: number;
  reason: string;
};
