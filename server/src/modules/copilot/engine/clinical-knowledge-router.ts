import type { AttachmentForAnalysis, ConversationMemory } from "../copilot-types";
import type { IntentClassificationResult } from "../smart-intent-types";
import { ContextManager } from "./context-manager";
import type { SessionRecord } from "./conversation-manager";
import { MedicalReasoning } from "./v2/medical-reasoning";
import { ECG_LEARNING_PATH } from "./v2/types";

export type ClinicalKnowledgeDomain =
  | "clinical_reasoning"
  | "differential_diagnosis"
  | "drug_information"
  | "ecg_interpretation"
  | "education"
  | "emergency_assessment"
  | "general_conversation"
  | "guidelines"
  | "laboratory_interpretation"
  | "radiology_interpretation";

export type EducationalTopic = "ecg_basics" | "general_medicine" | "none";

export type ClinicalKnowledgeRouteResult = {
  confidence: number;
  domain: ClinicalKnowledgeDomain;
  educationalMode: boolean;
  educationalTopic: EducationalTopic;
  learningStep: number;
  reason: string;
};

export { ECG_LEARNING_PATH };

export const ClinicalKnowledgeRouter = {
  route(input: {
    attachments: AttachmentForAnalysis[];
    classification: IntentClassificationResult;
    memory: ConversationMemory;
    previousSession?: SessionRecord;
    question: string;
    resolvedQuestion: string;
  }): ClinicalKnowledgeRouteResult {
    const contextState = ContextManager.build({
      attachments: input.attachments,
      chatInput: {},
      memory: input.memory,
      previousTopicStack: input.previousSession?.topicStack ?? [],
      question: input.question,
    });
    const reasoning = MedicalReasoning.analyze({
      attachments: input.attachments,
      chatInput: {},
      contextState,
      isFollowUp: ContextManager.isFollowUp(input.question, contextState.activeTopic, input.memory),
      memory: input.memory,
      question: input.question,
      session: input.previousSession,
    });
    const domain: ClinicalKnowledgeDomain = reasoning.educationalMode
      ? "education"
      : reasoning.mode === "vision_review"
        ? "ecg_interpretation"
        : reasoning.mode === "emergency"
          ? "emergency_assessment"
          : "clinical_reasoning";
    return {
      confidence: 0.88,
      domain,
      educationalMode: reasoning.educationalMode,
      educationalTopic: reasoning.educationalTopic,
      learningStep: reasoning.learningStep,
      reason: `v2-${reasoning.mode}`,
    };
  },
};
