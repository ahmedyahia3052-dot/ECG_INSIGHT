import { LlmClient } from "../../llm/llm-client";
import { resolveLlmProvider, shouldForceMockProvider } from "../../llm/llm-registry";
import { analyzeImageWithOllama, OllamaProvider } from "../../llm/providers/ollama.provider";
import type { CopilotApiMessage, LlmStreamCallbacks } from "../../llm/types";

export type { CopilotApiMessage };
export type AiChatStreamCallbacks = LlmStreamCallbacks;

export type AiChatCompletionResult = {
  content: string;
  model: string;
};

export const AiChatService = {
  async analyzeImage(input: { imageBase64: string; mimeType?: string; prompt: string }) {
    const provider = resolveLlmProvider();
    if (provider.providerName !== "ollama") {
      return provider.generateChat({
        messages: [{ content: input.prompt, role: "user" }],
      });
    }
    return analyzeImageWithOllama(provider as OllamaProvider, {
      imageBase64: input.imageBase64,
      prompt: input.prompt,
    });
  },

  async generateChat(messages: CopilotApiMessage[], callbacks: LlmStreamCallbacks = {}): Promise<AiChatCompletionResult> {
    const result = await LlmClient.generateStream(messages, callbacks);
    return { content: result.content, model: result.model };
  },

  async getHealth() {
    return LlmClient.getHealth();
  },

  async listInstalledModels() {
    return LlmClient.listModels();
  },

  async streamChat(messages: CopilotApiMessage[], callbacks: LlmStreamCallbacks = {}): Promise<AiChatCompletionResult> {
    const result = await LlmClient.generateStream(messages, callbacks);
    return { content: result.content, model: result.model };
  },

  shouldUseMockLlm() {
    return shouldForceMockProvider();
  },
};

export { mapApiMessagesToChatMessages } from "../../llm/llm-client";
