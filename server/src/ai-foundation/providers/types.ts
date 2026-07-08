import type { AIProvider } from "../../ai/ai-provider.types";
import type { ILlmProvider } from "../../llm/providers/llm-provider.interface";
import type { LlmHealthDTO } from "../../llm/types";
import type { AiProviderKind } from "../types";

export interface UnifiedProviderDescriptor {
  kind: AiProviderKind;
  name: string;
  modelVersion: string;
  capabilities: Array<"ecg_analysis" | "llm_chat" | "llm_vision">;
  status: "available" | "degraded" | "unavailable";
}

export interface EcgProviderHandle {
  kind: "ecg";
  provider: AIProvider;
}

export interface LlmProviderHandle {
  kind: "llm";
  provider: ILlmProvider;
  health?: LlmHealthDTO;
}

export type UnifiedProviderHandle = EcgProviderHandle | LlmProviderHandle;
