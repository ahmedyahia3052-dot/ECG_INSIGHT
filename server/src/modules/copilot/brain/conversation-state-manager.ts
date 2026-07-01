import type { ConversationMemoryState } from "./brain-types";

const conversationStates = new Map<string, ConversationMemoryState>();

export const ConversationStateManager = {
  clear(conversationId: string) {
    conversationStates.delete(conversationId);
  },
  get(conversationId: string) {
    return conversationStates.get(conversationId);
  },
  merge(conversationId: string | undefined, next: ConversationMemoryState): ConversationMemoryState {
    if (!conversationId) return next;
    const previous = conversationStates.get(conversationId);
    const merged: ConversationMemoryState = {
      ...next,
      currentDiscussionTopic: next.currentDiscussionTopic || previous?.currentDiscussionTopic || "",
      currentPatientAge: next.currentPatientAge ?? previous?.currentPatientAge,
      currentPatientGender: next.currentPatientGender ?? previous?.currentPatientGender,
      currentPatientName: next.currentPatientName ?? previous?.currentPatientName,
      followUpTopics: Array.from(new Set([...(previous?.followUpTopics ?? []), ...next.followUpTopics])).slice(0, 8),
      hasActiveCase: next.hasActiveCase || Boolean(previous?.hasActiveCase),
      hasActivePatient: next.hasActivePatient || Boolean(previous?.hasActivePatient),
      hasUploadedEcg: next.hasUploadedEcg || Boolean(previous?.hasUploadedEcg),
      hasUploadedFiles: next.hasUploadedFiles || Boolean(previous?.hasUploadedFiles),
      hasUploadedReport: next.hasUploadedReport || Boolean(previous?.hasUploadedReport),
      turnCount: Math.max(next.turnCount, previous?.turnCount ?? 0),
    };
    conversationStates.set(conversationId, merged);
    return merged;
  },
  resetForTests() {
    conversationStates.clear();
  },
};
