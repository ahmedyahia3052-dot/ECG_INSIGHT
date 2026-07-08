import { z } from "zod";

export const caseManagementStatusSchema = z.enum([
  "draft",
  "pending_review",
  "reviewed",
  "confirmed",
  "signed",
  "archived",
]);

export const caseManagementUpdateSchema = z.object({
  acquisitionDate: z.coerce.date().optional(),
  assignedDoctorId: z.string().nullable().optional(),
  clinicalComments: z.string().trim().max(3000).nullable().optional(),
  clinicalNotes: z.string().trim().max(3000).nullable().optional(),
  doctorDiagnosis: z.string().trim().max(500).nullable().optional(),
  ecgType: z.string().trim().min(1).max(120).optional(),
  finalDiagnosis: z.string().trim().max(500).nullable().optional(),
  heartRate: z.coerce.number().int().min(0).max(350).nullable().optional(),
  managementStatus: caseManagementStatusSchema.optional(),
  priority: z.enum(["low", "medium", "high", "critical"]).optional(),
  recommendations: z.string().trim().max(3000).nullable().optional(),
  reviewerId: z.string().nullable().optional(),
  rhythm: z.string().trim().max(160).nullable().optional(),
  severity: z.enum(["normal", "abnormal", "critical"]).optional(),
  status: z.enum([
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
  ]).optional(),
  tags: z.array(z.string().trim().min(1).max(64)).max(32).optional(),
});

export const archiveCaseSchema = z.object({
  reason: z.string().trim().max(1000).optional(),
});

export const restoreCaseSchema = z.object({
  managementStatus: caseManagementStatusSchema.optional(),
  reason: z.string().trim().max(1000).optional(),
  status: z.enum([
    "uploaded",
    "under_review",
    "reviewed",
    "approved",
    "finalized",
    "signed",
  ]).optional(),
});

export const assignReviewerSchema = z.object({
  reviewerId: z.string().min(1),
});

export const caseCommentSchema = z.object({
  body: z.string().trim().min(1).max(8000),
  isClinical: z.boolean().default(false),
  mentions: z.array(z.string().trim().min(1)).max(20).default([]),
  parentId: z.string().optional(),
});

export const caseAttachmentSchema = z.object({
  category: z.enum(["ecg_image", "pdf", "clinical_document", "report", "other"]).default("other"),
  checksum: z.string().trim().max(128).optional(),
  fileName: z.string().trim().min(1).max(255),
  metadata: z.unknown().optional(),
  mimeType: z.string().trim().min(1).max(120),
  sizeBytes: z.coerce.number().int().min(0).optional(),
  storagePath: z.string().trim().min(1).max(2000),
});

export const caseVersionSchema = z.object({
  reason: z.string().trim().max(1000).optional(),
});

export const caseLockSchema = z.object({
  resource: z.string().trim().min(1).max(120).default("case"),
  ttlMinutes: z.coerce.number().int().min(1).max(240).default(30),
});

export const caseTagsSchema = z.object({
  tags: z.array(z.string().trim().min(1).max(64)).max(32),
});

export const caseHistoryQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(100),
  offset: z.coerce.number().int().min(0).default(0),
});
