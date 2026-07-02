import { env } from "../config/env";

/** Copilot chat uses local Ollama when enabled — never requires cloud API keys. */
export function isOllamaLlmEnabled() {
  return env.OLLAMA_ENABLED || env.LLM_PROVIDER === "ollama";
}

export function readOpenAiApiKey() {
  return env.OPENAI_API_KEY?.trim() || env.AI_MODEL_API_KEY?.trim() || "";
}

/** OpenAI is used only when explicitly configured — never as a silent default. */
export function isOpenAiLlmConfigured() {
  return env.LLM_PROVIDER === "openai" && Boolean(readOpenAiApiKey());
}

export function isOpenAiFallbackEnabled() {
  return env.LLM_OPENAI_FALLBACK && Boolean(readOpenAiApiKey());
}

/** @deprecated Copilot must not block on missing API keys when Ollama is enabled. */
export function copilotRequiresCloudApiKey() {
  if (isOllamaLlmEnabled()) return false;
  return env.LLM_PROVIDER === "openai" && !readOpenAiApiKey();
}

export function assertCopilotLlmConfiguration() {
  if (copilotRequiresCloudApiKey()) {
    throw new Error(
      "LLM_PROVIDER=openai requires OPENAI_API_KEY or AI_MODEL_API_KEY. " +
      "For local-only mode set OLLAMA_ENABLED=true and LLM_PROVIDER=ollama.",
    );
  }
}
