import { z } from "zod";

/** EMKP API validation schemas — design only, not wired to Express */

export const knowledgeCategorySchema = z.enum([
  "normal", "rhythm", "conduction", "ischemia", "electrolyte",
  "hypertrophy", "channelopathy", "structural", "device", "other",
]);

export const diseaseQuerySchema = z.object({
  category: knowledgeCategorySchema.optional(),
  query: z.string().trim().optional(),
});

export const diseaseCodeParamSchema = z.object({
  code: z.string().trim().min(1).max(32),
});

export const ruleIdParamSchema = z.object({
  ruleId: z.string().trim().regex(/^EMKP-R-\d{3}$/),
});

export const terminologyQuerySchema = z.object({
  q: z.string().trim().min(1).optional(),
});

export const guidelineReferenceSchema = z.object({
  organization: z.enum(["ESC", "AHA", "ACC", "ACC/AHA", "HRS", "WHF", "UDMI", "IEC", "OTHER"]),
  documentId: z.string(),
  title: z.string(),
  section: z.string().optional(),
  year: z.number().int().optional(),
  url: z.string().url().optional(),
  evidenceLevel: z.enum(["A", "B", "C", "D", "expert_consensus"]).optional(),
});

export const diseaseEntrySchema = z.object({
  code: z.string(),
  name: z.string(),
  category: knowledgeCategorySchema,
  definition: z.string(),
  diagnosticCriteria: z.array(z.string()),
  ecgCharacteristics: z.array(z.string()),
  measurements: z.array(z.string()),
  differentialDiagnosis: z.array(z.string()),
  pitfalls: z.array(z.string()),
  severity: z.enum(["normal", "minor", "abnormal", "urgent", "critical"]),
  urgency: z.enum(["routine", "urgent", "emergent", "critical"]),
  riskCategory: z.enum(["critical", "high", "intermediate", "low", "benign"]),
  clinicalNotes: z.array(z.string()),
  guidelineReferences: z.array(guidelineReferenceSchema),
});

export const clinicalRuleSchema = z.object({
  ruleId: z.string(),
  diagnosisCode: z.string(),
  definition: z.string(),
  diagnosticCriteria: z.array(z.string()),
  requiredFindings: z.array(z.string()),
  supportingFindings: z.array(z.string()),
  exclusionFindings: z.array(z.string()),
  severity: z.enum(["normal", "minor", "abnormal", "urgent", "critical"]),
  clinicalSignificance: z.string(),
  riskLevel: z.enum(["critical", "high", "intermediate", "low", "benign"]),
  urgency: z.enum(["routine", "urgent", "emergent", "critical"]),
  recommendedAction: z.array(z.string()),
  evidenceLevel: z.enum(["A", "B", "C", "D", "expert_consensus"]),
  confidence: z.enum(["definitive", "high", "moderate", "low", "indeterminate"]),
  guidelineRefs: z.array(guidelineReferenceSchema),
});

export const validationResultSchema = z.object({
  ok: z.boolean(),
  errors: z.array(z.string()),
  warnings: z.array(z.string()),
  stats: z.record(z.string(), z.number()),
});
