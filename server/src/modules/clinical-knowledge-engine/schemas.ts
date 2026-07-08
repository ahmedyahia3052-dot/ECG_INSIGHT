import { z } from "zod";

export const knowledgeQuerySchema = z.object({
  category: z.enum([
    "RHYTHM",
    "ARRHYTHMIA",
    "CONDUCTION",
    "ISCHEMIA",
    "ELECTROLYTE",
    "HYPERTROPHY",
    "CHANNELOPATHY",
    "OTHER",
  ]).optional(),
  emergencyLevel: z.enum(["ROUTINE", "URGENT", "EMERGENT", "CRITICAL"]).optional(),
  q: z.string().trim().max(120).optional(),
  severity: z.enum(["NORMAL", "MINOR", "ABNORMAL", "URGENT", "CRITICAL"]).optional(),
});
