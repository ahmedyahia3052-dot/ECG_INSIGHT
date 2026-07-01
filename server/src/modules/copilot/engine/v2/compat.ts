import type { IntentClassificationResult } from "../../smart-intent-types";
import { emptyClinicalContext } from "../../intent-manager";
import type {
  CommunicationIntent,
  EngineResult,
  KnowledgeRoute,
  ResponsePlan,
  ToolPlan,
} from "../types";
import { CLINICAL_AI_ENGINE_VERSION } from "../types";
import type { PipelineContext, PipelineInput, PipelineOutput, ReasoningResult } from "./types";

function modeToCommunicationIntent(mode: ReasoningResult["mode"]): CommunicationIntent {
  switch (mode) {
    case "greeting": return "Greeting";
    case "farewell":
    case "small_talk": return "SmallTalk";
    case "education": return "Education";
    case "emergency": return "EmergencyAdvice";
    case "patient_context": return "PatientLookup";
    case "vision_review": return "ImageInterpretation";
    case "follow_up": return "FollowUpQuestion";
    case "clarification": return "ECGAnalysis";
    default: return "MedicalQuestion";
  }
}

function modeToSmartIntent(mode: ReasoningResult["mode"]): IntentClassificationResult["primaryIntent"] {
  switch (mode) {
    case "greeting": return "greeting";
    case "farewell": return "goodbye";
    case "small_talk": return "small_talk";
    case "education": return "medical_education";
    case "emergency": return "emergency_warning";
    case "patient_context": return "current_patient_question";
    case "vision_review": return "uploaded_ecg_analysis";
    case "follow_up": return "create_follow_up_plan";
    case "clarification": return "ecg_interpretation";
    default: return "general_medical_question";
  }
}

function buildToolPlan(reasoning: ReasoningResult): ToolPlan {
  const tools: ToolPlan["tools"] = [];
  if (reasoning.needsKnowledge) tools.push("knowledge_search");
  if (reasoning.needsPatientContext) tools.push("patient_database");
  if (reasoning.needsVision) tools.push("image_analysis");
  if (!tools.length) tools.push("conversation");
  return {
    runClinicalContext: reasoning.needsPatientContext,
    runDrugDatabase: /\b(drug|medication|dose|interaction)\b/i.test(reasoning.knowledgeQuery),
    runEcgEngine: reasoning.mode === "vision_review" || reasoning.mode === "clarification",
    runKnowledge: reasoning.needsKnowledge,
    runOcr: reasoning.needsVision,
    runPatientDatabase: reasoning.needsPatientContext,
    runReportGenerator: false,
    tools,
  };
}

function buildResponsePlan(mode: ReasoningResult["mode"], isFollowUp: boolean): ResponsePlan {
  if (mode === "greeting" || mode === "small_talk" || mode === "farewell") {
    return { allowBullets: false, maxParagraphs: 3, style: "supportive", suggestFollowUps: false };
  }
  if (mode === "education") {
    return { allowBullets: true, maxParagraphs: 6, style: "supportive", suggestFollowUps: false };
  }
  return { allowBullets: false, maxParagraphs: 4, style: "conversational", suggestFollowUps: !isFollowUp };
}

function buildClassification(reasoning: ReasoningResult, question: string): IntentClassificationResult {
  const primaryIntent = modeToSmartIntent(reasoning.mode);
  return {
    confidence: reasoning.needsClarification ? 0.72 : 0.88,
    emergencyPriority: reasoning.emergencyLevel === "HIGH" ? "HIGH" : reasoning.emergencyLevel === "MODERATE" ? "MODERATE" : "NONE",
    entities: {
      ages: [], dates: [], diseases: [], drugs: [], ecgFindings: [], genders: [], heartRates: [],
      occupations: [], patientNames: [], prIntervals: [], qrsDurations: [], qtValues: [], reportTypes: [],
      rhythms: [], riskFactors: [],
    },
    executionTimeMs: 0,
    intents: [{ confidence: 0.88, intent: primaryIntent, reason: `v2-${reasoning.mode}` }],
    normalizedQuestion: question,
    primaryIntent,
    primaryMedicalIntent: reasoning.mode === "education" ? "general_medical_question" : "general_medical_question",
    requiresClarification: reasoning.needsClarification,
    clarificationPrompt: reasoning.clarificationPrompt,
  };
}

export function toEngineResult(
  input: PipelineInput,
  output: PipelineOutput,
): EngineResult {
  const { context, executionTimeMs } = output;
  const communicationIntent = modeToCommunicationIntent(context.reasoning.mode);
  const toolPlan = buildToolPlan(context.reasoning);
  const knowledgeRoute = context.knowledgeRoute;

  return {
    classification: buildClassification(context.reasoning, input.question),
    communicationIntent,
    context: context.contextState,
    conversationState: context.session,
    executionTimeMs,
    intentConfidence: 0.88,
    knowledgeDomain: {
      confidence: 0.88,
      domain: context.reasoning.educationalMode ? "education" : context.reasoning.mode === "vision_review" ? "ecg_interpretation" : "clinical_reasoning",
      educationalMode: context.reasoning.educationalMode,
      educationalTopic: context.reasoning.educationalTopic,
      learningStep: context.reasoning.learningStep,
      reason: `v2-${context.reasoning.mode}`,
    },
    knowledgeHits: context.knowledgeHits,
    knowledgeRoute,
    medicalIntent: "general_medical_question",
    plan: buildResponsePlan(context.reasoning.mode, context.isFollowUp),
    requiresClarification: context.reasoning.needsClarification,
    response: { content: output.content },
    sessionTurnCount: input.memory.turns.length + 1,
    tag: context.reasoning.responseTag,
    toolPlan,
  };
}

export function buildMinimalDebugPayload(engine: EngineResult) {
  return {
    communicationIntent: engine.communicationIntent,
    engineVersion: CLINICAL_AI_ENGINE_VERSION,
    executionTimeMs: engine.executionTimeMs,
    mode: engine.knowledgeDomain.reason,
  };
}

export { emptyClinicalContext };
