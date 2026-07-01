import type { AttachmentForAnalysis, ChatContextInput, ConversationMemory } from "../copilot-types";
import { resolveConversationContext } from "../context-resolver";
import type { ConversationContextState } from "../smart-intent-types";

export type ConversationContextSnapshot = ConversationContextState & {
  hasActiveCase: boolean;
  hasActivePatient: boolean;
  hasUploadedFiles: boolean;
};

export const ConversationContextService = {
  resolve(input: {
    attachments: AttachmentForAnalysis[];
    chatInput: ChatContextInput;
    memory: ConversationMemory;
  }): ConversationContextSnapshot {
    const base = resolveConversationContext(input);
    return {
      ...base,
      hasActiveCase: Boolean(input.chatInput.caseId),
      hasActivePatient: Boolean(input.chatInput.patientId),
      hasUploadedFiles: base.hasUploadedEcg || base.hasUploadedImage || base.hasUploadedReport || input.memory.attachments.length > 0,
    };
  },
};
