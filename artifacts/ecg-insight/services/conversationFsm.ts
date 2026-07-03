export type ConversationPhase = "idle" | "streaming" | "uploading";

export function transitionConversationPhase(current: ConversationPhase, next: ConversationPhase): ConversationPhase {
  if (current === next) return current;
  if (current === "streaming" && next === "uploading") return "streaming";
  if (current === "uploading" && next === "streaming") return "uploading";
  return next;
}

export function isConversationLocked(phase: ConversationPhase) {
  return phase !== "idle";
}

export function canSendMessage(input: {
  attachmentsCount: number;
  draftTrimmed: boolean;
  phase: ConversationPhase;
  pendingUploadCount: number;
  pipelineBusy: boolean;
}) {
  if (input.phase !== "idle") return false;
  if (input.pendingUploadCount > 0 || input.pipelineBusy) return false;
  return input.draftTrimmed || input.attachmentsCount > 0;
}

export function canStopStream(phase: ConversationPhase) {
  return phase === "streaming";
}

export function isComposerEditable(phase: ConversationPhase, pipelineBusy: boolean, pendingUploadCount: number) {
  return phase === "idle" && !pipelineBusy && pendingUploadCount === 0;
}
