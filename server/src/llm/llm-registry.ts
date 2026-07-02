import { env } from "../config/env";
import { log } from "../utils/logger";
import { logOllamaStartup, probeOllama, type OllamaRuntimeState } from "./ollama-runtime";
import { MockProvider } from "./providers/mock.provider";
import { OllamaProvider } from "./providers/ollama.provider";
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
    model: provider.model,
    provider: provider.providerName,
    reason,
  });
}

function createOllamaProvider(state: OllamaRuntimeState) {
  return new OllamaProvider(state.selectedModel, state.baseUrl);
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
  if (shouldForceMockProvider() || env.LLM_PROVIDER !== "ollama") {
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

  if (env.LLM_PROVIDER !== "ollama") {
    activeProvider = new MockProvider();
    logProviderSelected(activeProvider, "llm-provider-not-ollama");
    return;
  }

  ollamaRuntime = await probeOllama();
  logOllamaStartup(ollamaRuntime);

  if (ollamaRuntime.connected) {
    activeProvider = createOllamaProvider(ollamaRuntime);
    logProviderSelected(activeProvider, "ollama-startup-verified");
    return;
  }

  log("warn", "Ollama unavailable at startup; falling back to Mock LLM provider.", {
    baseUrl: ollamaRuntime.baseUrl,
    model: env.OLLAMA_MODEL,
  });
  activeProvider = new MockProvider();
  logProviderSelected(activeProvider, "ollama-unreachable-fallback");
}

export async function ensureOllamaProvider(): Promise<ILlmProvider> {
  if (shouldForceMockProvider()) {
    return new MockProvider();
  }

  if (env.LLM_PROVIDER !== "ollama") {
    return getActiveLlmProvider();
  }

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

  if (!activeProvider) {
    activeProvider = new MockProvider();
    logProviderSelected(activeProvider, "ollama-reconnect-fallback");
  }
  return activeProvider;
}

export function getActiveLlmProvider(): ILlmProvider {
  if (!activeProvider) {
    if (env.LLM_PROVIDER === "ollama" && !shouldForceMockProvider() && ollamaRuntime?.connected) {
      activeProvider = createOllamaProvider(ollamaRuntime);
      logProviderSelected(activeProvider, "lazy-ollama");
    } else if (env.LLM_PROVIDER === "ollama" && !shouldForceMockProvider()) {
      activeProvider = new OllamaProvider();
      logProviderSelected(activeProvider, "lazy-ollama-unprobed");
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
  if (env.LLM_PROVIDER === "ollama") {
    return ensureOllamaProvider();
  }
  return getActiveLlmProvider();
}

export function resetLlmProviderForTests() {
  activeProvider = undefined;
  ollamaRuntime = undefined;
  initialized = false;
}
