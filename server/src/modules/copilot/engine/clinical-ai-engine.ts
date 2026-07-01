import type { ChatContextInput, ClinicalContext, ConversationMemory } from "../copilot-types";
import { emptyClinicalContext, tagForIntent } from "../intent-manager";
import { runIntentPipeline } from "../intent-pipeline";
import { ClinicalKnowledgeRouter } from "./clinical-knowledge-router";
import { ContextManager } from "./context-manager";
import { ConversationManager } from "./conversation-manager";
import { KnowledgeRouter } from "./knowledge-router";
import { retrieveRoutedKnowledge } from "./knowledge-retrieval";
import { IntentClassifier } from "./intent-classifier";
import { Planner } from "./planner";
import { ResponseGenerator } from "./response-generator";
import { ToolOrchestrator } from "./tool-orchestrator";
import type { CommunicationIntent, EngineDebugPayload, EngineInput, EngineResult, ToolPlan } from "./types";
import { CLINICAL_AI_ENGINE_VERSION } from "./types";

const EDUCATION_TOOL_PLAN: ToolPlan = {
  runClinicalContext: false,
  runDrugDatabase: false,
  runEcgEngine: false,
  runKnowledge: true,
  runOcr: false,
  runPatientDatabase: false,
  runReportGenerator: false,
  tools: ["knowledge_search", "conversation"],
};

function communicationIntentForDomain(domain: ReturnType<typeof ClinicalKnowledgeRouter.route>["domain"], fallback: CommunicationIntent): CommunicationIntent {
  switch (domain) {
    case "education": return "Education";
    case "ecg_interpretation": return "ECGAnalysis";
    case "emergency_assessment": return "EmergencyAdvice";
    case "drug_information": return "DrugInformation";
    case "guidelines": return "GuidelineSearch";
    case "general_conversation": return fallback === "Greeting" || fallback === "SmallTalk" ? fallback : "SmallTalk";
    default: return fallback;
  }
}

export type EngineDependencies = {
  retrieveClinicalContext: (input: ChatContextInput) => Promise<ClinicalContext>;
};

export async function runClinicalCopilotEngine(
  input: EngineInput,
  deps: EngineDependencies,
): Promise<EngineResult> {
  const started = performance.now();
  const previousSession = ConversationManager.get(input.conversationId);
  const contextState = ContextManager.build({
    attachments: input.attachments,
    chatInput: input.chatInput,
    memory: input.memory,
    previousTopicStack: previousSession?.topicStack ?? [],
    question: input.question,
  });

  const intentStage = IntentClassifier.classify(input.question, input.attachments, input.memory);
  const pipeline = runIntentPipeline({
    attachments: input.attachments,
    chatInput: input.chatInput,
    memory: input.memory,
    question: contextState.resolvedQuestion,
  });

  const knowledgeDomain = ClinicalKnowledgeRouter.route({
    attachments: input.attachments,
    classification: pipeline.classification,
    memory: input.memory,
    previousSession,
    question: input.question,
    resolvedQuestion: contextState.resolvedQuestion,
  });

  const communicationIntent = knowledgeDomain.educationalMode
    ? "Education"
    : communicationIntentForDomain(knowledgeDomain.domain, intentStage.communicationIntent);

  const requiresClarification = knowledgeDomain.educationalMode
    ? false
    : intentStage.requiresClarification;

  const toolPlan: ToolPlan = knowledgeDomain.educationalMode
    ? EDUCATION_TOOL_PLAN
    : ToolOrchestrator.buildPlan({
        attachments: input.attachments,
        chatInput: input.chatInput,
        classification: pipeline.classification,
        contextState,
        memory: input.memory,
        plan: pipeline.plan,
        question: contextState.resolvedQuestion,
      });

  const isFollowUp = ContextManager.isFollowUp(input.question, contextState.activeTopic, input.memory);
  const responsePlan = Planner.buildResponsePlan(communicationIntent, isFollowUp);
  const knowledgeRoute = KnowledgeRouter.route(communicationIntent, contextState, toolPlan, contextState.resolvedQuestion);

  const clinicalContext = toolPlan.runClinicalContext
    ? await deps.retrieveClinicalContext(input.chatInput)
    : emptyClinicalContext();

  const knowledgeHits = toolPlan.runKnowledge
    ? await retrieveRoutedKnowledge(knowledgeRoute, clinicalContext)
    : [];

  const response = ResponseGenerator.generate({
    attachments: input.attachments,
    clarificationPrompt: requiresClarification ? intentStage.clarificationPrompt : undefined,
    clinicianName: input.clinicianName,
    clinicalContext,
    communicationIntent,
    intent: pipeline.classification.primaryMedicalIntent,
    knowledge: knowledgeHits,
    knowledgeDomain,
    memory: input.memory,
    plan: responsePlan,
    primarySmartIntent: pipeline.classification.primaryIntent,
    question: contextState.resolvedQuestion,
    requiresClarification,
    topic: contextState.activeTopic,
  });

  const sessionTurnCount = input.memory.turns.length + 1;
  const session = ConversationManager.upsert({
    conversationId: input.conversationId,
    educationalMode: knowledgeDomain.educationalMode,
    educationalTopic: knowledgeDomain.educationalTopic,
    entityMemory: contextState.entityMemory,
    intent: communicationIntent,
    isFollowUp,
    learningStep: knowledgeDomain.learningStep,
    memory: input.memory,
    topicStack: contextState.topicStack,
    turnCount: sessionTurnCount,
    voiceActive: Boolean(input.voiceMode),
    voiceStatus: input.voiceMode ? "thinking" : "idle",
  });

  return {
    classification: pipeline.classification,
    communicationIntent,
    context: contextState,
    executionTimeMs: Math.max(0, Math.round(performance.now() - started)),
    intentConfidence: knowledgeDomain.confidence,
    knowledgeDomain,
    knowledgeHits,
    knowledgeRoute,
    medicalIntent: pipeline.classification.primaryMedicalIntent,
    plan: responsePlan,
    requiresClarification,
    response,
    sessionTurnCount,
    tag: knowledgeDomain.educationalMode ? "Medical Education" : tagForIntent(pipeline.classification.primaryMedicalIntent, "Clinical Summary"),
    toolPlan,
    conversationState: session,
  };
}

export function previewClinicalCopilotEngine(input: EngineInput, deps: EngineDependencies) {
  return runClinicalCopilotEngine(input, deps);
}

export function buildEngineDebugPayload(engine: EngineResult): EngineDebugPayload {
  return {
    classification: engine.classification,
    communicationIntent: engine.communicationIntent,
    context: engine.context,
    conversationState: engine.conversationState
      ? {
          conversationSummary: engine.conversationState.conversationSummary,
          currentTopic: engine.conversationState.currentTopic,
          isFollowUp: engine.conversationState.isFollowUp,
          previousTopic: engine.conversationState.previousTopic,
          voiceActive: engine.conversationState.voiceActive,
          voiceStatus: engine.conversationState.voiceStatus,
        }
      : undefined,
    engineVersion: CLINICAL_AI_ENGINE_VERSION,
    executionTimeMs: engine.executionTimeMs,
    knowledgeRoute: engine.knowledgeRoute,
    plan: engine.plan,
    toolPlan: engine.toolPlan,
  };
}
