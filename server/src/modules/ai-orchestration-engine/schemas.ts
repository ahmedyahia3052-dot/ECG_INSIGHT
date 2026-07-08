import { z } from "zod";

export const enqueueOrchestrationJobSchema = z.object({
  analysisId: z.string().min(1).optional(),
  caseId: z.string().min(1),
  maxAttempts: z.coerce.number().int().min(1).max(5).optional(),
  pipelineKind: z.enum(["FULL", "ECG_ONLY", "LLM_ONLY"]).optional(),
  providerPreference: z.enum(["AUTO", "OPENAI", "OLLAMA", "RULE_BASED"]).optional(),
  timeoutMs: z.coerce.number().int().min(30_000).max(900_000).optional(),
});

export const orchestrationJobListQuerySchema = z.object({
  caseId: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  status: z
    .enum(["QUEUED", "PROCESSING", "COMPLETED", "FAILED", "CANCELLED", "RETRY_SCHEDULED", "TIMED_OUT"])
    .optional(),
});

export const retryOrchestrationJobSchema = z.object({
  force: z.coerce.boolean().optional(),
});
