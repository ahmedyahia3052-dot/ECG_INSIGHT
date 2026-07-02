import type { LlmCompletionDTO, LlmGenerateInput, LlmHealthDTO } from "../types";

export interface ILlmProvider {
  readonly model: string;
  readonly providerName: string;
  generateChat(input: LlmGenerateInput): Promise<LlmCompletionDTO>;
  generateStream(input: LlmGenerateInput): Promise<LlmCompletionDTO>;
  healthCheck(): Promise<LlmHealthDTO>;
  listModels(): Promise<string[]>;
}
