import type { CommunicationIntent, ContextState, KnowledgeRoute, KnowledgeSource, ToolPlan } from "./types";

function sourcesForIntent(intent: CommunicationIntent, context: ContextState, toolPlan: ToolPlan): KnowledgeSource[] {
  if (toolPlan.tools.length === 1 && toolPlan.tools[0] === "no_tool") return [];
  switch (intent) {
    case "MedicalQuestion":
    case "FollowUpQuestion":
      return ["cardiology_kb", "internal_knowledge_base"];
    case "GuidelineSearch":
      return ["esc_guidelines", "aha_guidelines", "cardiology_kb"];
    case "DrugInformation":
      return toolPlan.runDrugDatabase ? ["drug_database", "cardiology_kb"] : ["cardiology_kb"];
    case "OccupationalFitness":
      return ["occupational_medicine", "risk_scores", "cardiology_kb"];
    case "RiskAssessment":
      return ["risk_scores", "clinical_calculator", "cardiology_kb"];
    case "ECGAnalysis":
    case "Comparison":
      return context.hasUploadedEcg || context.hasActiveCase
        ? ["ecg_database", "cardiology_kb", "uploaded_ecg"]
        : [];
    case "ECGUpload":
      return context.hasUploadedEcg ? ["uploaded_ecg", "ecg_database"] : [];
    case "DocumentReview":
    case "FileAnalysis":
      return context.hasUploadedFiles ? ["uploaded_documents"] : [];
    case "ImageInterpretation":
      return context.hasUploadedImages ? ["uploaded_images", "uploaded_documents"] : [];
    case "PatientLookup":
      return context.hasActivePatient ? ["patient_database"] : [];
    case "ReportGeneration":
      return context.hasActivePatient || context.hasActiveCase
        ? ["patient_database", "uploaded_ecg", "uploaded_documents"]
        : [];
    case "EmergencyAdvice":
      return ["ecg_database", "cardiology_kb", "esc_guidelines", "aha_guidelines"];
    default:
      return [];
  }
}

export const KnowledgeRouter = {
  route(intent: CommunicationIntent, context: ContextState, toolPlan: ToolPlan, query: string): KnowledgeRoute {
    const routed = sourcesForIntent(intent, context, toolPlan);
    const filtered = routed.filter((source) => {
      if (source === "uploaded_ecg" || source === "uploaded_documents" || source === "uploaded_images") {
        return context.hasUploadedEcg || context.hasUploadedFiles || context.hasUploadedImages;
      }
      if (source === "patient_database") return context.hasActivePatient || toolPlan.runPatientDatabase;
      return true;
    });
    return { query, sources: filtered };
  },
};
