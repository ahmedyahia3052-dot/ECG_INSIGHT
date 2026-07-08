import { z } from "zod";

export const organizationCreateSchema = z.object({
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
  subscriptionTier: z.enum(["FREE", "BASIC", "PROFESSIONAL", "ENTERPRISE", "LIFETIME", "CLINIC", "HOSPITAL", "UNLIMITED"]).optional(),
  taxNumber: z.string().optional(),
  timezone: z.string().optional(),
  type: z.enum([
    "HOSPITAL", "CLINIC", "MEDICAL_CENTER", "OCCUPATIONAL_HEALTH_CENTER", "COMPANY",
    "INSURANCE_PROVIDER", "UNIVERSITY", "RESEARCH_CENTER", "CONTRACTOR", "GOVERNMENT", "OTHER",
  ]),
});

export const organizationUpdateSchema = organizationCreateSchema.partial().omit({ type: true }).extend({
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  type: organizationCreateSchema.shape.type.optional(),
});

export const departmentCreateSchema = z.object({
  category: z.enum([
    "CARDIOLOGY", "EMERGENCY", "ICU", "CCU", "INTERNAL_MEDICINE",
    "OCCUPATIONAL_MEDICINE", "OUTPATIENT_CLINIC", "ADMINISTRATION", "CUSTOM",
  ]).optional(),
  companyId: z.string().optional(),
  description: z.string().optional(),
  name: z.string().min(2),
});

export const branchCreateSchema = z.object({
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  departmentId: z.string().optional(),
  gpsLatitude: z.number().optional(),
  gpsLongitude: z.number().optional(),
  managerUserId: z.string().optional(),
  name: z.string().min(2),
});

export const memberInviteSchema = z.object({
  branchId: z.string().optional(),
  departmentId: z.string().optional(),
  enterpriseRoleId: z.string().optional(),
  userId: z.string(),
});

export const brandingUpdateSchema = z.object({
  emailBranding: z.record(z.string(), z.unknown()).optional(),
  faviconUrl: z.string().url().optional(),
  loginBranding: z.record(z.string(), z.unknown()).optional(),
  logoUrl: z.string().url().optional(),
  pdfFooterHtml: z.string().optional(),
  pdfHeaderHtml: z.string().optional(),
  primaryColor: z.string().optional(),
  reportFooter: z.string().optional(),
  reportHeader: z.string().optional(),
  secondaryColor: z.string().optional(),
});

export const subscriptionUpdateSchema = z.object({
  tier: z.enum(["FREE", "BASIC", "PROFESSIONAL", "ENTERPRISE", "LIFETIME", "CLINIC", "HOSPITAL", "UNLIMITED"]),
});

export const customRoleSchema = z.object({
  description: z.string().optional(),
  name: z.string().min(2),
  permissions: z.array(z.string()).min(1),
  slug: z.string().min(2),
});

export const notificationCreateSchema = z.object({
  body: z.string().min(1),
  category: z.enum(["SYSTEM", "SECURITY", "CLINICAL", "AI", "BILLING", "LICENSE", "MAINTENANCE"]),
  title: z.string().min(1),
  userId: z.string().optional(),
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
  search: z.string().optional(),
});
