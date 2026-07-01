import { emptyClinicalContext } from "../../intent-manager";
import type { EngineDependencies } from "../clinical-ai-engine";
import type { EngineInput, EngineResult } from "../types";
import { ContextMemory } from "./context-memory";
import { KnowledgeRetrieval } from "./knowledge";
import { MedicalReasoning } from "./medical-reasoning";
import { NaturalResponse } from "./natural-response";
import { SafetyValidation } from "./safety";
import { toEngineResult } from "./compat";
import { VisionAnalysis } from "./vision";

export async function runClinicalAiCoreV2(
  input: EngineInput,
  deps: EngineDependencies,
): Promise<EngineResult> {
  const started = performance.now();

  const snapshot = ContextMemory.load({
    attachments: input.attachments,
    chatInput: input.chatInput,
    conversationId: input.conversationId,
    memory: input.memory,
    question: input.question,
  });

  const reasoning = MedicalReasoning.analyze({
    attachments: input.attachments,
    chatInput: input.chatInput,
    contextState: snapshot.contextState,
    isFollowUp: snapshot.isFollowUp,
    memory: input.memory,
    question: input.question,
    session: snapshot.session,
  });

  const vision = VisionAnalysis.analyze(input.attachments);
  const insights = VisionAnalysis.mergeMemoryInsights(
    vision.insights,
    input.memory.attachments.map((item) => ({ documentType: item.documentType, kind: "file", name: item.name })),
    input.memory.attachments,
  );

  const clinicalContext = reasoning.needsPatientContext
    ? await deps.retrieveClinicalContext(input.chatInput)
    : emptyClinicalContext();

  const knowledge = reasoning.needsKnowledge
    ? await KnowledgeRetrieval.fetch(reasoning, clinicalContext)
    : { hits: [], route: { query: reasoning.knowledgeQuery, sources: [] } };

  const draft = NaturalResponse.generate({
    clinicianName: input.clinicianName,
    clinicalContext,
    contextState: snapshot.contextState,
    insights,
    knowledge: knowledge.hits,
    memory: input.memory,
    question: input.question,
    reasoning,
  });

  const content = SafetyValidation.apply(draft, SafetyValidation.assess(clinicalContext, input.question, reasoning));

  const session = ContextMemory.persist({
    conversationId: input.conversationId,
    contextState: snapshot.contextState,
    educationalMode: reasoning.educationalMode,
    educationalTopic: reasoning.educationalTopic,
    isFollowUp: snapshot.isFollowUp,
    learningStep: reasoning.learningStep,
    memory: input.memory,
    mode: reasoning.mode,
    voiceMode: input.voiceMode,
  });

  const executionTimeMs = Math.max(0, Math.round(performance.now() - started));

  return toEngineResult(input, {
    content,
    context: {
      clinicalContext,
      contextState: snapshot.contextState,
      insights,
      isFollowUp: snapshot.isFollowUp,
      knowledgeHits: knowledge.hits,
      knowledgeRoute: knowledge.route,
      memory: input.memory,
      reasoning,
      resolvedQuestion: snapshot.contextState.resolvedQuestion,
      session,
    },
    executionTimeMs,
  });
}
