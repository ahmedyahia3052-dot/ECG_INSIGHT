import { env } from "../../../config/env";
import { AppError } from "../../../middleware/error";
import { COPILOT_V3_TOOLS } from "./tools/definitions";

export type ApiMessage = {
  content: string | null;
  role: "assistant" | "system" | "tool" | "user";
  tool_call_id?: string;
  tool_calls?: Array<{ function: { arguments: string; name: string }; id: string; type: "function" }>;
};

export type LlmToolCall = {
  arguments: string;
  id: string;
  name: string;
};

export type LlmCompletionOptions = {
  messages: ApiMessage[];
  onToken?: (token: string) => void;
  toolsEnabled?: boolean;
};

export type LlmCompletionResult = {
  content: string;
  model: string;
  toolCalls: LlmToolCall[];
};

const DEFAULT_MODEL = process.env["COPILOT_LLM_MODEL"] ?? "gpt-4o-mini";
const MAX_TOOL_ROUNDS = 5;

function llmApiKey() {
  return env.AI_MODEL_API_KEY ?? process.env["OPENAI_API_KEY"];
}

function llmBaseUrl() {
  return process.env["COPILOT_LLM_BASE_URL"] ?? "https://api.openai.com/v1";
}

async function mockCompletion(messages: ApiMessage[], onToken?: (token: string) => void): Promise<LlmCompletionResult> {
  const history = messages.filter((item) => item.role === "user" || item.role === "assistant").map((item) => item.content ?? "").join("\n");
  const lastUser = [...messages].reverse().find((item) => item.role === "user")?.content ?? "";

  let text = "Happy to help — tell me a bit more about what you'd like to explore.";
  if (/^hello|hi\b|how are you/i.test(lastUser.trim())) {
    text = "Hello — I'm here to help with cardiology questions, case discussion, or step-by-step teaching whenever you're ready.";
  } else if (/medical student|i am a student/i.test(history) && /learn ecg|teach me ecg/i.test(history)) {
    text = "Great — for ECG we usually start with cardiac anatomy and the conduction system, then paper speed, calibration, rate, rhythm, and axis before morphology.";
  } else if (/medical student|i am a student/i.test(history) && /where should i start|what next|continue/i.test(lastUser)) {
    text = "Start with cardiac anatomy and how depolarization maps to each waveform, then we'll move to rate and rhythm on the next step.";
  } else if (/medical student|i am a student/i.test(lastUser)) {
    text = "Great — tell me what you'd like to focus on. ECG is an excellent place to start if you're early in cardiology.";
  } else if (/learn ecg|teach me ecg/i.test(lastUser)) {
    text = "Perfect — we'll build ECG step by step from fundamentals. Say where you'd like to start and we'll go one concept at a time.";
  } else if (/hypertension|blood pressure/i.test(history) && /how is it diagnosed|diagnosed/i.test(lastUser)) {
    text = "Hypertension is diagnosed with repeated blood pressure readings in a calm setting, often confirmed with ambulatory or home monitoring, plus assessment of end-organ effects.";
  } else if (/hypertension|blood pressure/i.test(history) && /lvh|hypertrophy|why does it/i.test(lastUser)) {
    text = "Chronic pressure overload in hypertension increases afterload, which can lead to left ventricular hypertrophy over time through myocyte remodeling.";
  } else if (/chest pain/i.test(history) && /what would you do next|next step/i.test(lastUser)) {
    text = "For chest pain I'd start with immediate vitals, a 12-lead ECG, and troponin, then assess red flags and decide on observation, serial testing, or urgent referral.";
  } else if (/hypertension|blood pressure/i.test(lastUser)) {
    text = "Hypertension is sustained elevation of blood pressure above guideline thresholds. Diagnosis relies on repeated measurements and cardiovascular risk assessment.";
  } else if (/\baf\b|atrial fibrillation/i.test(lastUser)) {
    text = "Atrial fibrillation is an irregularly irregular supraventricular rhythm. I'd think about rate control, rhythm strategy, stroke risk, and anticoagulation when appropriate.";
  } else if (/ecg|ekg/i.test(lastUser)) {
    text = "For the ECG I'd begin with rate, rhythm, axis, intervals, and ST-T changes, then correlate with symptoms and clinical context.";
  } else if (/thank/i.test(lastUser)) {
    text = "You're welcome — ask anytime.";
  }

  if (onToken) {
    for (const token of text.match(/.{1,14}(\s|$)/g) ?? [text]) {
      onToken(token);
    }
  }
  return { content: text, model: "mock-v3", toolCalls: [] };
}

