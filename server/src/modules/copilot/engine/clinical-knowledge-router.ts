import type { AttachmentForAnalysis, ConversationMemory } from "../copilot-types";
import { ContextManager } from "./context-manager";
import type { SessionRecord } from "./conversation-manager";
import { ConversationIntentEngine } from "./v2/conversation-intent";
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
    classification: { primaryIntent: string };
    memory: ConversationMemory;
    previousSession?: SessionRecord;
    question: string;
    resolvedQuestion: string;
  }): ClinicalKnowledgeRouteResult {
    void input.classification;
    const contextState = ContextManager.build({
      attachments: input.attachments,
      chatInput: {},
      memory: input.memory,
      previousTopicStack: input.previousSession?.topicStack ?? [],
      question: input.question,
    });
    const intent = ConversationIntentEngine.classify({
      attachments: input.attachments,
      contextState,
      memory: input.memory,
      question: input.question,
      session: input.previousSession,
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
    const domain: ClinicalKnowledgeDomain = intent.isTutorMode || intent.intent === "medical_education"
      ? "education"
      : ["ecg_interpretation", "image_discussion"].includes(intent.intent)
        ? "ecg_interpretation"
        : intent.intent === "emergency_advice"
          ? "emergency_assessment"
          : "clinical_reasoning";
    return {
      confidence: 0.88,
      domain,
      educationalMode: reasoning.educationalMode,
      educationalTopic: reasoning.educationalTopic,
      learningStep: reasoning.learningStep,
      reason: intent.reason,
    };
  },
};
