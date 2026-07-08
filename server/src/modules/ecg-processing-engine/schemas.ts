import { z } from "zod";

export const enqueueProcessingJobSchema = z.object({
  caseId: z.string().min(1),
  ecgFileId: z.string().min(1).optional(),
  maxAttempts: z.coerce.number().int().min(1).max(5).optional(),
});

export const jobListQuerySchema = z.object({
  caseId: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  status: z.enum(["QUEUED", "PROCESSING", "COMPLETED", "FAILED", "CANCELLED", "RETRY_SCHEDULED"]).optional(),
});

export const retryJobSchema = z.object({
  force: z.coerce.boolean().optional(),
});
