import { createHash } from "node:crypto";
import { getPromptById, listPromptTemplates } from "./catalog";
import type { PromptRenderContext, PromptTemplate, RenderedPrompt } from "./types";

function substituteVariables(template: string, variables: Record<string, string> = {}) {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => variables[key] ?? "");
}

export function hashPromptContent(content: string): string {
  return createHash("sha256").update(content).digest("hex").slice(0, 16);
}

export function renderPrompt(template: PromptTemplate, context: PromptRenderContext = {}): RenderedPrompt {
  const content = substituteVariables(template.template, context.variables).trim();
  return {
    content,
    hash: hashPromptContent(content),
    id: template.id,
    version: template.version,
  };
}

export function renderPromptById(id: string, context: PromptRenderContext = {}): RenderedPrompt {
  const template = getPromptById(id);
  if (!template) {
    throw new Error(`Prompt template not found: ${id}`);
  }
  return renderPrompt(template, context);
}

export function listManagedPrompts(): PromptTemplate[] {
  return listPromptTemplates();
}

export class PromptManager {
  render(id: string, context: PromptRenderContext = {}): RenderedPrompt {
    return renderPromptById(id, context);
  }

  get(id: string): PromptTemplate | undefined {
    return getPromptById(id);
  }

  list(): PromptTemplate[] {
    return listManagedPrompts();
  }
}

export const promptManager = new PromptManager();
