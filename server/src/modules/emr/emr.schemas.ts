import { z } from "zod";

export const cardiacHistorySchema = z.object({
  arrhythmia: z.boolean().default(false),
  arrhythmiaHistory: z.boolean().default(false),
  congenitalHeartDisease: z.boolean().default(false),
  coronaryArteryDisease: z.boolean().default(false),
  diabetesMellitus: z.boolean().default(false),
  dyslipidemia: z.boolean().default(false),
  familyHistoryHeartDisease: z.boolean().default(false),
  heartFailure: z.boolean().default(false),
  hypertension: z.boolean().default(false),
  myocardialInfarctionHistory: z.boolean().default(false),
  obesity: z.boolean().default(false),
  previousStroke: z.boolean().default(false),
  rheumaticHeartDisease: z.boolean().default(false),
  smokingStatus: z.enum(["never", "former", "current", "unknown"]).default("unknown"),
  valvularDisease: z.boolean().default(false),
});

export const cardiacProcedureSchema = z.object({
  documents: z.array(z.string().trim().max(500)).default([]),
  findings: z.string().trim().max(3000).optional(),
  hospital: z.string().trim().max(180).optional(),
  images: z.array(z.string().trim().max(500)).default([]),
  notes: z.string().trim().max(3000).optional(),
  operatorPhysician: z.string().trim().max(180).optional(),
  procedureDate: z.coerce.date(),
  procedureType: z.enum([
    "coronary_angiography",
    "pci",
    "cabg",
    "open_heart_surgery",
    "valve_replacement",
    "pacemaker",
    "icd",
    "crt",
    "ablation",
    "cardiac_catheterization",
  ]),
});

export const cardiacProcedureUpdateSchema = cardiacProcedureSchema.partial();

export const medicationSchema = z.object({
  active: z.boolean().default(true),
  category: z
    .enum([
      "ace_inhibitor",
      "arb",
      "beta_blocker",
      "calcium_channel_blocker",
      "diuretic",
      "antiplatelet",
      "anticoagulant",
      "statin",
      "antiarrhythmic",
      "nitrate",
      "sglt2_inhibitor",
      "other",
    ])
    .default("other"),
  dose: z.string().trim().min(1).max(120),
  drugName: z.string().trim().min(1).max(160),
  frequency: z.string().trim().min(1).max(120),
  notes: z.string().trim().max(2000).optional(),
  startDate: z.coerce.date(),
  stopDate: z.coerce.date().optional(),
});

export const medicationUpdateSchema = medicationSchema.partial();

export const imagingBodySchema = z.object({
  findings: z.string().trim().max(3000).optional(),
  imagingType: z.enum([
    "echocardiography",
    "stress_ecg",
    "holter_ecg",
    "cardiac_ct",
    "cardiac_mri",
    "coronary_cta",
    "angiography_images",
    "chest_xray",
  ]),
  notes: z.string().trim().max(3000).optional(),
  performedAt: z.coerce.date().optional(),
  title: z.string().trim().min(1).max(180),
});

export const hospitalizationSchema = z.object({
  admittedAt: z.coerce.date(),
  dischargedAt: z.coerce.date().optional(),
  hospital: z.string().trim().min(1).max(180),
  notes: z.string().trim().max(3000).optional(),
  reason: z.string().trim().min(1).max(300),
});

export const emrSearchSchema = z.object({
  company: z.string().trim().optional(),
  contractorId: z.string().trim().optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  diagnosis: z.string().trim().optional(),
  nationalId: z.string().trim().optional(),
  organizationId: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  patient: z.string().trim().optional(),
  procedure: z.string().trim().optional(),
});
