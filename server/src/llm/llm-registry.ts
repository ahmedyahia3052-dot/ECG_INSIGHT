import { env } from "../config/env";
import { log } from "../utils/logger";
import { MockProvider } from "./providers/mock.provider";
import { OllamaProvider } from "./providers/ollama.provider";
import type { ILlmProvider } from "./providers/llm-provider.interface";

let activeProvider: ILlmProvider | undefined;
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

export async function initializeLlmProvider() {
  if (initialized) return;
  initialized = true;

  if (shouldForceMockProvider()) {
    activeProvider = new MockProvider();
    logProviderSelected(activeProvider, "forced-mock");
    return;
  }

  if (env.LLM_PROVIDER !== "ollama") {
    activeProvider = new MockProvider();
    logProviderSelected(activeProvider, "llm-provider-not-ollama");
    return;
  }

  const ollama = new OllamaProvider();
  const reachable = await OllamaProvider.verifyReachable(ollama.baseUrlValue);
  if (reachable) {
    activeProvider = ollama;
    logProviderSelected(activeProvider, "ollama-startup-verified");
    return;
  }

  log("warn", "Ollama unavailable at startup; falling back to Mock LLM provider.", {
    baseUrl: env.OLLAMA_BASE_URL,
    model: env.OLLAMA_MODEL,
  });
  activeProvider = new MockProvider();
  logProviderSelected(activeProvider, "ollama-unreachable-fallback");
}

export function getActiveLlmProvider(): ILlmProvider {
  if (!activeProvider) {
    if (env.LLM_PROVIDER === "ollama" && !shouldForceMockProvider()) {
      activeProvider = new OllamaProvider();
      logProviderSelected(activeProvider, "lazy-ollama");
    } else {
      activeProvider = new MockProvider();
      logProviderSelected(activeProvider, "lazy-mock");
    }
  }
  return activeProvider;
}

export function resolveLlmProvider(): ILlmProvider {
  if (shouldForceMockProvider()) {
    return new MockProvider();
  }
  return getActiveLlmProvider();
}

export function resetLlmProviderForTests() {
  activeProvider = undefined;
  initialized = false;
}
