import { CLINICAL_AI_SYSTEM_PROMPT, VISION_ANALYSIS_PROMPT } from "../../ai/prompts/system.prompt";
import type { PromptTemplate } from "./types";

export const PROMPT_CATALOG: PromptTemplate[] = [
  {
    category: "system",
    description: "Base clinical assistant system instructions for local LLM chat.",
    id: "clinical.system.v1",
    template: CLINICAL_AI_SYSTEM_PROMPT,
    variables: [],
    version: "1.0.0",
  },
  {
    category: "vision",
    description: "Vision attachment clinical analysis prompt.",
    id: "clinical.vision.v1",
    template: VISION_ANALYSIS_PROMPT,
    variables: [],
    version: "1.0.0",
  },
  {
    category: "ecg_interpretation",
    description: "Structured ECG interpretation request with measurement context.",
    id: "ecg.interpretation.v1",
    template: `Interpret the following ECG measurements clinically.
Heart rate: {{heartRate}} bpm
Rhythm: {{rhythm}}
PR interval: {{prIntervalMs}} ms
QRS duration: {{qrsDurationMs}} ms
QTc (Bazett): {{qtcBazettMs}} ms
ST deviation: {{stDeviationMm}} mm

Provide a concise clinical interpretation aligned with cardiology standards.
Do not invent values not present in the measurements.`,
    variables: ["heartRate", "rhythm", "prIntervalMs", "qrsDurationMs", "qtcBazettMs", "stDeviationMm"],
    version: "1.0.0",
  },
  {
    category: "reasoning",
    description: "Clinical reasoning layer prompt for differential diagnosis support.",
    id: "clinical.reasoning.v1",
    template: `Given the primary finding "{{primaryFinding}}" with confidence {{confidenceScore}},
list supporting evidence, conflicting evidence, and top differential diagnoses.
Severity: {{severity}}
Urgency: {{urgency}}`,
    variables: ["primaryFinding", "confidenceScore", "severity", "urgency"],
    version: "1.0.0",
  },
];

export function getPromptById(id: string): PromptTemplate | undefined {
  return PROMPT_CATALOG.find((prompt) => prompt.id === id);
}

export function listPromptTemplates(): PromptTemplate[] {
  return [...PROMPT_CATALOG];
}
