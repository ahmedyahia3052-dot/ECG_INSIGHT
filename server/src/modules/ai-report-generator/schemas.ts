import { z } from "zod";

export const generateClinicalReportSchema = z.object({
  caseId: z.string().trim().min(1),
  clinicalIndication: z.string().trim().max(2000).optional(),
});

export const regenerateClinicalReportSchema = z.object({
  clinicalIndication: z.string().trim().max(2000).optional(),
});
