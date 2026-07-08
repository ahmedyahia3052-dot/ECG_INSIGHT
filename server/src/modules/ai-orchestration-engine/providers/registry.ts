import { MockProvider as LlmMockProvider } from "../../../llm/providers/mock.provider";
import { isOpenAiLlmConfigured, isOllamaLlmEnabled } from "../../../llm/llm-config";
import { resolveLlmProvider, shouldForceMockProvider } from "../../../llm/llm-registry";
import type { LlmCompletionDTO, LlmGenerateInput } from "../../../llm/types";
import type { AiProviderPreference } from "@prisma/client";
import type { FutureAiProviderRegistration, IAiOrchestrationProvider } from "./ai-provider.interface";
import { OllamaOrchestrationAdapter } from "./ollama.adapter";
import { OpenAiOrchestrationAdapter } from "./openai.adapter";

const EMPTY_LLM_COMPLETION = (model: string, content: string): LlmCompletionDTO => ({
  content,
  model,
  toolCalls: [],
});

class RuleBasedOrchestrationAdapter implements IAiOrchestrationProvider {
  readonly kind = "rule_based" as const;
  readonly model = "ecg-insight-rule-engine-v2.0.0";
  readonly name = "rule_based";

  async generateChat(_input: LlmGenerateInput) {
    return EMPTY_LLM_COMPLETION(
      this.model,
      "Rule-based orchestration provider does not perform LLM enrichment.",
    );
  }

  async healthCheck() {
    return { model: this.model, provider: this.name, status: "ok" as const };
  }
}

class MockOrchestrationAdapter implements IAiOrchestrationProvider {
  readonly kind = "mock" as const;
  private readonly provider = new LlmMockProvider();

  get model() {
    return this.provider.model;
  }

  get name() {
    return this.provider.providerName;
  }

  async generateChat(input: Parameters<IAiOrchestrationProvider["generateChat"]>[0]) {
    return this.provider.generateChat(input);
  }

  async healthCheck() {
    return this.provider.healthCheck();
  }
}

const futureProviderRegistry: FutureAiProviderRegistration[] = [];

export function registerFutureAiProvider(descriptor: FutureAiProviderRegistration) {
  if (!futureProviderRegistry.some((entry) => entry.kind === descriptor.kind)) {
    futureProviderRegistry.push(descriptor);
  }
}

export function listFutureAiProviders() {
  return [...futureProviderRegistry];
}

export async function resolveOrchestrationProvider(
  preference: AiProviderPreference,
): Promise<IAiOrchestrationProvider> {
  if (shouldForceMockProvider()) {
    return new MockOrchestrationAdapter();
  }

  if (preference === "RULE_BASED") {
    return new RuleBasedOrchestrationAdapter();
  }

  if (preference === "OPENAI") {
    if (isOpenAiLlmConfigured()) return new OpenAiOrchestrationAdapter();
    return new RuleBasedOrchestrationAdapter();
  }

  if (preference === "OLLAMA") {
    if (isOllamaLlmEnabled()) return new OllamaOrchestrationAdapter();
    if (isOpenAiLlmConfigured()) return new OpenAiOrchestrationAdapter();
    return new RuleBasedOrchestrationAdapter();
  }

  const llm = await resolveLlmProvider();
  if (llm.providerName === "ollama") return new OllamaOrchestrationAdapter();
  if (llm.providerName === "openai") return new OpenAiOrchestrationAdapter();

  if (isOpenAiLlmConfigured()) return new OpenAiOrchestrationAdapter();
  return new RuleBasedOrchestrationAdapter();
}
