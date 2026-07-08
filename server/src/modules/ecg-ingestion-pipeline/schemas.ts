import { z } from "zod";
import { EcgIngestionJobStatus, EcgIngestionPriority } from "@prisma/client";

export const enqueueIngestionJobSchema = z.object({
  caseId: z.string().min(1),
  ecgFileId: z.string().min(1),
  maxAttempts: z.number().int().min(1).max(10).optional(),
  priority: z.nativeEnum(EcgIngestionPriority).optional(),
  timeoutMs: z.number().int().min(30_000).max(3_600_000).optional(),
});

export const ingestionJobListQuerySchema = z.object({
  caseId: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  status: z.nativeEnum(EcgIngestionJobStatus).optional(),
});

export const resumeIngestionJobSchema = z.object({
  resumeFromStage: z
    .enum([
      "UPLOAD",
      "VALIDATE",
      "STORAGE",
      "QUEUE",
      "PROCESSING",
      "AI_ORCHESTRATION",
      "RESULTS",
      "PERSIST",
      "NOTIFICATION",
      "COMPLETE",
    ])
    .optional(),
});

export const retryIngestionJobSchema = z.object({
  force: z.boolean().optional(),
});
