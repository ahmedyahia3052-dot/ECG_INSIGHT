import type { AttachmentForAnalysis, ChatContextInput, ConversationMemory } from "./copilot-types";
import { conversationTopic, hasUploadedEcgAttachment } from "./intent-helpers";
import type { ConversationContextState } from "./smart-intent-types";

export function resolveConversationContext(input: {
  attachments: AttachmentForAnalysis[];
  chatInput: ChatContextInput;
  memory: ConversationMemory;
}): ConversationContextState {
  const hasUploadedEcg = hasUploadedEcgAttachment(input.attachments) || input.memory.attachments.some((item) => /ecg|ekg/i.test(item.name));
  const hasUploadedImage = input.attachments.some((item) => item.kind === "image" || item.kind === "camera") || input.memory.attachments.some((item) => /image|png|jpg|jpeg|webp/i.test(item.name));
  const hasUploadedReport = input.attachments.some((item) => /report|pdf|doc/i.test(`${item.documentType ?? ""} ${item.originalName}`))
    || input.memory.attachments.some((item) => /report|pdf|doc/i.test(item.name));
  const patientName = input.memory.turns
    .map((turn) => turn.content.match(/\bpatient\s+(?:named\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i)?.[1])
    .find(Boolean);
  return {
    currentCaseId: input.chatInput.caseId,
    currentPatientId: input.chatInput.patientId,
    discussionTopic: conversationTopic(input.memory),
    hasUploadedEcg,
    hasUploadedImage,
    hasUploadedReport,
    patientName,
    requiresClarification: false,
  };
}
