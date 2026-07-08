import { z } from "zod";

export const diagnosticCasePipelineOptionsSchema = z.object({
  clinicalIndication: z.string().optional(),
  digitize: z.boolean().optional(),
  generateAiReport: z.boolean().optional(),
  generateEnterpriseReport: z.boolean().optional(),
  persist: z.boolean().optional(),
});

export const diagnosticCasePipelineRequestSchema = z.object({
  options: diagnosticCasePipelineOptionsSchema.optional(),
});

export const diagnosticPipelineStageSchema = z.object({
  durationMs: z.number().nonnegative(),
  stage: z.enum([
    "image_processing",
    "lead_detection",
    "signal_digitization",
    "measurement_engine",
    "clinical_knowledge_engine",
    "diagnostic_engine",
    "differential_diagnosis",
    "clinical_recommendation",
    "ai_report_generation",
    "enterprise_report",
  ]),
  status: z.enum(["pending", "completed", "skipped", "failed"]),
});

export const diagnosticPipelineResultSchema = z.object({
  confidence: z.number().min(0).max(1),
  performanceMs: z.number().nonnegative(),
  pipelineVersion: z.literal("sprint61-v1"),
  stages: z.array(diagnosticPipelineStageSchema),
});
