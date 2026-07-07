import { z } from "zod";

export const micDiagnosisQuerySchema = z.object({
  category: z.enum(["arrhythmia", "conduction", "electrolyte", "hypertrophy", "ischemia", "other", "rhythm"]).optional(),
  tag: z.string().optional(),
});

export const micGuidelineQuerySchema = z.object({
  organization: z.enum(["ACC/AHA", "AHA", "ESC", "OTHER"]).optional(),
  category: z.enum(["arrhythmia", "conduction", "electrolyte", "hypertrophy", "ischemia", "other", "rhythm"]).optional(),
});

export const micDifferentialRequestSchema = z.object({
  finding: z.string().min(1),
  limit: z.number().int().min(1).max(10).optional(),
});

export const micReferenceParamSchema = z.object({
  parameter: z.string().min(1),
});
