import { z } from "zod";

export const clinicalLifecycleSchema = z.enum([
  "draft",
  "uploaded",
  "processing",
  "pending_review",
  "reviewed",
  "finalized",
  "archived",
]);

export const clinicalNoteTypeSchema = z.enum(["clinical", "doctor", "internal"]);

export const paginationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export const lifecycleTransitionSchema = z.object({
  lifecycle: clinicalLifecycleSchema,
  reason: z.string().trim().max(1000).optional(),
});

export const assignReviewerSchema = z.object({
  reviewerId: z.string().min(1),
});

export const reassignCaseSchema = z.object({
  reason: z.string().trim().max(1000).optional(),
  reviewerId: z.string().min(1),
});

export const priorityUpdateSchema = z.object({
  priority: z.enum(["low", "medium", "high", "critical"]),
  reason: z.string().trim().max(1000).optional(),
});

export const criticalFlagSchema = z.object({
  critical: z.boolean(),
  reason: z.string().trim().max(1000).optional(),
});

export const labelsUpdateSchema = z.object({
  labels: z.array(z.string().trim().min(1).max(64)).max(32),
});

export const clinicalNoteSchema = z.object({
  body: z.string().trim().min(1).max(8000),
  mentions: z.array(z.string().trim().min(1)).max(20).default([]),
  noteType: clinicalNoteTypeSchema.default("doctor"),
  parentId: z.string().optional(),
});

export const caseAttachmentSchema = z.object({
  category: z.enum(["ecg_image", "pdf", "clinical_document", "report", "other"]).default("other"),
  checksum: z.string().trim().max(128).optional(),
  fileName: z.string().trim().min(1).max(255),
  metadata: z.unknown().optional(),
  mimeType: z.string().trim().min(1).max(120),
  sizeBytes: z.coerce.number().int().min(0).optional(),
  storagePath: z.string().trim().min(1).max(2048),
});

export const caseLockSchema = z.object({
  resource: z.string().trim().min(1).max(64).default("case"),
  ttlMinutes: z.coerce.number().int().min(1).max(240).default(30),
});

export const caseVersionSchema = z.object({
  reason: z.string().trim().max(1000).optional(),
});

export const archiveCaseSchema = z.object({
  reason: z.string().trim().max(1000).optional(),
});

export const restoreCaseSchema = z.object({
  lifecycle: clinicalLifecycleSchema.optional(),
  reason: z.string().trim().max(1000).optional(),
});
