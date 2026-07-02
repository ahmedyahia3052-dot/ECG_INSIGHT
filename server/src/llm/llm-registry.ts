import { env } from "../config/env";
import { log } from "../utils/logger";
import {
  assertCopilotLlmConfiguration,
  isOllamaLlmEnabled,
  isOpenAiFallbackEnabled,
  isOpenAiLlmConfigured,
} from "./llm-config";
import { logOllamaStartup, probeOllama, type OllamaRuntimeState } from "./ollama-runtime";
import { MockProvider } from "./providers/mock.provider";
import { OllamaProvider } from "./providers/ollama.provider";
import { OpenAiCompatibleProvider } from "./providers/openai.provider";
import type { ILlmProvider } from "./providers/llm-provider.interface";

let activeProvider: ILlmProvider | undefined;
let ollamaRuntime: OllamaRuntimeState | undefined;
let initialized = false;

export function shouldForceMockProvider() {
  return env.NODE_ENV === "test" ||
    process.env["COPILOT_LLM_MOCK"] === "true" ||
    process.env["COPILOT_LLM_MOCK"] === "1";
}

function logProviderSelected(provider: ILlmProvider, reason: string) {
  log("info", "LLM provider selected.", {
    apiKeyRequired: false,
    model: provider.model,
    provider: provider.providerName,
    reason,
  });
}

function createOllamaProvider(state: OllamaRuntimeState) {
  return new OllamaProvider(state.selectedModel, state.baseUrl);
}

function tryCreateOpenAiProvider(): ILlmProvider | null {
  if (!isOpenAiLlmConfigured() && !isOpenAiFallbackEnabled()) return null;
  try {
    return new OpenAiCompatibleProvider();
  } catch (error) {
    log("warn", "OpenAI provider unavailable.", {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

async function connectOllamaProvider(): Promise<ILlmProvider | null> {
  const state = await probeOllama();
  ollamaRuntime = state;
  if (!state.connected) return null;
  return createOllamaProvider(state);
}

export function getOllamaRuntimeState(): OllamaRuntimeState | undefined {
  return ollamaRuntime;
}

export async function refreshOllamaRuntime() {
  if (shouldForceMockProvider() || !isOllamaLlmEnabled()) {
    return getOllamaRuntimeState();
  }
  const provider = await connectOllamaProvider();
  if (provider) {
    activeProvider = provider;
    logProviderSelected(activeProvider, "ollama-runtime-refresh");
  }
  return ollamaRuntime;
}

export async function initializeLlmProvider() {
  if (initialized) return;
  initialized = true;
  assertCopilotLlmConfiguration();

  if (shouldForceMockProvider()) {
    activeProvider = new MockProvider();
    ollamaRuntime = {
      baseUrl: env.OLLAMA_BASE_URL,
      connected: false,
      installedModels: [],
      ollamaVersion: null,
      selectedModel: env.OLLAMA_MODEL,
    };
    logProviderSelected(activeProvider, "forced-mock");
    return;
  }

  if (isOllamaLlmEnabled()) {
    log("info", "Copilot LLM mode: local Ollama (no API key required).", {
      baseUrl: env.OLLAMA_BASE_URL,
      model: env.OLLAMA_MODEL,
      ollamaEnabled: env.OLLAMA_ENABLED,
    });

    ollamaRuntime = await probeOllama();
    logOllamaStartup(ollamaRuntime);

    if (ollamaRuntime.connected) {
      activeProvider = createOllamaProvider(ollamaRuntime);
      logProviderSelected(activeProvider, "ollama-startup-verified");
      return;
    }

    const openAi = tryCreateOpenAiProvider();
    if (openAi) {
      activeProvider = openAi;
      logProviderSelected(activeProvider, "ollama-unreachable-openai-fallback");
      return;
    }

    log("warn", "Ollama unavailable at startup; falling back to Mock LLM provider.", {
      baseUrl: ollamaRuntime.baseUrl,
      model: env.OLLAMA_MODEL,
    });
    activeProvider = new MockProvider();
    logProviderSelected(activeProvider, "ollama-unreachable-mock-fallback");
    return;
  }

  if (isOpenAiLlmConfigured()) {
    activeProvider = tryCreateOpenAiProvider() ?? new MockProvider();
    logProviderSelected(activeProvider, "openai-explicit");
    return;
  }

  activeProvider = new MockProvider();
  logProviderSelected(activeProvider, "default-mock");
}

export async function ensureOllamaProvider(): Promise<ILlmProvider> {
  if (shouldForceMockProvider()) {
    return new MockProvider();
  }

  if (isOllamaLlmEnabled()) {
    if (activeProvider?.providerName === "ollama" && ollamaRuntime?.connected) {
      return activeProvider;
    }

    const provider = await connectOllamaProvider();
    if (provider) {
      logOllamaStartup(ollamaRuntime!);
      activeProvider = provider;
      logProviderSelected(activeProvider, "ollama-runtime-reconnected");
      return activeProvider;
    }

    const openAi = tryCreateOpenAiProvider();
    if (openAi) {
      activeProvider = openAi;
      logProviderSelected(activeProvider, "ollama-runtime-openai-fallback");
      return openAi;
    }

    if (!activeProvider) {
      activeProvider = new MockProvider();
      logProviderSelected(activeProvider, "ollama-reconnect-mock-fallback");
    }
    return activeProvider;
  }

  return getActiveLlmProvider();
}

export function getActiveLlmProvider(): ILlmProvider {
  if (!activeProvider) {
    if (isOllamaLlmEnabled() && !shouldForceMockProvider() && ollamaRuntime?.connected) {
      activeProvider = createOllamaProvider(ollamaRuntime);
      logProviderSelected(activeProvider, "lazy-ollama");
    } else if (isOllamaLlmEnabled() && !shouldForceMockProvider()) {
      activeProvider = new OllamaProvider();
      logProviderSelected(activeProvider, "lazy-ollama-unprobed");
    } else if (isOpenAiLlmConfigured()) {
      activeProvider = tryCreateOpenAiProvider() ?? new MockProvider();
      logProviderSelected(activeProvider, "lazy-openai");
    } else {
      activeProvider = new MockProvider();
      logProviderSelected(activeProvider, "lazy-mock");
    }
  }
  return activeProvider;
}

export async function resolveLlmProvider(): Promise<ILlmProvider> {
  if (shouldForceMockProvider()) {
    return new MockProvider();
  }
  if (isOllamaLlmEnabled()) {
    return ensureOllamaProvider();
  }
  if (isOpenAiLlmConfigured()) {
    return tryCreateOpenAiProvider() ?? getActiveLlmProvider();
  }
  return getActiveLlmProvider();
}

export function resetLlmProviderForTests() {
  activeProvider = undefined;
  ollamaRuntime = undefined;
  initialized = false;
}
