import type { CommunicationIntent, ResponsePlan } from "./types";

export const Planner = {
  buildResponsePlan(intent: CommunicationIntent, isFollowUp: boolean): ResponsePlan {
    if (intent === "Greeting" || intent === "SmallTalk" || intent === "SystemQuestion") {
      return { allowBullets: false, maxParagraphs: 3, style: "supportive", suggestFollowUps: false };
    }
    if (intent === "Education") {
      return { allowBullets: true, maxParagraphs: 6, style: "supportive", suggestFollowUps: false };
    }
    if (intent === "MedicalQuestion" || intent === "GuidelineSearch" || intent === "DrugInformation" || intent === "FollowUpQuestion") {
      return {
        allowBullets: false,
        maxParagraphs: 4,
        style: "conversational",
        suggestFollowUps: !isFollowUp,
      };
    }
    if (intent === "ECGAnalysis" || intent === "ECGUpload" || intent === "Comparison") {
      return { allowBullets: false, maxParagraphs: 5, style: "clinical_brief", suggestFollowUps: true };
    }
    if (intent === "EmergencyAdvice") {
      return { allowBullets: false, maxParagraphs: 3, style: "clinical_brief", suggestFollowUps: false };
    }
    if (intent === "PatientLookup" || intent === "ReportGeneration") {
      return { allowBullets: false, maxParagraphs: 4, style: "clinical_brief", suggestFollowUps: false };
    }
    return { allowBullets: false, maxParagraphs: 4, style: "conversational", suggestFollowUps: !isFollowUp };
  },
};
