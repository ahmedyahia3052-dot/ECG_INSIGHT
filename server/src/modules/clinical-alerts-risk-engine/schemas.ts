import { z } from "zod";

export const caseIdParamSchema = z.object({
  caseId: z.string().trim().min(1),
});
