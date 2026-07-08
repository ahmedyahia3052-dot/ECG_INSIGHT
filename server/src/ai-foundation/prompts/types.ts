export interface PromptTemplate {
  id: string;
  version: string;
  category: "clinical" | "vision" | "ecg_interpretation" | "reasoning" | "system";
  description: string;
  template: string;
  variables: string[];
}

export interface RenderedPrompt {
  id: string;
  version: string;
  content: string;
  hash: string;
}

export interface PromptRenderContext {
  variables?: Record<string, string>;
}
