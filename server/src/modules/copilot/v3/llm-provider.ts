import { LlmClient, type CopilotApiMessage } from "../../../llm/llm-client";
import { shouldForceMockProvider } from "../../../llm/llm-registry";
import { AppError } from "../../../middleware/error";
import { COPILOT_V3_TOOLS } from "./tools/definitions";

export type ApiMessage = CopilotApiMessage;

export type LlmToolCall = {
  arguments: string;
  id: string;
  name: string;
};

export type LlmCompletionOptions = {
  messages: ApiMessage[];
  onStatus?: (message: string) => void;
  onToken?: (token: string) => void;
  toolsEnabled?: boolean;
};

export type LlmCompletionResult = {
  content: string;
  model: string;
  toolCalls: LlmToolCall[];
};

const MAX_TOOL_ROUNDS = 5;

export async function completeWithLlm(options: LlmCompletionOptions & { allowedTools?: typeof COPILOT_V3_TOOLS }): Promise<LlmCompletionResult> {
  if (options.toolsEnabled !== false && options.allowedTools?.length) {
    // Knowledge is injected upstream; local Ollama does not expose tool-call streaming.
    void options.allowedTools;
  }

  try {
    const result = await LlmClient.generateStream(options.messages, {
      onStatus: options.onStatus,
      onToken: options.onToken,
    });
    return { content: result.content, model: result.model, toolCalls: result.toolCalls };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(503, "Model unavailable.", "LOCAL_LLM_UNAVAILABLE");
  }
}

export async function runLlmWithTools(input: {
  allowedTools?: typeof COPILOT_V3_TOOLS;
  messages: ApiMessage[];
  onStatus?: (message: string) => void;
  onToken?: (token: string) => void;
  runTool: (name: string, argsJson: string) => Promise<unknown>;
  toolsEnabled?: boolean;
}): Promise<{ content: string; model: string; toolCallsUsed: string[] }> {
  const toolsEnabled = !shouldForceMockProvider() ? false : input.toolsEnabled !== false && (input.allowedTools?.length ?? 1) > 0;
  const messages = [...input.messages];
  const toolCallsUsed: string[] = [];

  for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
    const result = await completeWithLlm({
      allowedTools: input.allowedTools,
      messages,
      onStatus: input.onStatus,
      onToken: input.onToken,
      toolsEnabled,
    });

    if (!result.toolCalls.length || !toolsEnabled) {
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

  const final = await completeWithLlm({ messages, onStatus: input.onStatus, onToken: input.onToken, toolsEnabled: false });
  return { content: final.content, model: final.model, toolCallsUsed };
}
