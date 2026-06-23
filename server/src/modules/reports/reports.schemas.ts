import { z } from "zod";

export const reportUpdateSchema = z.object({
  clinicalIndication: z.string().trim().max(2000).optional(),
  differentialDiagnosis: z.array(z.string().trim().min(1).max(300)).optional(),
  finalPhysicianImpression: z.string().trim().max(3000).optional(),
  recommendations: z.array(z.string().trim().min(1).max(500)).optional(),
  referringPhysician: z.string().trim().max(160).optional(),
  rhythmInterpretation: z.string().trim().max(2000).optional(),
  severityClassification: z.string().trim().max(120).optional(),
  urgentActions: z.array(z.string().trim().min(1).max(500)).optional(),
});

export const reportStatusSchema = z.object({
  status: z.enum(["draft", "under_review"]),
});

export const drawnSignatureSchema = z.object({
  dataUrl: z.string().trim().min(1),
});

export const emailReportSchema = z.object({
  message: z.string().trim().max(2000).optional(),
  recipient: z.string().email(),
});

export const physicianProfileSchema = z.object({
  licenseNumber: z.string().trim().max(120).optional(),
  specialization: z.string().trim().max(160).optional(),
});
