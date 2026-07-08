import { getAIProvider } from "../../ai/providers";
import { resolveLlmProvider } from "../../llm/llm-registry";
import type { UnifiedProviderDescriptor, UnifiedProviderHandle } from "./types";

export function getEcgProviderHandle(): UnifiedProviderHandle {
  const provider = getAIProvider();
  return { kind: "ecg", provider };
}

export async function getLlmProviderHandle(): Promise<UnifiedProviderHandle> {
  const provider = await resolveLlmProvider();
  let health;
  try {
    health = await provider.healthCheck();
  } catch {
    health = { model: provider.model, provider: provider.providerName, status: "offline" as const };
  }
  return { kind: "llm", health, provider };
}

export function describeEcgProvider(): UnifiedProviderDescriptor {
  const provider = getAIProvider();
  return {
    capabilities: ["ecg_analysis"],
    kind: "ecg",
    modelVersion: provider.modelVersion,
    name: provider.name,
    status: "available",
  };
}

export async function describeLlmProvider(): Promise<UnifiedProviderDescriptor> {
  const handle = await getLlmProviderHandle();
  if (handle.kind !== "llm") {
    return { capabilities: [], kind: "llm", modelVersion: "unknown", name: "unknown", status: "unavailable" };
  }
  const status = handle.health?.status === "ok" ? "available" : handle.health?.status === "degraded" ? "degraded" : "unavailable";
  return {
    capabilities: ["llm_chat", "llm_vision"],
    kind: "llm",
    modelVersion: handle.provider.model,
    name: handle.provider.providerName,
    status,
  };
}

export async function listProviderDescriptors(): Promise<UnifiedProviderDescriptor[]> {
  return [describeEcgProvider(), await describeLlmProvider()];
}
