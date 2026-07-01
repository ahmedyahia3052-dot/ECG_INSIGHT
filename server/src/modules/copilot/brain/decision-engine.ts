import type { ChatContextInput } from "../copilot-types";
import {
  isFastPathFromPlan,
  shouldRetrieveClinicalContextFromPlan,
  shouldRetrieveKnowledgeFromPlan,
  shouldRunEcgEngine,
  shouldRunOcr,
  shouldRunTool,
} from "../tool-router";
import type { ConversationPlan, SmartIntent } from "../smart-intent-types";
import type { BrainDecision, ClinicalExecutionPlan } from "./brain-types";
import type { ConversationContextSnapshot } from "./conversation-context.service";

const CONVERSATIONAL_INTENTS: SmartIntent[] = [
  "administrative", "conversation", "goodbye", "greeting", "small_talk", "thanks", "translate", "rewrite", "unknown", "voice_conversation",
];

const CLINICAL_INTENTS: SmartIntent[] = [
  "cardiology_question", "create_follow_up_plan", "current_patient_question", "drug_information", "drug_interaction",
  "ecg_comparison", "ecg_interpretation", "emergency_warning", "evidence_search", "explain_medical_concept",
  "fitness_for_work", "general_medical_question", "generate_letter", "generate_medical_report", "generate_referral",
  "medical_guidelines", "occupational_fitness", "patient_history", "patient_lookup", "report_generation",
  "summarize", "uploaded_ecg_analysis",
];

export const DecisionEngine = {
  decide(input: {
    chatInput: ChatContextInput;
    classification: { primaryIntent: SmartIntent; requiresClarification: boolean; clarificationPrompt?: string; emergencyPriority: string };
    clinicalPlan: ClinicalExecutionPlan;
    context: ConversationContextSnapshot;
    plan: ConversationPlan;
    question: string;
  }): BrainDecision {
    const tools = input.plan.tools;
    const primaryIntent = input.classification.primaryIntent;
    const decisionPath: string[] = ["context", "intent", "memory", "planner"];
    const conversationalOnly = isFastPathFromPlan(tools);
    const isConversational = CONVERSATIONAL_INTENTS.includes(primaryIntent);
    const isClinical = CLINICAL_INTENTS.includes(primaryIntent);
    const isEcgAnalysis = ["ecg_interpretation", "ecg_comparison", "uploaded_ecg_analysis"].includes(primaryIntent);
    const requiresUploadedFiles = isEcgAnalysis || tools.some((tool) => tool === "ocr" || tool === "image_analysis");
    const requiresPatientData = shouldRunTool("patient_database", tools);
    const requiresGuidelines = shouldRunTool("guidelines", tools);
    const requiresOcr = shouldRunOcr(tools, input.context);
    const runKnowledgeSearch = shouldRetrieveKnowledgeFromPlan(tools, input.question, primaryIntent);
    const runClinicalContext = shouldRetrieveClinicalContextFromPlan(tools, input.chatInput);
    const runEcgEngine = shouldRunEcgEngine(tools, input.context);
    const runDrugDatabase = shouldRunTool("drug_database", tools);
    const runGuidelines = shouldRunTool("guidelines", tools);
    const runOcr = requiresOcr;
    const runPatientDatabase = requiresPatientData;
    const runReportGenerator = shouldRunTool("report_generator", tools);
    const shouldRunTools = !conversationalOnly && !input.classification.requiresClarification;
    if (shouldRunTools) decisionPath.push("tool-router");
    else decisionPath.push("no-tool");
    decisionPath.push("compose");
    return {
      conversationalOnly,
      decisionPath,
      emergencyEscalation: input.classification.emergencyPriority === "HIGH",
      isClinical,
      isConversational,
      isEcgAnalysis,
      requiresClarification: input.classification.requiresClarification,
      clarificationPrompt: input.classification.clarificationPrompt,
      requiresGuidelines,
      requiresOcr,
      requiresPatientData,
      requiresUploadedFiles,
      runClinicalContext,
      runDrugDatabase,
      runEcgEngine,
      runGuidelines,
      runKnowledgeSearch,
      runOcr,
      runPatientDatabase,
      runReportGenerator,
      selectedTools: tools,
      shouldRunTools,
    };
  },
};
