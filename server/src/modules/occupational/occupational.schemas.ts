import { z } from "zod";

export const occupationalRiskSchema = z.object({
  customProfileName: z.string().trim().max(160).optional(),
  diabetes: z.boolean().default(false),
  dyslipidemia: z.boolean().default(false),
  familyHistory: z.boolean().default(false),
  hypertension: z.boolean().default(false),
  obesity: z.boolean().default(false),
  occupationalExposure: z.record(z.string(), z.unknown()).optional(),
  profileType: z.enum([
    "driver",
    "crane_operator",
    "heavy_equipment_operator",
    "work_at_heights",
    "confined_spaces",
    "office_worker",
    "food_handler",
    "custom",
  ]).default("office_worker"),
  previousMI: z.boolean().default(false),
  previousStroke: z.boolean().default(false),
  smoking: z.boolean().default(false),
});

export const assessmentCreateSchema = z.object({
  employeeId: z.string().trim().min(1),
  physicianJustification: z.string().trim().max(3000).optional(),
  reviewDate: z.coerce.date().optional(),
});

export const restrictionSchema = z.object({
  active: z.boolean().default(true),
  assessmentId: z.string().trim().optional(),
  description: z.string().trim().min(1).max(1000),
  employeeId: z.string().trim().min(1),
  endsAt: z.coerce.date().optional(),
  startsAt: z.coerce.date().optional(),
  type: z.enum([
    "no_work_at_height",
    "no_driving",
    "no_confined_space",
    "no_night_shifts",
    "no_offshore_duty",
    "sedentary_work_only",
    "no_heavy_equipment",
    "no_emergency_response",
  ]),
});

export const returnToWorkSchema = z.object({
  assessmentId: z.string().trim().optional(),
  decision: z.enum([
    "fit_for_work",
    "fit_with_restrictions",
    "temporarily_unfit",
    "permanently_unfit",
    "specialist_review_required",
  ]),
  employeeId: z.string().trim().min(1),
  physicianJustification: z.string().trim().min(1).max(3000),
  reviewDate: z.coerce.date().optional(),
});

export const listQuerySchema = z.object({
  employeeId: z.string().trim().optional(),
  organizationId: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