function parseSseLines(buffer: string, onLine: (line: string) => void) {
  const parts = buffer.split("\n");
  for (const line of parts.slice(0, -1)) onLine(line);
  return parts.at(-1) ?? "";
}

export async function completeWithLlm(options: LlmCompletionOptions): Promise<LlmCompletionResult> {
  const apiKey = llmApiKey();
  if (!apiKey) {
    if (env.NODE_ENV === "test" || process.env["COPILOT_LLM_MOCK"] === "true") {
      return mockCompletion(options.messages, options.onToken);
    }
    throw new AppError(503, "Clinical AI requires an LLM API key (AI_MODEL_API_KEY).", "COPILOT_LLM_UNAVAILABLE");
  }

  const response = await fetch(`${llmBaseUrl()}/chat/completions`, {
    body: JSON.stringify({
      messages: options.messages,
      model: DEFAULT_MODEL,
      stream: true,
      temperature: 0.4,
      tools: options.toolsEnabled === false ? undefined : COPILOT_V3_TOOLS,
    }),
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok || !response.body) {
    const detail = await response.text().catch(() => "");
    throw new AppError(502, `LLM request failed (${response.status}): ${detail.slice(0, 200)}`, "COPILOT_LLM_ERROR");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let content = "";
  const toolCalls = new Map<number, LlmToolCall>();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer = parseSseLines(buffer + decoder.decode(value, { stream: true }), (line) => {
      if (!line.startsWith("data: ")) return;
      const payload = line.slice(6).trim();
      if (payload === "[DONE]") return;
      try {
        const parsed = JSON.parse(payload) as {
          choices?: Array<{
            delta?: {
              content?: string;
              tool_calls?: Array<{ index: number; id?: string; function?: { arguments?: string; name?: string } }>;
            };
          }>;
        };
        const delta = parsed.choices?.[0]?.delta;
        if (delta?.content) {
          content += delta.content;
          options.onToken?.(delta.content);
        }
        for (const call of delta?.tool_calls ?? []) {
          const current = toolCalls.get(call.index) ?? { arguments: "", id: call.id ?? "", name: call.function?.name ?? "" };
          if (call.id) current.id = call.id;
          if (call.function?.name) current.name = call.function.name;
          if (call.function?.arguments) current.arguments += call.function.arguments;
          toolCalls.set(call.index, current);
        }
      } catch {
        // ignore malformed chunks
      }
    });
  }

  return {
    content: content.trim(),
    model: DEFAULT_MODEL,
    toolCalls: [...toolCalls.values()].filter((item) => item.id && item.name),
  };
}

export async function runLlmWithTools(input: {
  messages: ApiMessage[];
  onStatus?: (message: string) => void;
  onToken?: (token: string) => void;
  runTool: (name: string, argsJson: string) => Promise<unknown>;
}): Promise<{ content: string; model: string; toolCallsUsed: string[] }> {
  const messages = [...input.messages];
  const toolCallsUsed: string[] = [];

  for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
    const result = await completeWithLlm({
      messages,
      onToken: input.onToken,
      toolsEnabled: true,
    });

    if (!result.toolCalls.length) {
      return { content: result.content, model: result.model, toolCallsUsed };
    }

    input.onStatus?.("Reviewing clinical information...");
    messages.push({
      content: result.content || null,
      role: "assistant",
      tool_calls: result.toolCalls.map((call) => ({
        function: { arguments: call.arguments, name: call.name },
        id: call.id,
        type: "function" as const,
      })),
    });

    for (const call of result.toolCalls) {
      toolCallsUsed.push(call.name);
      const toolResult = await input.runTool(call.name, call.arguments);
      messages.push({
        content: JSON.stringify(toolResult),
        role: "tool",
        tool_call_id: call.id,
      });
    }
  }

  const final = await completeWithLlm({ messages, onToken: input.onToken, toolsEnabled: false });
  return { content: final.content, model: final.model, toolCallsUsed };
}
