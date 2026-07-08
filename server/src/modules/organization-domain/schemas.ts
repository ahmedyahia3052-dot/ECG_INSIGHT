import { z } from "zod";
import { listQuerySchema } from "./list-query";

export const organizationBodySchema = z.object({
  address: z.string().optional(),
  aiQuotaMonthly: z.number().int().positive().optional(),
  brandColor: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  email: z.string().email().optional(),
  language: z.string().optional(),
  licenseNumber: z.string().optional(),
  logo: z.string().url().optional(),
  name: z.string().min(2),
  phone: z.string().optional(),
  storageQuotaMb: z.number().int().positive().optional(),
  taxNumber: z.string().optional(),
  timezone: z.string().optional(),
  type: z.enum([
    "HOSPITAL", "CLINIC", "MEDICAL_CENTER", "OCCUPATIONAL_HEALTH_CENTER", "COMPANY",
    "INSURANCE_PROVIDER", "UNIVERSITY", "RESEARCH_CENTER", "CONTRACTOR", "GOVERNMENT", "OTHER",
  ]),
});

export const organizationUpdateSchema = organizationBodySchema.partial().extend({
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

export const departmentBodySchema = z.object({
  category: z.enum([
    "CARDIOLOGY", "EMERGENCY", "ICU", "CCU", "INTERNAL_MEDICINE",
    "OCCUPATIONAL_MEDICINE", "OUTPATIENT_CLINIC", "ADMINISTRATION", "CUSTOM",
  ]).optional(),
  companyId: z.string().optional(),
  description: z.string().optional(),
  name: z.string().min(2),
});

export const departmentUpdateSchema = departmentBodySchema.partial();

export const employeeBodySchema = z.object({
  companyId: z.string().optional(),
  contractorCompanyId: z.string().optional(),
  dateOfBirth: z.string(),
  departmentId: z.string(),
  email: z.string().email().optional(),
  employeeId: z.string().min(1),
  fullName: z.string().min(2),
  gender: z.enum(["male", "female", "other", "unknown"]).optional(),
  jobTitle: z.string().optional(),
  nationalId: z.string().min(1),
  phone: z.string().optional(),
  workLocation: z.string().optional(),
});

export const employeeUpdateSchema = employeeBodySchema.partial().omit({ employeeId: true, nationalId: true });

export const patientBodySchema = z.object({
  dateOfBirth: z.string(),
  departmentId: z.string().optional(),
  email: z.string().email().optional(),
  employeeId: z.string().optional(),
  firstName: z.string().min(1),
  gender: z.enum(["male", "female", "other", "unknown"]).optional(),
  lastName: z.string().min(1),
  medicalRecordNumber: z.string().min(1),
  middleName: z.string().optional(),
  organizationId: z.string().optional(),
  phone: z.string().optional(),
});

export const patientUpdateSchema = patientBodySchema.partial();

export const doctorUpdateSchema = z.object({
  department: z.string().optional(),
  institution: z.string().optional(),
  licenseNumber: z.string().optional(),
  specialization: z.string().optional(),
});

export const ecgCaseBodySchema = z.object({
  acquisitionDate: z.string().optional(),
  ecgType: z.string().min(1),
  patientId: z.string(),
  priority: z.enum(["low", "medium", "high", "critical"]).optional(),
});

export const ecgCaseUpdateSchema = z.object({
  assignedDoctorId: z.string().nullable().optional(),
  clinicalComments: z.string().optional(),
  doctorDiagnosis: z.string().optional(),
  finalDiagnosis: z.string().optional(),
  priority: z.enum(["low", "medium", "high", "critical"]).optional(),
  status: z.string().optional(),
});

export const orgDomainListSchema = listQuerySchema;
