import { env } from "../../config/env";
import { AppError } from "../../middleware/error";
import { log } from "../../utils/logger";
import { mapOllamaErrorToGracefulMessage } from "../errors";
import type { LlmChatMessage, LlmCompletionDTO, LlmGenerateInput, LlmHealthDTO } from "../types";
import type { ILlmProvider } from "./llm-provider.interface";

export const OLLAMA_REQUEST_TIMEOUT_MS = 120_000;

type OllamaChatResponse = {
  done?: boolean;
  eval_count?: number;
  message?: { content?: string; role?: string };
  model?: string;
  prompt_eval_count?: number;
};

type OllamaTagsResponse = {
  models?: Array<{ model?: string; name: string }>;
};

type OllamaVersionResponse = {
  version?: string;
};

function normalizeBaseUrl(baseUrl: string) {
  const trimmed = baseUrl.trim().replace(/\/+$/, "");
  try {
    const url = new URL(trimmed);
    if (url.hostname === "localhost") url.hostname = "127.0.0.1";
    return url.toString().replace(/\/+$/, "");
  } catch {
    return trimmed.replace(/localhost/g, "127.0.0.1");
  }
}

export class OllamaProvider implements ILlmProvider {
  readonly providerName = "ollama";
  readonly model: string;
  private readonly baseUrl: string;

  constructor(model = env.OLLAMA_MODEL, baseUrl = env.OLLAMA_BASE_URL) {
    this.model = model;
    this.baseUrl = normalizeBaseUrl(baseUrl);
  }

  get baseUrlValue() {
    return this.baseUrl;
  }

  private async request(path: string, init: RequestInit, timeoutMs = OLLAMA_REQUEST_TIMEOUT_MS) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(`${this.baseUrl}${path}`, {
        ...init,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
  }

  static async verifyReachable(baseUrl: string): Promise<boolean> {
    const normalized = normalizeBaseUrl(baseUrl);
    try {
      const [versionRes, tagsRes] = await Promise.all([
        fetch(`${normalized}/api/version`, { method: "GET", signal: AbortSignal.timeout(10_000) }),
        fetch(`${normalized}/api/tags`, { method: "GET", signal: AbortSignal.timeout(10_000) }),
      ]);
      return versionRes.ok && tagsRes.ok;
    } catch {
      return false;
    }
  }

  async healthCheck(): Promise<LlmHealthDTO> {
    const started = performance.now();
    try {
      const [versionRes, tagsRes] = await Promise.all([
        this.request("/api/version", { method: "GET" }, 10_000),
        this.request("/api/tags", { method: "GET" }, 10_000),
      ]);
      const latency = Math.max(0, Math.round(performance.now() - started));
      if (versionRes.ok && tagsRes.ok) {
        const versionPayload = (await versionRes.json().catch(() => ({}))) as OllamaVersionResponse;
        return {
          latency,
          model: this.model,
          ollamaVersion: versionPayload.version ?? null,
          online: true,
          provider: this.providerName,
          status: "ok",
        };
      }
      return {
        latency,
        model: this.model,
        ollamaVersion: null,
        online: false,
        provider: this.providerName,
        status: "offline",
      };
    } catch {
      return {
        latency: Math.max(0, Math.round(performance.now() - started)),
        model: this.model,
        ollamaVersion: null,
        online: false,
        provider: this.providerName,
        status: "offline",
      };
    }
  }

  async listModels(): Promise<string[]> {
    const response = await this.request("/api/tags", { method: "GET" }, 15_000);
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new AppError(
        response.status,
        mapOllamaErrorToGracefulMessage(new Error(detail), response.status),
        "OLLAMA_MODELS_UNAVAILABLE",
      );
    }
    const payload = (await response.json()) as OllamaTagsResponse;
    return (payload.models ?? [])
      .map((item) => item.name || item.model || "")
      .filter(Boolean);
  }

  async generateChat(input: LlmGenerateInput): Promise<LlmCompletionDTO> {
    const started = performance.now();
    const response = await this.request("/api/chat", {
      body: JSON.stringify({
        messages: input.messages,
        model: this.model,
        options: { temperature: input.temperature ?? 0.4 },
        stream: false,
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      log("error", "Ollama chat request failed.", {
        detail: detail.slice(0, 500),
        model: this.model,
        status: response.status,
      });
      throw new AppError(
        response.status >= 500 ? 503 : response.status,
        mapOllamaErrorToGracefulMessage(new Error(detail), response.status),
        "OLLAMA_CHAT_FAILED",
      );
    }

    const payload = (await response.json()) as OllamaChatResponse;
    const content = payload.message?.content?.trim() ?? "";
    return {
      content,
      model: payload.model ?? this.model,
      toolCalls: [],
      usage: {
        latencyMs: Math.max(0, Math.round(performance.now() - started)),
        promptTokens: payload.prompt_eval_count ?? 0,
        responseTokens: payload.eval_count ?? 0,
      },
    };
  }

  async generateStream(input: LlmGenerateInput): Promise<LlmCompletionDTO> {
    const started = performance.now();
    const response = await this.request("/api/chat", {
      body: JSON.stringify({
        messages: input.messages,
        model: this.model,
        options: { temperature: input.temperature ?? 0.4 },
        stream: true,
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    if (!response.ok || !response.body) {
      const detail = await response.text().catch(() => "");
      log("error", "Ollama stream request failed.", {
        detail: detail.slice(0, 500),
        model: this.model,
        status: response.status,
      });
      throw new AppError(
        response.status >= 500 ? 503 : response.status,
        mapOllamaErrorToGracefulMessage(new Error(detail), response.status),
        "OLLAMA_STREAM_FAILED",
      );
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let content = "";
    let resolvedModel = this.model;
    let promptTokens = 0;
    let responseTokens = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const payload = JSON.parse(trimmed) as OllamaChatResponse;
          if (payload.model) resolvedModel = payload.model;
          if (typeof payload.prompt_eval_count === "number") promptTokens = payload.prompt_eval_count;
          if (typeof payload.eval_count === "number") responseTokens = payload.eval_count;
          const token = payload.message?.content ?? "";
          if (token) {
            content += token;
            input.onToken?.(token);
          }
        } catch {
          // ignore malformed chunks
        }
      }
    }

    return {
      content: content.trim(),
      model: resolvedModel,
      toolCalls: [],
      usage: {
        latencyMs: Math.max(0, Math.round(performance.now() - started)),
        promptTokens,
        responseTokens,
      },
    };
  }
}

export async function analyzeImageWithOllama(
  provider: OllamaProvider,
  input: { imageBase64: string; prompt: string; temperature?: number },
): Promise<LlmCompletionDTO> {
  const messages: LlmChatMessage[] = [{
    content: input.prompt,
    images: [input.imageBase64],
    role: "user",
  }];
  return provider.generateChat({ messages, temperature: input.temperature ?? 0.2 });
}
