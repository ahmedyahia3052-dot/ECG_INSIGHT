import { z } from "zod";

const ruleConditionSchema = z.object({
  boolValue: z.boolean().optional(),
  field: z.enum([
    "QT_INTERVAL",
    "QTC_INTERVAL",
    "HEART_RATE",
    "QRS_DURATION",
    "PR_INTERVAL",
    "ST_DEVIATION",
    "ST_ELEVATION",
    "RISK_SCORE",
    "CLINICAL_PRIORITY",
    "PVC_COUNT",
    "AF_DETECTED",
    "BBB_DETECTED",
  ]),
  groupId: z.string().trim().min(1).max(64).optional(),
  groupLogic: z.enum(["AND", "OR"]).optional(),
  operator: z.enum(["GT", "GTE", "LT", "LTE", "EQ", "NEQ", "CONTAINS", "IS_TRUE", "IS_FALSE"]),
  sortOrder: z.number().int().min(0).optional(),
  stringValue: z.string().trim().max(120).optional(),
  threshold: z.number().optional(),
});

const ruleActionSchema = z.object({
  actionType: z.enum([
    "GENERATE_ALERT",
    "CREATE_RECOMMENDATION",
    "SCHEDULE_FOLLOW_UP",
    "NOTIFY_PHYSICIAN",
    "NOTIFY_ADMIN",
    "ESCALATE_CASE",
    "MARK_CRITICAL",
    "REQUIRE_MANUAL_REVIEW",
  ]),
  payload: z.record(z.string(), z.unknown()).optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export const createClinicalRuleSchema = z.object({
  actions: z.array(ruleActionSchema).min(1),
  category: z.string().trim().min(1).max(80),
  conditionRootLogic: z.enum(["AND", "OR"]).optional(),
  conditions: z.array(ruleConditionSchema).min(1),
  description: z.string().trim().min(1).max(2000),
  enabled: z.boolean().optional(),
  name: z.string().trim().min(1).max(160),
  organizationId: z.string().trim().min(1).optional(),
  priority: z.number().int().min(1).max(1000).optional(),
  ruleKey: z.string().trim().min(1).max(120).regex(/^[a-z0-9-]+$/),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]).optional(),
});

export const updateClinicalRuleSchema = createClinicalRuleSchema
  .omit({ ruleKey: true })
  .partial()
  .extend({ changeNotes: z.string().trim().max(500).optional() });

export const testRulesSchema = z.object({
  caseId: z.string().trim().min(1).optional(),
  context: z
    .object({
      afDetected: z.boolean().optional(),
      bbbDetected: z.boolean().optional(),
      clinicalPriority: z.string().optional(),
      heartRate: z.number().optional(),
      prIntervalMs: z.number().optional(),
      pvcCount: z.number().optional(),
      qrsDurationMs: z.number().optional(),
      qtIntervalMs: z.number().optional(),
      qtcBazettMs: z.number().optional(),
      riskScore: z.number().optional(),
      stDeviationMm: z.number().optional(),
      stElevationMm: z.number().optional(),
    })
    .optional(),
  persist: z.boolean().optional(),
  ruleIds: z.array(z.string().trim().min(1)).optional(),
}).refine((value) => Boolean(value.caseId || value.context), {
  message: "Either caseId or context is required.",
});

export const rulesQuerySchema = z.object({
  category: z.string().trim().max(80).optional(),
  enabled: z.enum(["true", "false"]).optional(),
});

export const historyQuerySchema = z.object({
  caseId: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
  ruleId: z.string().trim().min(1).optional(),
});
