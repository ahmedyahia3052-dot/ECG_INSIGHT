import type { ChatContextInput } from "./copilot-types";
import type { ConversationContextState, CopilotTool, IntentClassificationResult, SmartIntent } from "./smart-intent-types";

const NO_TOOL_INTENTS: SmartIntent[] = [
  "administrative", "conversation", "goodbye", "greeting", "small_talk", "thanks", "translate", "rewrite", "unknown", "voice_conversation",
];

function toolsForIntent(intent: SmartIntent, context: ConversationContextState, classification: IntentClassificationResult): CopilotTool[] {
  if (NO_TOOL_INTENTS.includes(intent) || classification.requiresClarification) return ["no_tool"];
  switch (intent) {
    case "general_medical_question":
    case "cardiology_question":
    case "explain_medical_concept":
    case "medical_guidelines":
    case "create_follow_up_plan":
    case "emergency_warning":
      return ["knowledge_search", "conversation"];
    case "drug_information":
    case "drug_interaction":
      return ["drug_database", "knowledge_search", "conversation"];
    case "evidence_search":
      return ["guidelines", "knowledge_search", "conversation"];
    case "ecg_interpretation":
    case "ecg_comparison":
      return context.hasUploadedEcg || context.currentCaseId ? ["ecg_ai", "knowledge_search", "conversation"] : ["conversation"];
    case "uploaded_ecg_analysis":
      return context.hasUploadedEcg ? ["ocr", "ecg_ai", "image_analysis", "conversation"] : ["ocr", "image_analysis", "conversation"];
    case "patient_lookup":
    case "current_patient_question":
    case "patient_history":
      return ["patient_database", "conversation"];
    case "report_generation":
    case "generate_letter":
    case "generate_medical_report":
    case "generate_referral":
      return ["report_generator", "patient_database", "ecg_ai", "conversation"];
    case "occupational_fitness":
    case "fitness_for_work":
      return ["knowledge_search", "patient_database", "ecg_ai", "conversation"];
    case "summarize":
      return context.hasUploadedEcg || context.hasUploadedReport || context.hasUploadedImage
        ? ["ocr", "image_analysis", "conversation"]
        : ["conversation"];
    default:
      return ["conversation"];
  }
}

export function routeTools(classification: IntentClassificationResult, context: ConversationContextState, chatInput: ChatContextInput) {
  const toolSets = classification.intents.map((match) => toolsForIntent(match.intent, context, classification));
  const merged = new Set<CopilotTool>(toolSets.flat());
  if (chatInput.patientId || chatInput.caseId || context.currentPatientId || context.currentCaseId) {
    if ([...merged].some((tool) => tool === "ecg_ai" || tool === "patient_database" || tool === "report_generator")) {
      merged.add("patient_database");
    }
  }
  if (classification.requiresClarification) {
    merged.clear();
    merged.add("no_tool");
  }
  const tools = Array.from(merged);
  return {
    tools: tools.length ? tools : ["no_tool" as const],
  };
}

export function shouldRunTool(tool: CopilotTool, tools: CopilotTool[]) {
  return tools.includes(tool);
}

export function shouldRetrieveClinicalContextFromPlan(tools: CopilotTool[], chatInput: ChatContextInput) {
  return shouldRunTool("patient_database", tools) && Boolean(chatInput.caseId || chatInput.patientId);
}

export function shouldRetrieveKnowledgeFromPlan(tools: CopilotTool[], question: string, intent: SmartIntent) {
  if (!shouldRunTool("knowledge_search", tools) && !shouldRunTool("drug_database", tools) && !shouldRunTool("guidelines", tools)) return false;
  if (intent === "uploaded_ecg_analysis") {
    return /interpret|review|explain|diagnosis|findings|abnormal|rhythm|stemi|qt|af|analyze|analyse|look at|what do you see/i.test(question);
  }
  return true;
}

export function shouldRunEcgEngine(tools: CopilotTool[], context: ConversationContextState) {
  return shouldRunTool("ecg_ai", tools) && (context.hasUploadedEcg || Boolean(context.currentCaseId));
}

export function shouldRunOcr(tools: CopilotTool[], context: ConversationContextState) {
  return shouldRunTool("ocr", tools) && (context.hasUploadedEcg || context.hasUploadedImage || context.hasUploadedReport);
}

export function isFastPathFromPlan(tools: CopilotTool[]) {
  return tools.length === 1 && tools[0] === "no_tool";
}
