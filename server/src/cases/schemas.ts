import { z } from "zod";

export const caseStatusSchema = z.enum([
  "new",
  "pending",
  "uploaded",
  "processing",
  "ai_completed",
  "under_review",
  "awaiting_second_opinion",
  "escalated",
  "reviewed",
  "approved",
  "rejected",
  "finalized",
  "signed",
  "archived",
]);
const caseCreateStatusSchema = z.preprocess((value) => value === "pending" ? "uploaded" : value, caseStatusSchema);
export const caseSeveritySchema = z.enum(["normal", "abnormal", "critical"]);

export const caseCreateSchema = z.object({
  acquisitionDate: z.coerce.date().optional(),
  assignedDoctorId: z.string().optional(),
  aiModelVersion: z.string().trim().max(240).optional(),
  clinicalNotes: z.string().trim().max(3000).optional(),
  confidence: z.coerce.number().min(0).max(100).optional(),
  confidenceScore: z.coerce.number().min(0).max(100).optional(),
  diagnosis: z.string().trim().max(500).optional(),
  doctorDiagnosis: z.string().trim().max(500).optional(),
  ecgImage: z.string().trim().max(1000).optional(),
  ecgType: z.string().trim().min(1).max(120),
  explainabilityData: z.unknown().optional(),
  finalDiagnosis: z.string().trim().max(500).optional(),
  heartRate: z.coerce.number().int().min(0).max(350).optional(),
  interpretation: z.string().trim().max(8000).optional(),
  patientId: z.string().min(1),
  prInterval: z.coerce.number().int().min(0).max(1000).optional(),
  priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  qrsDuration: z.coerce.number().int().min(0).max(1000).optional(),
  qtInterval: z.coerce.number().int().min(0).max(1000).optional(),
  qtcInterval: z.coerce.number().int().min(0).max(1000).optional(),
  recommendations: z.string().trim().max(3000).optional(),
  rhythm: z.string().trim().max(160).optional(),
  severity: caseSeveritySchema.default("normal"),
  status: caseCreateStatusSchema.default("uploaded"),
});

export const caseUpdateSchema = z.object({
  acquisitionDate: z.coerce.date().optional(),
  assignedDoctorId: z.string().nullable().optional(),
  aiModelVersion: z.string().trim().max(240).nullable().optional(),
  clinicalComments: z.string().trim().max(3000).nullable().optional(),
  clinicalNotes: z.string().trim().max(3000).nullable().optional(),
  confidence: z.coerce.number().min(0).max(100).nullable().optional(),
  confidenceScore: z.coerce.number().min(0).max(100).nullable().optional(),
  diagnosis: z.string().trim().max(500).nullable().optional(),
  doctorDiagnosis: z.string().trim().max(500).nullable().optional(),
  ecgImage: z.string().trim().max(1000).nullable().optional(),
  ecgType: z.string().trim().min(1).max(120).optional(),
  explainabilityData: z.unknown().nullable().optional(),
  finalDiagnosis: z.string().trim().max(500).nullable().optional(),
  heartRate: z.coerce.number().int().min(0).max(350).nullable().optional(),
  interpretation: z.string().trim().max(8000).nullable().optional(),
  prInterval: z.coerce.number().int().min(0).max(1000).nullable().optional(),
  priority: z.enum(["low", "medium", "high", "critical"]).optional(),
  qrsDuration: z.coerce.number().int().min(0).max(1000).nullable().optional(),
  qtInterval: z.coerce.number().int().min(0).max(1000).nullable().optional(),
  qtcInterval: z.coerce.number().int().min(0).max(1000).nullable().optional(),
  recommendations: z.string().trim().max(3000).nullable().optional(),
  rhythm: z.string().trim().max(160).nullable().optional(),
  severity: caseSeveritySchema.optional(),
  status: caseStatusSchema.optional(),
});

export const caseListSchema = z.object({
  assignedDoctorId: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  patientId: z.string().optional(),
  priority: z.enum(["low", "medium", "high", "critical"]).optional(),
  q: z.string().trim().optional(),
  severity: caseSeveritySchema.optional(),
  status: caseStatusSchema.optional(),
});

export const assignDoctorSchema = z.object({
  assignedDoctorId: z.string().min(1),
});

export const updateStatusSchema = z.object({
  status: caseStatusSchema,
});

export const reviewCaseSchema = z.object({
  clinicalComments: z.string().trim().max(3000).optional(),
  doctorDiagnosis: z.string().trim().max(500).optional(),
  recommendations: z.string().trim().max(3000).optional(),
  severity: caseSeveritySchema.optional(),
});

export const rejectCaseSchema = z.object({
  clinicalComments: z.string().trim().max(3000).optional(),
  reason: z.string().trim().max(1000).optional(),
});
