import { z } from "zod";

export const organizationSchema = z.object({
  address: z.string().trim().max(500).optional(),
  email: z.string().email().optional(),
  logo: z.string().trim().max(500).optional(),
  name: z.string().trim().min(1).max(160),
  phone: z.string().trim().max(40).optional(),
  status: z.enum(["active", "inactive"]).default("active"),
  type: z.enum(["hospital", "clinic", "company", "contractor", "government", "other"]).default("company"),
});

export const organizationUpdateSchema = organizationSchema.partial();

export const childUnitSchema = z.object({
  name: z.string().trim().min(1).max(160),
});

export const cardiacHistorySchema = z.object({
  arrhythmia: z.boolean().default(false),
  congenitalHeartDisease: z.boolean().default(false),
  coronaryArteryDisease: z.boolean().default(false),
  heartFailure: z.boolean().default(false),
  myocardialInfarctionHistory: z.boolean().default(false),
  valvularDisease: z.boolean().default(false),
});

export const procedureHistorySchema = z.object({
  attachments: z.array(z.string().trim().max(500)).default([]),
  hospital: z.string().trim().max(180).optional(),
  notes: z.string().trim().max(2000).optional(),
  procedureDate: z.coerce.date(),
  procedureType: z.enum([
    "coronary_angiography",
    "pci_stents",
    "cabg",
    "valve_surgery",
    "pacemaker",
    "icd",
    "ablation",
    "open_heart_surgery",
  ]),
});

export const fitnessDecisionSchema = z.object({
  decision: z.enum([
    "fit",
    "fit_with_restrictions",
    "temporarily_unfit",
    "permanently_unfit",
    "refer_to_cardiologist",
  ]),
  notes: z.string().trim().max(2000).optional(),
  restrictions: z.string().trim().max(1000).optional(),
  validUntil: z.coerce.date().optional(),
});

export const clinicalNoteSchema = z.object({
  caseId: z.string().trim().optional(),
  notes: z.string().trim().min(1).max(3000),
  title: z.string().trim().min(1).max(160).default("Clinical Note"),
});

export const enterpriseSearchSchema = z.object({
  contractorId: z.string().trim().optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  diagnosis: z.string().trim().optional(),
  employeeId: z.string().trim().optional(),
  nationalId: z.string().trim().optional(),
  organizationId: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().optional(),
});
