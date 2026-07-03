import { AppError } from "../middleware/error";
import { log } from "../utils/logger";
import { mapOllamaErrorToGracefulMessage } from "./errors";
import { llmInferenceQueue } from "./inference-queue";
import { getOllamaRuntimeState, resolveLlmProvider } from "./llm-registry";
import type { ILlmProvider } from "./providers/llm-provider.interface";
import type {
  CopilotApiMessage,
  LlmChatMessage,
  LlmCompletionDTO,
  LlmHealthDTO,
  LlmModelsDTO,
  LlmStreamCallbacks,
} from "./types";

export const LLM_MAX_RETRIES = 3;
const RETRY_DELAYS_MS = [500, 1_000, 2_000] as const;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableError(error: unknown) {
  if (error instanceof AppError) {
    return error.statusCode >= 500 || error.statusCode === 404 || error.statusCode === 503;
  }
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return message.includes("fetch failed") ||
      message.includes("econnrefused") ||
      message.includes("network") ||
      message.includes("abort") ||
      message.includes("timeout") ||
      message.includes("not found");
  }
  return false;
}

function toGracefulAppError(error: unknown): AppError {
  if (error instanceof AppError) {
    if (["Local Medical AI is starting...", "Model is loading...", "Model unavailable."].includes(error.message)) {
      return error;
    }
    return new AppError(503, mapOllamaErrorToGracefulMessage(error, error.statusCode), error.code);
  }
  return new AppError(503, mapOllamaErrorToGracefulMessage(error), "LOCAL_LLM_UNAVAILABLE");
}

export function mapApiMessagesToChatMessages(messages: CopilotApiMessage[]): LlmChatMessage[] {
  const chatMessages: LlmChatMessage[] = [];
  for (const message of messages) {
    if (message.role === "tool") continue;
    if (message.role === "assistant" && message.tool_calls?.length) {
      if (message.content?.trim()) {
        chatMessages.push({ content: message.content.trim(), role: "assistant" });
      }
      continue;
    }
    const content = message.content?.trim();
    if (!content) continue;
    chatMessages.push({
      content,
      role: message.role === "assistant" ? "assistant" : message.role === "system" ? "system" : "user",
    });
  }
  return chatMessages;
}

function logCompletion(provider: ILlmProvider, result: LlmCompletionDTO) {
  log("info", "LLM completion finished.", {
    latencyMs: result.usage?.latencyMs ?? null,
    model: result.model,
    promptTokens: result.usage?.promptTokens ?? null,
    provider: provider.providerName,
    responseTokens: result.usage?.responseTokens ?? null,
  });
}

async function withRetry<T>(
  operation: () => Promise<T>,
  callbacks: LlmStreamCallbacks = {},
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= LLM_MAX_RETRIES; attempt += 1) {
    try {
      return await llmInferenceQueue.run(operation);
    } catch (error) {
      lastError = error;
      if (attempt >= LLM_MAX_RETRIES || !isRetryableError(error)) {
        throw toGracefulAppError(error);
      }
      const graceful = mapOllamaErrorToGracefulMessage(error, error instanceof AppError ? error.statusCode : undefined);
      callbacks.onStatus?.(graceful);
      await sleep(RETRY_DELAYS_MS[attempt - 1] ?? 2_000);
    }
  }
  throw toGracefulAppError(lastError);
}

export const LlmClient = {
  async generateStream(
    messages: CopilotApiMessage[],
    callbacks: LlmStreamCallbacks = {},
  ): Promise<LlmCompletionDTO> {
    const provider = await resolveLlmProvider();
    const chatMessages = mapApiMessagesToChatMessages(messages);
    if (!chatMessages.length) {
      throw new AppError(400, "No valid chat messages to send to the local model.", "LLM_EMPTY_MESSAGES");
    }

    const result = await withRetry(
      () => provider.generateStream({
        messages: chatMessages,
        onToken: callbacks.onToken,
      }),
      callbacks,
    );
    logCompletion(provider, result);
    return result;
  },

  async getHealth(): Promise<LlmHealthDTO> {
    const provider = await resolveLlmProvider();
    const runtime = getOllamaRuntimeState();
    const health = await provider.healthCheck();

    if (provider.providerName === "ollama" && runtime?.connected) {
      return {
        model: runtime.selectedModel,
        ollamaVersion: runtime.ollamaVersion,
        provider: "ollama",
        status: "ok",
      };
    }

    if (provider.providerName === "ollama") {
      return {
        latency: health.latency,
        model: provider.model,
        ollamaVersion: runtime?.ollamaVersion ?? null,
        provider: "ollama",
        status: health.online ? "ok" : "offline",
      };
    }

    return {
      model: provider.model,
      provider: provider.providerName,
      status: provider.providerName === "mock" ? "degraded" : "offline",
    };
  },

  async getModels(): Promise<LlmModelsDTO> {
    const provider = await resolveLlmProvider();
    const runtime = getOllamaRuntimeState();

    if (provider.providerName === "ollama" && runtime?.connected) {
      return {
        connected: true,
        installedModels: runtime.installedModels,
        provider: "ollama",
        selectedModel: runtime.selectedModel,
      };
    }

    if (provider.providerName === "ollama") {
      try {
        const installedModels = await provider.listModels();
        return {
          connected: installedModels.length > 0,
          installedModels,
          provider: "ollama",
          selectedModel: provider.model,
        };
      } catch {
        return {
          connected: false,
          installedModels: [],
          provider: "ollama",
          selectedModel: provider.model,
        };
      }
    }

    return {
      connected: false,
      installedModels: await provider.listModels().catch(() => []),
      provider: provider.providerName,
      selectedModel: provider.model,
    };
  },

  getActiveProviderName() {
    return getOllamaRuntimeState()?.connected ? "ollama" : "mock";
  },
};

export type { CopilotApiMessage, LlmCompletionDTO, LlmStreamCallbacks };
