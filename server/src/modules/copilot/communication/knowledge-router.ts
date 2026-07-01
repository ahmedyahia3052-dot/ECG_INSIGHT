import type { KnowledgeHit } from "../copilot-types";
import type { CommunicationIntent, KnowledgeRoute, KnowledgeSource } from "./types";

function sourcesForIntent(intent: CommunicationIntent): KnowledgeSource[] {
  switch (intent) {
    case "MedicalQuestion":
      return ["ecg_knowledge_base", "cardiology_kb"];
    case "GuidelineSearch":
      return ["esc_guidelines", "aha_guidelines", "cardiology_kb"];
    case "DrugInformation":
      return ["drug_database", "cardiology_kb"];
    case "OccupationalFitness":
      return ["occupational_medicine", "cardiology_kb", "risk_scores"];
    case "RiskAssessment":
      return ["risk_scores", "cardiology_kb"];
    case "ECGAnalysis":
    case "Comparison":
      return ["ecg_knowledge_base", "uploaded_ecg"];
    case "ECGUpload":
    case "DocumentReview":
    case "FileAnalysis":
    case "ImageInterpretation":
      return ["uploaded_ecg", "uploaded_documents"];
    case "PatientLookup":
    case "ReportGeneration":
      return ["internal_patient_records", "uploaded_ecg", "uploaded_documents"];
    case "EmergencyAdvice":
      return ["ecg_knowledge_base", "cardiology_kb", "esc_guidelines"];
    case "FollowUpQuestion":
      return ["ecg_knowledge_base", "cardiology_kb"];
    default:
      return [];
  }
}

const SOURCE_HINTS: Record<KnowledgeSource, RegExp> = {
  aha_guidelines: /aha|acc|american heart/i,
  cardiology_kb: /cardio|heart|arrhythmia|ischemia|stemi|af|qt/i,
  clinical_calculator: /score|calculator|chads|has-bled|grace/i,
  drug_database: /drug|medication|dose|amiodarone|warfarin|statin/i,
  ecg_knowledge_base: /ecg|ekg|rhythm|qrs|qtc|st elevation/i,
  esc_guidelines: /esc|european/i,
  internal_patient_records: /patient|record|chart|history/i,
  laboratory_database: /lab|troponin|potassium|creatinine/i,
  occupational_medicine: /occupational|fitness|work|duty|offshore/i,
  risk_scores: /risk|score|stratification|chads|has-bled/i,
  uploaded_documents: /upload|document|pdf|report|attachment/i,
  uploaded_ecg: /ecg|ekg|tracing|strip/i,
};

export const KnowledgeRouter = {
  route(intent: CommunicationIntent, query: string): KnowledgeRoute {
    return {
      query,
      sources: sourcesForIntent(intent),
    };
  },

  filterHits(hits: KnowledgeHit[], route: KnowledgeRoute): KnowledgeHit[] {
    if (!route.sources.length) return [];
    const filtered = hits.filter((hit) => {
      const haystack = `${hit.topic} ${hit.content} ${hit.sourceName} ${hit.tags.join(" ")}`.toLowerCase();
      return route.sources.some((source) => SOURCE_HINTS[source].test(haystack));
    });
    return filtered.length ? filtered : hits.slice(0, 4);
  },
};
