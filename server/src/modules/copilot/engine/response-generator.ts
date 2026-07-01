import type { SmartIntent } from "../smart-intent-types";
import type { CommunicationIntent, GenerateInput } from "./types";
import { NaturalResponse } from "./v2/natural-response";
import { MedicalReasoning } from "./v2/medical-reasoning";
import { emptyClinicalContext } from "../intent-manager";

export const ResponseGenerator = {
  generate(input: GenerateInput & { primarySmartIntent: SmartIntent }): { content: string } {
    const reasoning = MedicalReasoning.analyze({
      attachments: input.attachments,
      chatInput: {},
      contextState: {
        activeTopic: input.topic,
        entityMemory: { ages: [], diseases: [], drugs: [], patientNames: [] },
        hasActiveCase: Boolean(input.clinicalContext.currentCase),
        hasActivePatient: Boolean(input.clinicalContext.patient),
        hasUploadedEcg: input.attachments.some((a) => /ecg|ekg/i.test(`${a.documentType ?? ""} ${a.kind}`)),
        hasUploadedFiles: input.attachments.length > 0,
        hasUploadedImages: input.attachments.some((a) => a.kind === "image" || a.kind === "camera"),
        resolvedQuestion: input.question,
        topicStack: input.topic ? [input.topic] : [],
      },
      isFollowUp: Boolean(input.topic),
      memory: input.memory,
      question: input.question,
    });
    if (input.requiresClarification && input.clarificationPrompt) {
      return { content: input.clarificationPrompt };
    }
    const content = NaturalResponse.generate({
      clinicianName: input.clinicianName,
      clinicalContext: input.clinicalContext,
      contextState: {
        activeTopic: input.topic,
        entityMemory: { ages: [], diseases: [], drugs: [], patientNames: [] },
        hasActiveCase: Boolean(input.clinicalContext.currentCase),
        hasActivePatient: Boolean(input.clinicalContext.patient),
        hasUploadedEcg: false,
        hasUploadedFiles: input.attachments.length > 0,
        hasUploadedImages: false,
        resolvedQuestion: input.question,
        topicStack: input.topic ? [input.topic] : [],
      },
      insights: [],
      knowledge: input.knowledge,
      memory: input.memory,
      question: input.question,
      reasoning: {
        ...reasoning,
        mode: input.communicationIntent === "Education" ? "education" : reasoning.mode,
        educationalMode: input.communicationIntent === "Education" || reasoning.educationalMode,
      },
    });
    return { content };
  },
};

export function buildInternalClinicalBrief(question: string, context: import("../copilot-types").ClinicalContext, knowledge: import("../copilot-types").KnowledgeHit[], memory: import("../copilot-types").ConversationMemory) {
  void emptyClinicalContext;
  return [
    `Question: ${question}`,
    context.patient ? `Patient: ${context.patient.fullName}` : "",
    knowledge.length ? `Knowledge: ${knowledge.map((e) => e.topic).join(", ")}` : "",
    memory.turns.length ? `Turns: ${memory.turns.length}` : "",
  ].filter(Boolean).join("\n");
}
