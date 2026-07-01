import { runAiBrainV3, buildBrainDebugPayload } from "../brain";
import { TopicTracker, buildCommunicationMemory, ContextWindow } from "./conversation-memory";
import { IntentClassifier } from "./intent-classifier";
import { KnowledgeRouter } from "./knowledge-router";
import { ResponsePlanner } from "./response-planner";
import { ConversationManager, SessionManager } from "./session-manager";
import type {
  CommunicationDebugPayload,
  CommunicationInput,
  CommunicationResult,
} from "./types";

export function runCommunicationLayerV1(input: CommunicationInput): CommunicationResult {
  const started = performance.now();
  const previousSession = SessionManager.get(input.conversationId);
  const contextWindow = ContextWindow.build(input.memory);
  void contextWindow;

  const topicFromSession = previousSession?.topic ?? null;
  const detectedTopic = TopicTracker.detect(input.memory, input.question);
  const activeTopic = detectedTopic ?? topicFromSession;
  const resolvedQuestion = TopicTracker.resolveQuestion(input.question, activeTopic);
  const isFollowUp = TopicTracker.isFollowUp(input.question, activeTopic, input.memory);

  const brain = runAiBrainV3({
    attachments: input.attachments,
    chatInput: input.chatInput,
    clinicianName: input.clinicianName,
    conversationId: input.conversationId,
    memory: input.memory,
    question: resolvedQuestion,
  });

  const intentResult = IntentClassifier.classify(brain.classification);
  if (intentResult.requiresClarification) {
    brain.composeBase.requiresClarification = true;
    brain.composeBase.clarificationPrompt = intentResult.clarificationPrompt;
    brain.decision.conversationalOnly = true;
    brain.decision.shouldRunTools = false;
    brain.decision.runKnowledgeSearch = false;
    brain.decision.runClinicalContext = false;
    brain.decision.runEcgEngine = false;
    brain.decision.runPatientDatabase = false;
    brain.decision.selectedTools = ["no_tool"];
  }

  const communicationIntent = intentResult.intent;
  const responsePlan = ResponsePlanner.plan(communicationIntent, isFollowUp);
  const knowledgeRoute = KnowledgeRouter.route(communicationIntent, resolvedQuestion);
  const communicationMemory = buildCommunicationMemory(input.memory, activeTopic, resolvedQuestion);

  const session = SessionManager.upsert({
    conversationId: input.conversationId,
    intent: communicationIntent,
    topic: activeTopic,
    turnCount: input.memory.turns.length + 1,
  });

  void ConversationManager.shouldContinueTopic(previousSession?.lastIntent, communicationIntent, isFollowUp);

  return {
    brain,
    clarificationPrompt: intentResult.clarificationPrompt,
    communicationIntent,
    intentConfidence: intentResult.confidence,
    knowledgeRoute,
    memory: communicationMemory,
    requiresClarification: intentResult.requiresClarification,
    resolvedQuestion,
    responsePlan,
    session,
    executionTimeMs: Math.max(0, Math.round(performance.now() - started)),
  };
}

export function buildCommunicationDebugPayload(comm: CommunicationResult): CommunicationDebugPayload {
  return {
    brain: buildBrainDebugPayload(comm.brain),
    communicationVersion: "v1",
    intent: comm.communicationIntent,
    intentConfidence: comm.intentConfidence,
    knowledgeSources: comm.knowledgeRoute.sources,
    memoryTopic: comm.memory.activeTopic?.label ?? null,
    resolvedQuestion: comm.resolvedQuestion,
    responsePlan: comm.responsePlan,
    sessionTurnCount: comm.session.turnCount,
  };
}

export function previewCommunicationLayerV1(input: CommunicationInput) {
  return runCommunicationLayerV1(input);
}

export { COMMUNICATION_LAYER_VERSION } from "./types";
