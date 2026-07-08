import { z } from "zod";

export const generateEnterpriseReportSchema = z.object({
  departmentName: z.string().trim().max(180).optional(),
  reportType: z.enum([
    "PROFESSIONAL_ECG",
    "HOSPITAL",
    "OCCUPATIONAL_ECG",
    "MEDICAL_FITNESS",
    "EMERGENCY",
    "FOLLOW_UP",
    "COMPARISON",
    "AI_DIAGNOSTIC",
    "TEACHING",
  ]).optional(),
  templateCategory: z.enum([
    "HOSPITAL",
    "CLINIC",
    "EMERGENCY",
    "OCCUPATIONAL_MEDICINE",
    "SPORTS_MEDICINE",
    "INSURANCE",
    "PRE_EMPLOYMENT",
    "ANNUAL_CHECKUP",
    "TEACHING",
  ]).optional(),
  templateSlug: z.string().trim().max(120).optional(),
});

export const exportEnterpriseReportSchema = z.object({
  format: z.enum(["PDF", "HTML", "PNG", "JPEG", "JSON", "FHIR", "PRINT", "EMAIL", "CLIPBOARD", "SHARE"]),
});

export const templateQuerySchema = z.object({
  category: z.enum([
    "HOSPITAL",
    "CLINIC",
    "EMERGENCY",
    "OCCUPATIONAL_MEDICINE",
    "SPORTS_MEDICINE",
    "INSURANCE",
    "PRE_EMPLOYMENT",
    "ANNUAL_CHECKUP",
    "TEACHING",
  ]).optional(),
  reportType: z.enum([
    "PROFESSIONAL_ECG",
    "HOSPITAL",
    "OCCUPATIONAL_ECG",
    "MEDICAL_FITNESS",
    "EMERGENCY",
    "FOLLOW_UP",
    "COMPARISON",
    "AI_DIAGNOSTIC",
    "TEACHING",
  ]).optional(),
});
