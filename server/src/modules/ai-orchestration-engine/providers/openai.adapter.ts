import { OpenAiCompatibleProvider } from "../../../llm/providers/openai.provider";
import type { LlmGenerateInput } from "../../../llm/types";
import type { IAiOrchestrationProvider } from "./ai-provider.interface";

export class OpenAiOrchestrationAdapter implements IAiOrchestrationProvider {
  readonly kind = "openai" as const;
  readonly name = "openai";
  private readonly provider: OpenAiCompatibleProvider;

  constructor(provider = new OpenAiCompatibleProvider()) {
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
