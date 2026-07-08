import { z } from "zod";

export const createDraftReportSchema = z.object({
  caseId: z.string().min(1),
  clinicalIndication: z.string().trim().max(2000).optional(),
  reportType: z
    .enum([
      "PROFESSIONAL_ECG",
      "HOSPITAL",
      "OCCUPATIONAL_ECG",
      "MEDICAL_FITNESS",
      "EMERGENCY",
      "FOLLOW_UP",
      "COMPARISON",
      "AI_DIAGNOSTIC",
      "TEACHING",
    ])
    .optional(),
  templateSlug: z.string().min(1).optional(),
});

export const updateDraftReportSchema = z.object({
  aiFindings: z.string().trim().max(5000).optional(),
  clinicalIndication: z.string().trim().max(2000).optional(),
  differentialDiagnosis: z.array(z.string().trim().min(1).max(300)).optional(),
  ecgMeasurements: z.record(z.string(), z.unknown()).optional(),
  finalPhysicianImpression: z.string().trim().max(3000).optional(),
  recommendations: z.array(z.string().trim().min(1).max(500)).optional(),
  rhythmInterpretation: z.string().trim().max(2000).optional(),
  severityClassification: z.string().trim().max(120).optional(),
  urgentActions: z.array(z.string().trim().min(1).max(500)).optional(),
});

export type UpdateDraftReportInput = z.infer<typeof updateDraftReportSchema>;

export const reportListQuerySchema = z.object({
  caseId: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  patientId: z.string().optional(),
  status: z.enum(["draft", "under_review", "finalized", "signed", "archived"]).optional(),
});

export const signReportSchema = z.object({
  signaturePath: z.string().trim().min(1).optional(),
});

export const verifyReportQuerySchema = z.object({
  token: z.string().optional(),
});
