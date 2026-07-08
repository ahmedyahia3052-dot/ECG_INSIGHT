import { inferenceResultCache } from "./cache/inference-cache";
import { runInference } from "./inference/service";
import { listProviderDescriptors } from "./providers/registry";
import { listManagedPrompts, promptManager } from "./prompts/manager";
import { AI_FOUNDATION_ID, type AiInferenceRequest } from "./types";
import { AI_FOUNDATION_VERSION } from "./version";

export function getAiFoundationStatus() {
  return {
    cacheSize: inferenceResultCache.size(),
    foundationId: AI_FOUNDATION_ID,
    promptCount: listManagedPrompts().length,
    version: AI_FOUNDATION_VERSION,
  };
}

export async function getAiFoundationHealth() {
  const providers = await listProviderDescriptors();
  const degraded = providers.some((provider) => provider.status === "degraded");
  const unavailable = providers.every((provider) => provider.status === "unavailable");

  return {
    providers,
    status: unavailable ? "offline" : degraded ? "degraded" : "ok",
    ...getAiFoundationStatus(),
  };
}

export async function executeAiInference<T = unknown>(request: AiInferenceRequest) {
  return runInference<T>(request);
}

export { promptManager, runInference, listProviderDescriptors };
