import { OllamaProvider } from "../../../llm/providers/ollama.provider";
import type { LlmGenerateInput } from "../../../llm/types";
import type { IAiOrchestrationProvider } from "./ai-provider.interface";

export class OllamaOrchestrationAdapter implements IAiOrchestrationProvider {
  readonly kind = "ollama" as const;
  readonly name = "ollama";
  private readonly provider: OllamaProvider;

  constructor(provider = new OllamaProvider()) {
    this.provider = provider;
  }

  get model() {
    return this.provider.model;
  }

  async generateChat(input: LlmGenerateInput) {
    return this.provider.generateChat(input);
  }

  async healthCheck() {
    return this.provider.healthCheck();
  }
}
