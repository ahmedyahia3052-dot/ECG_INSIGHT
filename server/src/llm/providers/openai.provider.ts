import { env } from "../../config/env";
import { AppError } from "../../middleware/error";
import { log } from "../../utils/logger";
import { mapOllamaErrorToGracefulMessage } from "../errors";
import { readOpenAiApiKey } from "../llm-config";
import type { LlmCompletionDTO, LlmGenerateInput, LlmHealthDTO } from "../types";
import type { ILlmProvider } from "./llm-provider.interface";

const DEFAULT_MODEL = process.env["OPENAI_MODEL"] ?? "gpt-4o-mini";
const DEFAULT_BASE_URL = process.env["OPENAI_BASE_URL"] ?? "https://api.openai.com/v1";

type OpenAiStreamChunk = {
  choices?: Array<{ delta?: { content?: string } }>;
};

function parseSseLines(buffer: string, onLine: (line: string) => void) {
  const parts = buffer.split("\n");
  for (const line of parts.slice(0, -1)) onLine(line);
  return parts.at(-1) ?? "";
}

export class OpenAiCompatibleProvider implements ILlmProvider {
  readonly providerName = "openai";
  readonly model: string;
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(model = DEFAULT_MODEL, apiKey = readOpenAiApiKey(), baseUrl = DEFAULT_BASE_URL) {
    if (!apiKey) {
      throw new AppError(
        503,
        "OpenAI fallback is configured but OPENAI_API_KEY is missing.",
        "OPENAI_KEY_MISSING",
      );
    }
    this.model = model;
    this.apiKey = apiKey;
    this.baseUrl = baseUrl.replace(/\/+$/, "");
  }

  async healthCheck(): Promise<LlmHealthDTO> {
    return {
      model: this.model,
      provider: this.providerName,
      status: "ok",
    };
  }

  async listModels(): Promise<string[]> {
    return [this.model];
  }

  async generateChat(input: LlmGenerateInput): Promise<LlmCompletionDTO> {
    return this.generateStream(input);
  }

  async generateStream(input: LlmGenerateInput): Promise<LlmCompletionDTO> {
    const started = performance.now();
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      body: JSON.stringify({
        messages: input.messages,
        model: this.model,
        stream: true,
        temperature: input.temperature ?? 0.4,
      }),
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      method: "POST",
    });

    if (!response.ok || !response.body) {
      const detail = await response.text().catch(() => "");
      log("error", "OpenAI chat request failed.", { detail: detail.slice(0, 300), status: response.status });
      throw new AppError(
        response.status >= 500 ? 503 : response.status,
        mapOllamaErrorToGracefulMessage(new Error(detail), response.status),
        "OPENAI_CHAT_FAILED",
      );
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let content = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer = parseSseLines(buffer + decoder.decode(value, { stream: true }), (line) => {
        if (!line.startsWith("data: ")) return;
        const payload = line.slice(6).trim();
        if (payload === "[DONE]") return;
        try {
          const parsed = JSON.parse(payload) as OpenAiStreamChunk;
          const token = parsed.choices?.[0]?.delta?.content ?? "";
          if (token) {
            content += token;
            input.onToken?.(token);
          }
        } catch {
          // ignore malformed chunks
        }
      });
    }

    return {
      content: content.trim(),
      model: this.model,
      toolCalls: [],
      usage: {
        latencyMs: Math.max(0, Math.round(performance.now() - started)),
        promptTokens: 0,
        responseTokens: 0,
      },
    };
  }
}
