import type { ConversationMemory } from "../copilot-types";
import type { LlmMessage } from "./types";

export function buildConversationMessages(memory: ConversationMemory, question: string): LlmMessage[] {
  const messages: LlmMessage[] = [];
  for (const turn of memory.turns) {
    if (!turn.content.trim()) continue;
    messages.push({
      content: turn.content.trim(),
      role: turn.role === "assistant" ? "assistant" : "user",
    });
  }
  const last = messages.at(-1);
  if (!last || last.role !== "user" || last.content !== question.trim()) {
    messages.push({ content: question.trim(), role: "user" });
  }
  return messages.slice(-24);
}
