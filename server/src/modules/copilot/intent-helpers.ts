import type { AttachmentForAnalysis, ConversationMemory } from "./copilot-types";

export function conversationTopic(memory: ConversationMemory) {
  const combined = memory.turns.map((turn) => turn.content).join(" ").toLowerCase();
  if (/atrial fibrillation|\baf\b/.test(combined)) return "atrial fibrillation";
  if (/hypertension|blood pressure/.test(combined)) return "hypertension";
  if (/heart failure|\bhf\b/.test(combined)) return "heart failure";
  if (/stemi|st elevation/.test(combined)) return "stemi";
  if (/long qt|prolonged qt|qtc/.test(combined)) return "prolonged QT";
  return "";
}

export function isEcgUploadPendingInterpretation(question: string, attachments: AttachmentForAnalysis[]) {
  const hasEcg = attachments.some((attachment) => attachment.kind === "ecg" || /ecg|ekg/i.test(`${attachment.documentType ?? ""} ${attachment.originalName}`));
  if (!hasEcg) return false;
  return !/(interpret|review|analyze|analyse|read|explain|findings|diagnosis|what do you see|look at|summarize|summary)/i.test(question);
}

export function hasUploadedEcgAttachment(attachments: AttachmentForAnalysis[]) {
  return attachments.some((attachment) => attachment.kind === "ecg" || /ecg|ekg/i.test(`${attachment.documentType ?? ""} ${attachment.originalName}`));
}
