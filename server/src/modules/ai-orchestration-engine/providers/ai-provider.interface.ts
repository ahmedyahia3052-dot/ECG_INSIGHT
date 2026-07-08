import type { LlmCompletionDTO, LlmGenerateInput, LlmHealthDTO } from "../../../llm/types";

export type AiOrchestrationProviderKind = "openai" | "ollama" | "rule_based" | "mock";

export interface IAiOrchestrationProvider {
  readonly kind: AiOrchestrationProviderKind;
  readonly model: string;
  readonly name: string;
  generateChat(input: LlmGenerateInput): Promise<LlmCompletionDTO>;
  healthCheck(): Promise<LlmHealthDTO>;
}

export interface FutureAiProviderRegistration {
  capabilities: string[];
  kind: string;
  name: string;
}
