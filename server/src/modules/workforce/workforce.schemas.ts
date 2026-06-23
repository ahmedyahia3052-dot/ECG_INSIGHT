import { z } from "zod";

export const organizationBodySchema = z.object({
  address: z.string().trim().max(500).optional(),
  email: z.string().email().optional(),
  logo: z.string().trim().max(500).optional(),
  name: z.string().trim().min(1).max(160),
  phone: z.string().trim().max(40).optional(),
  status: z.enum(["active", "inactive"]).default("active"),
  type: z.enum(["hospital", "clinic", "company", "contractor", "government", "other"]).default("company"),
});

export const organizationUpdateSchema = organizationBodySchema.partial();

export const departmentBodySchema = z.object({
  name: z.string().trim().min(1).max(160),
  organizationId: z.string().trim().min(1),
});

export const departmentUpdateSchema = z.object({
  name: z.string().trim().min(1).max(160).optional(),
});

export const contractorBodySchema = z.object({
  address: z.string().trim().max(500).optional(),
  email: z.string().email().optional(),
  name: z.string().trim().min(1).max(160),
  organizationId: z.string().trim().min(1),
  phone: z.string().trim().max(40).optional(),
  status: z.enum(["active", "inactive"]).default("active"),
});

export const contractorUpdateSchema = contractorBodySchema.omit({ organizationId: true }).partial();

export const employeeBodySchema = z.object({
  confinedSpace: z.boolean().default(false),
  contractorCompanyId: z.string().trim().optional(),
  criticalJob: z.boolean().default(false),
  dateOfBirth: z.coerce.date(),
  departmentId: z.string().trim().min(1),
  drivingDuty: z.boolean().default(false),
  email: z.string().email().optional(),
  employeeId: z.string().trim().min(1).max(80),
  employmentStatus: z.enum(["active", "inactive", "retired", "terminated", "on_leave"]).default("active"),
  emergencyResponder: z.boolean().default(false),
  firefighter: z.boolean().default(false),
  fullName: z.string().trim().min(1).max(180),
  gender: z.enum(["male", "female", "other", "unknown"]).default("unknown"),
  heavyEquipmentOperator: z.boolean().default(false),
  hiringDate: z.coerce.date().optional(),
  jobTitle: z.string().trim().max(160).optional(),
  medicalFitnessStatus: z
    .enum(["fit", "fit_with_restrictions", "temporarily_unfit", "permanently_unfit", "refer_to_cardiologist", "unknown"])
    .default("unknown"),
  nationalId: z.string().trim().min(1).max(80),
  offshoreWorker: z.boolean().default(false),
  organizationId: z.string().trim().min(1),
  phone: z.string().trim().max(40).optional(),
  retirementDate: z.coerce.date().optional(),
  shiftWorker: z.boolean().default(false),
  workAtHeight: z.boolean().default(false),
  workCategory: z.enum(["administrative", "light", "moderate", "heavy", "safety_critical", "offshore", "emergency_response"]).default("moderate"),
});

export const employeeUpdateSchema = employeeBodySchema.partial();

export const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().optional(),
});

export const employeeListQuerySchema = listQuerySchema.extend({
  contractorCompanyId: z.string().trim().optional(),
  departmentId: z.string().trim().optional(),
  employmentStatus: z.enum(["active", "inactive", "retired", "terminated", "on_leave"]).optional(),
  medicalFitnessStatus: z
    .enum(["fit", "fit_with_restrictions", "temporarily_unfit", "permanently_unfit", "refer_to_cardiologist", "unknown"])
    .optional(),
  organizationId: z.string().trim().optional(),
});

export type EmployeeBody = z.infer<typeof employeeBodySchema>;
export type EmployeeUpdateBody = z.infer<typeof employeeUpdateSchema>;
