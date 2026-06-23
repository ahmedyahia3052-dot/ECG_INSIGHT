import { z } from "zod";

export const aiHistorySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  severity: z.enum(["normal", "mild", "moderate", "severe", "critical"]).optional(),
  status: z.enum(["queued", "processing", "completed", "failed"]).optional(),
});
