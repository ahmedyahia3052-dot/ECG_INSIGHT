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
  provider: z.enum(["PAYMOB", "INSTAPAY", "BANK_TRANSFER", "WALLET", "CARD", "STRIPE"]),
});

export const checkoutSessionSchema = z.object({
  idempotencyKey: z.string().trim().min(8).max(120).optional(),
  plan: z.enum(["free", "clinic", "hospital", "basic", "professional", "unlimited", "lifetime", "enterprise"]),
  provider: z.enum(["PAYMOB", "INSTAPAY", "BANK_TRANSFER", "WALLET", "CARD", "STRIPE"]),
});

export const paymentMethodSchema = z.object({
  expMonth: z.number().int().min(1).max(12).optional(),
  expYear: z.number().int().min(2024).max(2100).optional(),
  fingerprint: z.string().trim().max(120).optional(),
  isDefault: z.boolean().default(false),
  label: z.string().trim().min(2).max(120),
  last4: z.string().trim().regex(/^\d{4}$/).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  provider: z.enum(["PAYMOB", "INSTAPAY", "BANK_TRANSFER", "WALLET", "CARD", "STRIPE"]),
  providerToken: z.string().trim().max(300).optional(),
  type: z.string().trim().min(2).max(80),
});

export const subscriptionPlanChangeSchema = z.object({
  plan: z.enum(["free", "clinic", "hospital", "basic", "professional", "unlimited", "enterprise"]),
});

export const cancelSubscriptionSchema = z.object({
  immediately: z.boolean().default(false),
  reason: z.string().trim().max(1000).optional(),
});

export const retryPaymentSchema = z.object({
  paymentId: z.string().trim().min(1),
});

export const refundRequestSchema = z.object({
  amountCents: z.number().int().positive().optional(),
  paymentId: z.string().trim().min(1),
  reason: z.string().trim().max(1000).optional(),
});

export const refundReviewSchema = z.object({
  decision: z.enum(["approve", "reject"]),
  reason: z.string().trim().max(1000).optional(),
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
