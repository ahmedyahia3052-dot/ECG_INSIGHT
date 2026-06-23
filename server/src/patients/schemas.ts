import { z } from "zod";

export const patientBodySchema = z.object({
  address: z.string().trim().max(500).optional(),
  allergies: z.string().trim().max(1000).optional(),
  contractorId: z.string().trim().optional(),
  dateOfBirth: z.coerce.date(),
  departmentId: z.string().trim().optional(),
  diabetes: z.boolean().optional(),
  dyslipidemia: z.boolean().optional(),
  email: z.string().email().optional(),
  employeeId: z.string().trim().max(80).optional(),
  emergencyContact: z.string().trim().max(250).optional(),
  familyHistory: z.string().trim().max(2000).optional(),
  firstName: z.string().trim().min(1).max(80),
  gender: z.enum(["male", "female", "other", "unknown"]).default("unknown"),
  hireDate: z.coerce.date().optional(),
  hypertension: z.boolean().optional(),
  lastName: z.string().trim().min(1).max(80),
  medicalHistory: z.string().trim().max(3000).optional(),
  medicalRecordNumber: z.string().trim().min(1).max(80),
  medications: z.string().trim().max(2000).optional(),
  nationalId: z.string().trim().max(80).optional(),
  notes: z.string().trim().max(3000).optional(),
  obesity: z.boolean().optional(),
  occupation: z.string().trim().max(160).optional(),
  organizationId: z.string().trim().optional(),
  phone: z.string().trim().max(40).optional(),
  smokingStatus: z.enum(["never", "former", "current", "unknown"]).optional(),
});

export const patientUpdateSchema = patientBodySchema.partial();

export const patientListSchema = z.object({
  archived: z.enum(["true", "false", "all"]).default("false"),
  contractorId: z.string().trim().optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  diagnosis: z.string().trim().optional(),
  employeeId: z.string().trim().optional(),
  gender: z.enum(["male", "female", "other", "unknown"]).optional(),
  nationalId: z.string().trim().optional(),
  organizationId: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().optional(),
});
