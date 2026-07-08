import { z } from "zod";
import { ECG_DIAGNOSES } from "../../ai/domain";

export const structuredEcgOutputSchema = z.object({
  clinicalSeverity: z.enum(["CRITICAL", "HIGH", "LOW", "MODERATE"]),
  confidenceScore: z.number().min(0).max(1),
  detectedAbnormalities: z.array(z.string()),
  heartRate: z.number().min(0).max(300),
  interpretation: z.string().min(1),
  primaryDiagnosis: z.enum(ECG_DIAGNOSES),
  recommendations: z.array(z.string()),
  rhythm: z.string().min(1),
  urgentActions: z.array(z.string()),
});

export const structuredLlmOutputSchema = z.object({
  content: z.string().min(1),
  model: z.string().min(1),
});

export const inferenceRequestSchema = z.object({
  cacheKey: z.string().optional(),
  kind: z.enum(["ecg_analysis", "llm_chat", "clinical_reasoning", "ecg_interpretation"]),
  promptId: z.string().optional(),
  promptVariables: z.record(z.string(), z.string()).optional(),
  skipCache: z.boolean().optional(),
});

export const promptRenderRequestSchema = z.object({
  promptId: z.string().min(1),
  variables: z.record(z.string(), z.string()).optional(),
});

export type StructuredEcgOutput = z.infer<typeof structuredEcgOutputSchema>;
export type StructuredLlmOutput = z.infer<typeof structuredLlmOutputSchema>;
