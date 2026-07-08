import { z } from "zod";

export const clinicalEventTypeSchema = z.enum([
  "CRITICAL_ECG",
  "HIGH_RISK_ECG",
  "PHYSICIAN_REVIEW_REQUIRED",
  "FOLLOW_UP_DUE",
  "FOLLOW_UP_OVERDUE",
  "AI_ANALYSIS_COMPLETED",
  "REPORT_APPROVED",
  "REPORT_REJECTED",
  "REPORT_EXPORTED",
  "CASE_ARCHIVED",
  "CASE_RESTORED",
  "TIMELINE_UPDATED",
]);

export const publishClinicalEventSchema = z.object({
  caseId: z.string().trim().optional(),
  eventType: clinicalEventTypeSchema,
  message: z.string().trim().min(1),
  patientId: z.string().trim().optional(),
  payload: z.record(z.string(), z.unknown()).optional(),
  recipientUserIds: z.array(z.string().trim()).optional(),
  title: z.string().trim().min(1),
});

export const markNotificationsReadSchema = z.object({
  all: z.boolean().optional(),
  notificationIds: z.array(z.string().trim()).optional(),
});

export const eventHistoryQuerySchema = z.object({
  caseId: z.string().trim().optional(),
  eventType: clinicalEventTypeSchema.optional(),
  limit: z.coerce.number().int().min(1).max(200).default(100),
  patientId: z.string().trim().optional(),
});

export const notificationListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  page: z.coerce.number().int().min(1).default(1),
  read: z.enum(["true", "false"]).optional(),
});
