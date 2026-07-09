import { z } from "zod";

export const enqueueDigitizationJobSchema = z.object({
  caseId: z.string().min(1),
  ecgFileId: z.string().min(1).optional(),
  maxAttempts: z.coerce.number().int().min(1).max(10).optional(),
  processingJobId: z.string().min(1).optional(),
});

export const digitizationJobListQuerySchema = z.object({
  caseId: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z
    .enum(["QUEUED", "PROCESSING", "COMPLETED", "FAILED", "CANCELLED", "RETRY_SCHEDULED"])
    .optional(),
});

export const retryDigitizationJobSchema = z.object({
  force: z.boolean().default(false),
});
