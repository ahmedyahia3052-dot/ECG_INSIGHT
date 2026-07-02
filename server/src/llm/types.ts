export type CopilotApiMessage = {
  content: string | null;
  role: "assistant" | "system" | "tool" | "user";
  tool_call_id?: string;
  tool_calls?: Array<{ function: { arguments: string; name: string }; id: string; type: "function" }>;
};

export type LlmChatMessage = {
  content: string;
  images?: string[];
  role: "assistant" | "system" | "user";
};

export type LlmToolCall = {
  arguments: string;
  id: string;
  name: string;
};

export type LlmUsage = {
  latencyMs: number;
  promptTokens: number;
  responseTokens: number;
};

/** Same shape as the legacy OpenAI-compatible completion DTO used by Copilot. */
export type LlmCompletionDTO = {
  content: string;
  model: string;
  toolCalls: LlmToolCall[];
  usage?: LlmUsage;
};

export type LlmGenerateInput = {
  messages: LlmChatMessage[];
  onToken?: (token: string) => void;
  temperature?: number;
};

export type LlmHealthDTO = {
  latency?: number;
  model: string;
  ollamaVersion?: string | null;
  online?: boolean;
  provider: string;
  status: "degraded" | "ok" | "offline";
};

export type LlmModelsDTO = {
  connected: boolean;
  installedModels: string[];
  provider: string;
  selectedModel: string;
};

export type LlmStreamCallbacks = {
  onStatus?: (message: string) => void;
  onToken?: (token: string) => void;
};
