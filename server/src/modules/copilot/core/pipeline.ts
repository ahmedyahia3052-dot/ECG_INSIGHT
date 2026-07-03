import type { EngineInput, EngineResult } from "../engine/types";
import { CLINICAL_AI_ENGINE_VERSION } from "../engine/types";
import type { ConversationIntent } from "../engine/v2/conversation-intent";
import { appendClinicalSafetyDisclaimer } from "./attachment-context";
import { CoreConversationManager } from "./conversation-manager";
import { IntentUnderstanding } from "./intent-understanding";
import { MemoryManager } from "./memory-manager";
import { ResponseOrchestrator } from "./response-orchestrator";
import { AttachmentContextBuilder } from "../attachment/attachment-context-builder.service";
import { applyClinicalValidation, validateClinicalResponse } from "../validation/clinical-validator";
import type {
  CorePipelineDeps,
  CorePipelineInput,
  CorePipelineResult,
  CoreStreamCallbacks,
  ExtendedIntentResult,
} from "./types";

function mapIntentToCommunication(intent: ConversationIntent): import("../engine/types").CommunicationIntent {
  switch (intent) {
    case "greeting": return "Greeting";
    case "general_conversation": return "SmallTalk";
    case "medical_education":
    case "conversation_continuation": return "Education";
    case "case_discussion": return "PatientLookup";
    case "follow_up": return "FollowUpQuestion";
    case "emergency_advice": return "EmergencyAdvice";
    case "drug_question": return "DrugInformation";
    case "ecg_interpretation":
    case "image_discussion":
    case "laboratory_interpretation":
    case "radiology_interpretation": return "MedicalQuestion";
    case "clarification_request": return "MedicalQuestion";
    case "clinical_reasoning":
    case "differential_diagnosis": return "MedicalQuestion";
    default: return "MedicalQuestion";
  }
}

function buildResponsePlan(intent: ExtendedIntentResult, isFollowUp: boolean): EngineResult["plan"] {
  if (intent.intent === "greeting" || intent.intent === "general_conversation") {
    return { allowBullets: false, maxParagraphs: 3, style: "supportive", suggestFollowUps: false };
  }
  if (intent.tutorMode) {
    return { allowBullets: false, maxParagraphs: 6, style: "supportive", suggestFollowUps: false };
  }
  return { allowBullets: false, maxParagraphs: 6, style: "conversational", suggestFollowUps: !isFollowUp };
}

export async function runClinicalAiCore(
  input: CorePipelineInput,
  deps: CorePipelineDeps,
  callbacks: CoreStreamCallbacks = {},
): Promise<CorePipelineResult> {
  callbacks.onStatus?.("Understanding your request...");

  const turnContext = CoreConversationManager.beginTurn(input);
  const snapshot = MemoryManager.load(input);
  const intent = IntentUnderstanding.analyze({
    attachments: input.attachments,
    contextState: snapshot.contextState,
    memory: input.memory,
    question: input.question,
    session: snapshot.session,
  });
  const memoryState = MemoryManager.build(input, snapshot.session, snapshot.contextState, intent);
  const turn = {
    contextState: snapshot.contextState,
    input,
    intent,
    memoryState,
    session: turnContext.session,
  };

  const llm = await ResponseOrchestrator.generate(turn, deps, callbacks);
  const communicationIntent = mapIntentToCommunication(intent.intent);

  const attachmentContexts = turn.input.attachments
    .map((attachment) => AttachmentContextBuilder.readStored(attachment))
    .filter((context): context is NonNullable<typeof context> => Boolean(context));
  const validation = validateClinicalResponse({
    answer: llm.content,
    attachmentContexts,
    question: turn.input.question,
  });
  const validatedContent = applyClinicalValidation(llm.content.trim(), validation);

  const session = CoreConversationManager.completeTurn({
    communicationIntent,
    conversationId: input.conversationId,
    educationalMode: memoryState.educationalMode,
    educationalTopic: memoryState.educationalTopic,
    entityMemory: snapshot.contextState.entityMemory,
    isFollowUp: memoryState.isFollowUp,
    learningStep: memoryState.learningStep,
    memory: input.memory,
    topicStack: memoryState.topicStack,
    turnCount: memoryState.turnCount,
    voiceMode: input.voiceMode,
  });

  const content = appendClinicalSafetyDisclaimer(validatedContent);

  return {
    communicationIntent,
    content,
    contextState: snapshot.contextState,
    intent,
    knowledgeHits: llm.knowledgeHits,
    memoryState,
    model: llm.model,
    session,
    toolCallsUsed: llm.toolCallsUsed,
  };
}

