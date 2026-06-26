import { z } from "zod";

export const updateSubscriptionSchema = z.object({
  status: z.enum(["ACTIVE", "PAST_DUE", "CANCELED", "TRIALING", "SUSPENDED", "EXPIRED", "PENDING_REVIEW"]).optional(),
  tier: z.enum(["free", "clinic", "hospital", "basic", "professional", "unlimited", "lifetime", "enterprise"]),
});

export const planSchema = z.object({
  active: z.boolean().optional(),
  analysisQuota: z.number().int().min(0).nullable().optional(),
  aiFeatureAccess: z.record(z.string(), z.unknown()).optional(),
  currency: z.string().min(3).max(3).optional(),
  description: z.string().optional(),
  gracePeriodDays: z.number().int().min(0).max(90).optional(),
  maxOrganizations: z.number().int().min(1).nullable().optional(),
  maxUsers: z.number().int().min(1).nullable().optional(),
  multiUser: z.boolean().optional(),
  name: z.string().min(2).optional(),
  priceCents: z.number().int().min(0).optional(),
  quotaWindowHours: z.number().int().positive().nullable().optional(),
  storageQuotaMb: z.number().int().min(0).nullable().optional(),
  teamManagement: z.boolean().optional(),
  trialDays: z.number().int().min(0).max(365).optional(),
});

export const createPlanSchema = planSchema.extend({
  code: z.enum(["free", "clinic", "hospital", "basic", "professional", "unlimited", "lifetime", "enterprise"]),
  name: z.string().min(2),
});

export const grantLicenseSchema = z.object({
  reason: z.string().optional(),
  userId: z.string().min(1),
});

export const activateSubscriptionSchema = z.object({
  plan: z.enum(["free", "clinic", "hospital", "basic", "professional", "unlimited", "lifetime", "enterprise"]),
  userId: z.string().min(1),
});

export const initiatePaymentSchema = z.object({
  plan: z.enum(["free", "clinic", "hospital", "basic", "professional", "unlimited", "lifetime", "enterprise"]),
  provider: z.enum(["PAYMOB", "INSTAPAY", "WALLET", "CARD", "STRIPE"]),
});

export const receiptSchema = z.object({
  receiptUrl: z.string().min(1),
});

export const reviewPaymentSchema = z.object({
  decision: z.enum(["approve", "reject"]),
  plan: z.enum(["free", "clinic", "hospital", "basic", "professional", "unlimited", "lifetime", "enterprise"]).optional(),
  reason: z.string().optional(),
});

export const verifyPaymentSchema = z.record(z.string(), z.unknown());
