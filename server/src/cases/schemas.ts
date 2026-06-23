import { z } from "zod";

export const caseCreateSchema = z.object({
  assignedDoctorId: z.string().optional(),
  clinicalNotes: z.string().trim().max(3000).optional(),
  ecgType: z.string().trim().min(1).max(120),
  finalDiagnosis: z.string().trim().max(500).optional(),
  patientId: z.string().min(1),
  priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  status: z.enum(["pending", "processing", "reviewed", "finalized"]).default("pending"),
});

export const caseUpdateSchema = z.object({
  assignedDoctorId: z.string().nullable().optional(),
  clinicalNotes: z.string().trim().max(3000).nullable().optional(),
  ecgType: z.string().trim().min(1).max(120).optional(),
  finalDiagnosis: z.string().trim().max(500).nullable().optional(),
  priority: z.enum(["low", "medium", "high", "critical"]).optional(),
  status: z.enum(["pending", "processing", "reviewed", "finalized"]).optional(),
});

export const caseListSchema = z.object({
  assignedDoctorId: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  patientId: z.string().optional(),
  priority: z.enum(["low", "medium", "high", "critical"]).optional(),
  q: z.string().trim().optional(),
  status: z.enum(["pending", "processing", "reviewed", "finalized"]).optional(),
});

export const assignDoctorSchema = z.object({
  assignedDoctorId: z.string().min(1),
});

export const updateStatusSchema = z.object({
  status: z.enum(["pending", "processing", "reviewed", "finalized"]),
});