export function toCoreEngineResult(
  input: EngineInput,
  pipeline: Awaited<ReturnType<typeof runClinicalAiCore>>,
  executionTimeMs: number,
): EngineResult {
  const communicationIntent = mapIntentToCommunication(pipeline.intent.intent);
  const plan = buildResponsePlan(pipeline.intent, pipeline.memoryState.isFollowUp);

  return {
    classification: {
      confidence: 0.9,
      emergencyPriority: pipeline.intent.intent === "emergency_advice" ? "HIGH" : "NONE",
      entities: {
        ages: [], dates: [], diseases: [], drugs: [], ecgFindings: [], genders: [], heartRates: [],
        occupations: [], patientNames: [], prIntervals: [], qrsDurations: [], qtValues: [], reportTypes: [],
        rhythms: [], riskFactors: [],
      },
      executionTimeMs,
      intents: [{ confidence: 0.9, intent: "general_medical_question", reason: pipeline.intent.reason }],
      normalizedQuestion: pipeline.intent.resolvedQuestion,
      primaryIntent: pipeline.intent.tutorMode ? "medical_education" : "general_medical_question",
      primaryMedicalIntent: "general_medical_question",
      requiresClarification: false,
    },
    communicationIntent,
    context: {
      activeTopic: pipeline.memoryState.activeTopic,
      entityMemory: pipeline.contextState.entityMemory,
      hasActiveCase: Boolean(input.chatInput.caseId),
      hasActivePatient: Boolean(input.chatInput.patientId),
      hasUploadedEcg: input.attachments.some((item) => item.kind === "ecg" || /ecg|ekg|rhythm|holter|stress/i.test(item.documentType ?? "")),
      hasUploadedFiles: input.attachments.length > 0 || pipeline.memoryState.hasUploadedFiles,
      hasUploadedImages: input.attachments.some((item) => item.kind === "image" || item.kind === "camera"),
      resolvedQuestion: pipeline.intent.resolvedQuestion,
      topicStack: pipeline.memoryState.topicStack,
    },
    conversationState: pipeline.session,
    executionTimeMs,
    intentConfidence: 0.9,
    knowledgeDomain: {
      confidence: 0.9,
      domain: pipeline.intent.tutorMode ? "education" : "clinical_reasoning",
      educationalMode: pipeline.memoryState.educationalMode,
      educationalTopic: pipeline.memoryState.educationalTopic,
      learningStep: pipeline.memoryState.learningStep,
      reason: pipeline.intent.reason,
    },
    knowledgeHits: pipeline.knowledgeHits,
    knowledgeRoute: {
      query: pipeline.intent.resolvedQuestion,
      sources: pipeline.knowledgeHits.length || pipeline.toolCallsUsed.includes("medical_knowledge_search")
        ? ["cardiology_kb", "internal_knowledge_base"]
        : [],
    },
    medicalIntent: "general_medical_question",
    plan,
    requiresClarification: false,
    response: { content: pipeline.content, model: pipeline.model },
    sessionTurnCount: pipeline.memoryState.turnCount,
    tag: pipeline.intent.tutorMode || pipeline.intent.slashCommand === "teach" || pipeline.intent.slashCommand === "quiz"
      ? "Medical Education"
      : "Clinical Summary",
    toolPlan: {
      runClinicalContext: pipeline.toolCallsUsed.includes("patient_record_retrieval"),
      runDrugDatabase: pipeline.toolCallsUsed.includes("drug_database"),
      runEcgEngine: false,
      runKnowledge: pipeline.toolCallsUsed.includes("medical_knowledge_search"),
      runOcr: false,
      runPatientDatabase: pipeline.toolCallsUsed.includes("patient_record_retrieval"),
      runReportGenerator: false,
      tools: (pipeline.toolCallsUsed.length ? pipeline.toolCallsUsed : ["conversation"]) as import("../smart-intent-types").CopilotTool[],
    },
  };
}

export { CLINICAL_AI_ENGINE_VERSION };
