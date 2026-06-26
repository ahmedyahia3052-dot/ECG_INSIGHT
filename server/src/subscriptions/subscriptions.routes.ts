import { Router, type RequestHandler } from "express";
import type { Prisma } from "@prisma/client";
import crypto from "node:crypto";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { requireAuth, requireRole } from "../middleware/auth";
import { AppError } from "../middleware/error";
import { validateBody } from "../middleware/validate";
import { fromApiTier, serializeUser, toApiTier } from "../utils/users";
import {
  activateSubscriptionSchema,
  cancelSubscriptionSchema,
  checkoutSessionSchema,
  createPlanSchema,
  paymentMethodSchema,
  refundRequestSchema,
  refundReviewSchema,
  grantLicenseSchema,
  initiatePaymentSchema,
  planSchema,
  receiptSchema,
  retryPaymentSchema,
  reviewPaymentSchema,
  subscriptionPlanChangeSchema,
  updateSubscriptionSchema,
  verifyPaymentSchema,
} from "./schemas";
import {
  activateUserPlan,
  createInvoiceForSubscription,
  ensureDefaultPlans,
  grantLifetimeLicense,
  initiatePayment,
  ownerAnalytics,
  quotaSnapshot,
  reconcileSubscriptionLifecycle,
  revokeLifetimeLicense,
  subscriptionSummary,
} from "./monetization.service";
import {
  cancelSubscription,
  changeSubscriptionPlan,
  completePayment,
  createCheckoutSession,
  financialAudit,
  financialDashboard,
  renewDueSubscriptions,
  requestRefund,
  reviewRefund,
  retryPayment,
  verifyWebhookSignature,
} from "./financial.service";
import { signAccessToken } from "../utils/jwt";

export const subscriptionsRouter = Router();

subscriptionsRouter.use(requireAuth);

const ownerRole = requireRole("SUPER_ADMIN");
const publicPlanCodes: Parameters<typeof toApiTier>[0][] = ["FREE", "CLINIC", "HOSPITAL", "ENTERPRISE"];
const DEVELOPER_OWNER_EMAIL = "ahmedyahia3052@gmail.com";

const ownerOnly: RequestHandler = async (req, _res, next) => {
  try {
    if (!req.auth) throw new AppError(401, "Authentication required.", "AUTH_REQUIRED");
    const user = await prisma.user.findUnique({ where: { id: req.auth.id } });
    if (user?.email.toLowerCase() !== DEVELOPER_OWNER_EMAIL || !user.protectedOwner) {
      throw new AppError(403, "Developer owner access required.", "OWNER_ONLY");
    }
    next();
  } catch (error) {
    next(error);
  }
};

function serializePlan(plan: {
  active: boolean;
  analysisQuota: number | null;
  aiFeatureAccess?: unknown;
  billingCycle: string;
  code: Parameters<typeof toApiTier>[0];
  currency: string;
  description: string | null;
  gracePeriodDays?: number;
  id: string;
  maxOrganizations?: number | null;
  maxUsers?: number | null;
  multiUser: boolean;
  name: string;
  priceCents: number;
  quotaWindowHours: number | null;
  storageQuotaMb?: number | null;
  teamManagement: boolean;
  trialDays?: number;
}) {
  return {
    active: plan.active,
    analysisQuota: plan.analysisQuota,
    aiFeatureAccess: plan.aiFeatureAccess ?? {},
    billingCycle: plan.billingCycle,
    code: toApiTier(plan.code),
    currency: plan.currency,
    description: plan.description,
    gracePeriodDays: plan.gracePeriodDays ?? 7,
    id: plan.id,
    maxOrganizations: plan.maxOrganizations ?? null,
    maxUsers: plan.maxUsers ?? null,
    multiUser: plan.multiUser,
    name: plan.name,
    priceCents: plan.priceCents,
    quotaWindowHours: plan.quotaWindowHours,
    storageQuotaMb: plan.storageQuotaMb ?? null,
    teamManagement: plan.teamManagement,
    trialDays: plan.trialDays ?? 0,
  };
}

function visiblePlanWhere(role?: string): Prisma.SubscriptionPlanWhereInput {
  return role === "SUPER_ADMIN" ? {} : { code: { in: publicPlanCodes } };
}

function rejectPrivateLifetime(plan: string | undefined, role?: string) {
  if (plan === "lifetime" && role !== "SUPER_ADMIN") {
    throw new AppError(403, "Lifetime access is an internal administrator privilege.", "PRIVATE_LIFETIME_PLAN");
  }
}

function serializeLicense(license: {
  expiresAt: Date | null;
  grantedBy: { email: string; name: string; username: string | null } | null;
  id: string;
  reason: string | null;
  startsAt: Date;
  status: string;
  type: string;
  user: { email: string; name: string; username: string | null };
  userId: string;
}) {
  return {
    email: license.user.email,
    expiryDate: license.expiresAt,
    grantedBy: license.grantedBy?.name ?? license.grantedBy?.email ?? "System",
    id: license.id,
    startDate: license.startsAt,
    notes: license.reason ?? undefined,
    status: license.status,
    subscriptionType: license.type === "LIFETIME" ? "Lifetime Premium" : license.type.replaceAll("_", " "),
    userId: license.userId,
    userName: license.user.name,
    username: license.user.username,
  };
}

const ownerLicenseGrantSchema = z.object({
  expiresAt: z.coerce.date().optional(),
  lifetime: z.boolean().default(false),
  notes: z.string().trim().max(1000).optional(),
  plan: z.enum(["free", "clinic", "hospital", "basic", "professional", "enterprise", "lifetime"]),
  startsAt: z.coerce.date().optional(),
  userId: z.string().min(1),
});

const adminSubscriptionActionSchema = z.object({
  expiresAt: z.coerce.date().optional(),
  months: z.number().int().min(1).max(60).optional(),
  plan: z.enum(["free", "clinic", "hospital", "basic", "professional", "enterprise"]).optional(),
  reason: z.string().trim().max(1000).optional(),
});

const ownerLicenseActionSchema = z.object({
  action: z.enum(["activate", "resume", "suspend", "revoke", "extend"]),
  expiresAt: z.coerce.date().optional(),
  notes: z.string().trim().max(1000).optional(),
});

subscriptionsRouter.get("/", requireRole("ADMIN"), async (_req, res, next) => {
  try {
    const subscriptions = await prisma.subscription.findMany({
      include: { user: true },
      orderBy: { updatedAt: "desc" },
    });

    res.json({
      subscriptions: subscriptions.map((subscription) => ({
        id: subscription.id,
        status: subscription.status,
        tier: toApiTier(subscription.tier),
        user: serializeUser({
          ...subscription.user,
          subscription: { tier: subscription.tier },
        }),
        userId: subscription.userId,
      })),
    });
  } catch (error) {
    next(error);
  }
});

subscriptionsRouter.get("/plans", async (req, res, next) => {
  try {
    await ensureDefaultPlans();
    const plans = await prisma.subscriptionPlan.findMany({ orderBy: { priceCents: "asc" }, where: visiblePlanWhere(req.auth?.role) });
    res.json({ plans: plans.map(serializePlan) });
  } catch (error) {
    next(error);
  }
});

subscriptionsRouter.post("/plans", ownerRole, validateBody(createPlanSchema), async (req, res, next) => {
  try {
    const plan = await prisma.subscriptionPlan.upsert({
      create: {
        active: req.body.active ?? true,
        analysisQuota: req.body.analysisQuota,
        aiFeatureAccess: req.body.aiFeatureAccess as Prisma.InputJsonObject | undefined,
        code: fromApiTier(req.body.code),
        currency: req.body.currency ?? "USD",
        description: req.body.description,
        gracePeriodDays: req.body.gracePeriodDays,
        maxOrganizations: req.body.maxOrganizations,
        maxUsers: req.body.maxUsers,
        multiUser: req.body.multiUser ?? false,
        name: req.body.name,
        priceCents: req.body.priceCents ?? 0,
        quotaWindowHours: req.body.quotaWindowHours,
        storageQuotaMb: req.body.storageQuotaMb,
        teamManagement: req.body.teamManagement ?? false,
        trialDays: req.body.trialDays,
      },
      update: {
        active: req.body.active,
        analysisQuota: req.body.analysisQuota,
        aiFeatureAccess: req.body.aiFeatureAccess as Prisma.InputJsonObject | undefined,
        currency: req.body.currency,
        description: req.body.description,
        gracePeriodDays: req.body.gracePeriodDays,
        maxOrganizations: req.body.maxOrganizations,
        maxUsers: req.body.maxUsers,
        multiUser: req.body.multiUser,
        name: req.body.name,
        priceCents: req.body.priceCents,
        quotaWindowHours: req.body.quotaWindowHours,
        storageQuotaMb: req.body.storageQuotaMb,
        teamManagement: req.body.teamManagement,
        trialDays: req.body.trialDays,
      },
      where: { code: fromApiTier(req.body.code) },
    });
    res.status(201).json({ plan: serializePlan(plan) });
  } catch (error) {
    next(error);
  }
});

subscriptionsRouter.patch("/plans/:planId", ownerRole, validateBody(planSchema), async (req, res, next) => {
  try {
    const plan = await prisma.subscriptionPlan.update({
      data: req.body,
      where: { id: String(req.params.planId) },
    });
    res.json({ plan: serializePlan(plan) });
  } catch (error) {
    next(error);
  }
});

subscriptionsRouter.get("/me", async (req, res, next) => {
  try {
    await reconcileSubscriptionLifecycle(req.auth!.id);
    const [summary, quota, billingHistory, payments, user] = await Promise.all([
      subscriptionSummary(req.auth!.id),
      quotaSnapshot(req.auth!.id),
      prisma.billingEvent.findMany({ orderBy: { createdAt: "desc" }, take: 20, where: { userId: req.auth!.id } }),
      prisma.payment.findMany({ include: { invoice: true }, orderBy: { createdAt: "desc" }, take: 20, where: { userId: req.auth!.id } }),
      prisma.user.findUnique({ where: { id: req.auth!.id } }),
    ]);
    const [invoices, usageTracking] = await Promise.all([
      prisma.invoice.findMany({ orderBy: { issuedAt: "desc" }, take: 20, where: { userId: req.auth!.id } }),
      prisma.usageTracking.findMany({ orderBy: { createdAt: "desc" }, take: 20, where: { userId: req.auth!.id } }),
    ]);
    res.json({
      billingHistory,
      invoices,
      lifetimeAccess: {
        granted: Boolean(user?.isLifetime),
        grantedAt: user?.lifetimeGrantedAt,
        grantedBy: user?.lifetimeGrantedBy,
        message: user?.isLifetime ? "Special Lifetime Access Granted by Administrator" : null,
        noExpiration: Boolean(user?.isLifetime),
        unlimitedAnalyses: Boolean(user?.isLifetime),
      },
      payments,
      plan: serializePlan(summary.plan),
      quota: {
        canAnalyze: quota.canAnalyze,
        limits: quota.limits,
        nextResetAt: quota.nextResetAt,
        quota: quota.quota,
        remaining: quota.remaining,
        used: quota.used,
        warning: quota.warning,
      },
      subscription: summary.subscription,
      usageTracking,
    });
  } catch (error) {
    next(error);
  }
});

subscriptionsRouter.get("/billing-history", async (req, res, next) => {
  try {
    const [invoices, payments, usageTracking, billingEvents] = await Promise.all([
      prisma.invoice.findMany({ orderBy: { issuedAt: "desc" }, where: { userId: req.auth!.id } }),
      prisma.payment.findMany({ include: { invoice: true }, orderBy: { createdAt: "desc" }, where: { userId: req.auth!.id } }),
      prisma.usageTracking.findMany({ orderBy: { createdAt: "desc" }, where: { userId: req.auth!.id } }),
      prisma.billingEvent.findMany({ orderBy: { createdAt: "desc" }, take: 50, where: { userId: req.auth!.id } }),
    ]);
    res.json({ billingEvents, invoices, payments, usageTracking });
  } catch (error) {
    next(error);
  }
});

subscriptionsRouter.get("/usage", async (req, res, next) => {
  try {
    const quota = await quotaSnapshot(req.auth!.id);
    const usageTracking = await prisma.usageTracking.findMany({ orderBy: { createdAt: "desc" }, where: { userId: req.auth!.id } });
    res.json({ quota, usageTracking });
  } catch (error) {
    next(error);
  }
});

subscriptionsRouter.get("/analytics", ownerRole, async (_req, res, next) => {
  try {
    res.json({ analytics: await ownerAnalytics() });
  } catch (error) {
    next(error);
  }
});

subscriptionsRouter.post("/checkout", validateBody(checkoutSessionSchema), async (req, res, next) => {
  try {
    rejectPrivateLifetime(req.body.plan, req.auth?.role);
    const result = await createCheckoutSession({
      idempotencyKey: req.body.idempotencyKey ?? req.get("idempotency-key") ?? undefined,
      ipAddress: req.ip,
      planCode: fromApiTier(req.body.plan),
      provider: req.body.provider,
      userAgent: req.get("user-agent"),
      userId: req.auth!.id,
    });
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

subscriptionsRouter.post("/payments/retry", validateBody(retryPaymentSchema), async (req, res, next) => {
  try {
    res.status(201).json(await retryPayment(req.body.paymentId, req.auth!.id));
  } catch (error) {
    next(error);
  }
});

subscriptionsRouter.post("/payments/webhooks/:provider", validateBody(verifyPaymentSchema), async (req, res, next) => {
  try {
    const provider = z.enum(["PAYMOB", "INSTAPAY", "BANK_TRANSFER", "WALLET", "CARD", "STRIPE"]).parse(String(req.params.provider).toUpperCase());
    const signature = req.get("x-payment-signature");
    if (!verifyWebhookSignature(req.body, signature)) {
      throw new AppError(401, "Invalid payment webhook signature.", "INVALID_WEBHOOK_SIGNATURE");
    }
    const paymentId = typeof req.body["paymentId"] === "string" ? req.body["paymentId"] : undefined;
    const transactionId = typeof req.body["transactionId"] === "string" ? req.body["transactionId"] : undefined;
    const payment = paymentId
      ? await prisma.payment.findUnique({ where: { id: paymentId } })
      : transactionId
        ? await prisma.payment.findFirst({ where: { transactionId } })
        : null;
    if (!payment) throw new AppError(404, "Payment not found.", "PAYMENT_NOT_FOUND");
    if (payment.provider !== provider) throw new AppError(400, "Webhook provider does not match payment provider.", "WEBHOOK_PROVIDER_MISMATCH");
    const status = req.body["success"] === true || req.body["status"] === "PAID" || req.body["status"] === "SUCCESS" ? "PAID" : "FAILED";
    const updated = await completePayment({
      failureReason: status === "FAILED" ? String(req.body["failureReason"] ?? "Gateway reported payment failure.") : undefined,
      paymentId: payment.id,
      providerPayload: req.body as Prisma.InputJsonObject,
      status,
    });
    await financialAudit({ action: "WEBHOOK_RECEIVED", amountCents: payment.amountCents, currency: payment.currency, entityId: payment.id, entityType: "Payment", metadata: { provider, status } as Prisma.InputJsonObject, userId: payment.userId });
    res.json({ payment: updated });
  } catch (error) {
    next(error);
  }
});

subscriptionsRouter.get("/payment-methods", async (req, res, next) => {
  try {
    const methods = await prisma.paymentMethod.findMany({ orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }], where: { userId: req.auth!.id } });
    res.json({ methods });
  } catch (error) {
    next(error);
  }
});

subscriptionsRouter.post("/payment-methods", validateBody(paymentMethodSchema), async (req, res, next) => {
  try {
    if (req.body.isDefault) {
      await prisma.paymentMethod.updateMany({ data: { isDefault: false }, where: { userId: req.auth!.id } });
    }
    const method = await prisma.paymentMethod.create({
      data: {
        expMonth: req.body.expMonth,
        expYear: req.body.expYear,
        fingerprint: req.body.fingerprint,
        isDefault: req.body.isDefault,
        label: req.body.label,
        last4: req.body.last4,
        metadata: req.body.metadata as Prisma.InputJsonObject | undefined,
        provider: req.body.provider,
        providerToken: req.body.providerToken,
        type: req.body.type,
        userId: req.auth!.id,
      },
    });
    await financialAudit({ action: "CHECKOUT_CREATED", actorId: req.auth!.id, entityId: method.id, entityType: "PaymentMethod", metadata: { provider: method.provider, type: method.type } as Prisma.InputJsonObject, userId: req.auth!.id });
    res.status(201).json({ method });
  } catch (error) {
    next(error);
  }
});

subscriptionsRouter.post("/subscription/upgrade", validateBody(subscriptionPlanChangeSchema), async (req, res, next) => {
  try {
    res.json({ subscription: await changeSubscriptionPlan(req.auth!.id, fromApiTier(req.body.plan)) });
  } catch (error) {
    next(error);
  }
});

subscriptionsRouter.post("/subscription/downgrade", validateBody(subscriptionPlanChangeSchema), async (req, res, next) => {
  try {
    res.json({ subscription: await changeSubscriptionPlan(req.auth!.id, fromApiTier(req.body.plan)) });
  } catch (error) {
    next(error);
  }
});

subscriptionsRouter.post("/subscription/cancel", validateBody(cancelSubscriptionSchema), async (req, res, next) => {
  try {
    res.json({ subscription: await cancelSubscription(req.auth!.id, req.body.immediately) });
  } catch (error) {
    next(error);
  }
});

subscriptionsRouter.post("/subscription/convert-trial", validateBody(subscriptionPlanChangeSchema), async (req, res, next) => {
  try {
    res.json({ subscription: await changeSubscriptionPlan(req.auth!.id, fromApiTier(req.body.plan)) });
  } catch (error) {
    next(error);
  }
});

subscriptionsRouter.get("/financial/dashboard", ownerRole, async (_req, res, next) => {
  try {
    res.json({ dashboard: await financialDashboard() });
  } catch (error) {
    next(error);
  }
});

subscriptionsRouter.get("/financial/admin-center", ownerRole, async (_req, res, next) => {
  try {
    const [transactions, refunds, invoices, manualPayments, auditLogs] = await Promise.all([
      prisma.paymentTransaction.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),
      prisma.refund.findMany({ include: { payment: true }, orderBy: { createdAt: "desc" }, take: 100 }),
      prisma.invoice.findMany({ orderBy: { issuedAt: "desc" }, take: 100 }),
      prisma.payment.findMany({ orderBy: { createdAt: "desc" }, take: 100, where: { provider: { in: ["BANK_TRANSFER", "INSTAPAY", "WALLET"] }, status: "PENDING" } }),
      prisma.financialAuditLog.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),
    ]);
    res.json({ auditLogs, invoices, manualPayments, refunds, transactions });
  } catch (error) {
    next(error);
  }
});

subscriptionsRouter.post("/financial/renew-due", ownerRole, async (_req, res, next) => {
  try {
    res.json({ renewed: await renewDueSubscriptions() });
  } catch (error) {
    next(error);
  }
});

subscriptionsRouter.post("/refunds", validateBody(refundRequestSchema), async (req, res, next) => {
  try {
    const payment = await prisma.payment.findFirst({ where: { id: req.body.paymentId, userId: req.auth!.id } });
    if (!payment && req.auth?.role !== "SUPER_ADMIN") throw new AppError(404, "Payment not found.", "PAYMENT_NOT_FOUND");
    res.status(201).json({ refund: await requestRefund({ actorId: req.auth!.id, amountCents: req.body.amountCents, paymentId: req.body.paymentId, reason: req.body.reason }) });
  } catch (error) {
    next(error);
  }
});

subscriptionsRouter.post("/refunds/:refundId/review", ownerRole, validateBody(refundReviewSchema), async (req, res, next) => {
  try {
    res.json({ refund: await reviewRefund({ actorId: req.auth!.id, decision: req.body.decision, refundId: String(req.params.refundId), reason: req.body.reason }) });
  } catch (error) {
    next(error);
  }
});

subscriptionsRouter.post("/licenses/lifetime", ownerOnly, validateBody(grantLicenseSchema), async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.body.userId } });
    if (!user) throw new AppError(404, "User not found.", "USER_NOT_FOUND");
    const license = await grantLifetimeLicense(user.id, req.auth!.id, req.body.reason);
    res.status(201).json({ license });
  } catch (error) {
    next(error);
  }
});

subscriptionsRouter.post("/licenses", ownerOnly, async (req, res, next) => {
  try {
    const body = ownerLicenseGrantSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { id: body.userId } });
    if (!user) throw new AppError(404, "User not found.", "USER_NOT_FOUND");
    const startsAt = body.startsAt ?? new Date();
    const isLifetime = body.lifetime || body.plan === "lifetime";
    const license = await prisma.license.create({
      data: {
        expiresAt: isLifetime ? null : body.expiresAt,
        grantedById: req.auth!.id,
        reason: body.notes,
        startsAt,
        status: "ACTIVE",
        type: isLifetime ? "LIFETIME" : "ENTERPRISE_SEAT",
        userId: body.userId,
      },
      include: {
        grantedBy: { select: { email: true, name: true, username: true } },
        user: { select: { email: true, name: true, username: true } },
      },
    });
    await prisma.subscription.upsert({
      create: {
        currentPeriodEnd: isLifetime ? null : body.expiresAt,
        currentPeriodStart: startsAt,
        status: "ACTIVE",
        tier: fromApiTier(isLifetime ? "lifetime" : body.plan),
        userId: body.userId,
      },
      update: {
        currentPeriodEnd: isLifetime ? null : body.expiresAt,
        currentPeriodStart: startsAt,
        status: "ACTIVE",
        tier: fromApiTier(isLifetime ? "lifetime" : body.plan),
      },
      where: { userId: body.userId },
    });
    await prisma.user.update({
      data: {
        isLifetime,
        lifetimeGrantedAt: isLifetime ? new Date() : undefined,
        lifetimeGrantedBy: isLifetime ? req.auth!.id : undefined,
      },
      where: { id: body.userId },
    });
    await prisma.billingEvent.create({
      data: {
        message: `Owner granted ${body.plan} license.`,
        metadata: { licenseId: license.id, notes: body.notes, plan: body.plan } as Prisma.InputJsonObject,
        type: "LICENSE_GRANTED",
        userId: body.userId,
      },
    });
    await prisma.auditLog.create({
      data: {
        action: "LICENSE_GRANTED",
        actorId: req.auth!.id,
        entityId: license.id,
        entityType: "License",
        message: `Developer owner granted ${body.plan} license to ${user.email}.`,
      },
    });
    res.status(201).json({ license: serializeLicense(license) });
  } catch (error) {
    next(error);
  }
});

subscriptionsRouter.get("/licenses", ownerOnly, async (_req, res, next) => {
  try {
    const licenses = await prisma.license.findMany({
      include: {
        grantedBy: { select: { email: true, name: true, username: true } },
        user: { select: { email: true, name: true, username: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json({ licenses: licenses.map(serializeLicense) });
  } catch (error) {
    next(error);
  }
});

subscriptionsRouter.patch("/licenses/:licenseId", ownerOnly, async (req, res, next) => {
  try {
    const body = ownerLicenseActionSchema.parse(req.body);
    const current = await prisma.license.findUnique({ where: { id: String(req.params.licenseId) } });
    if (!current) throw new AppError(404, "License not found.", "LICENSE_NOT_FOUND");
    const status = body.action === "activate" || body.action === "resume" || body.action === "extend" ? "ACTIVE" : body.action === "suspend" ? "SUSPENDED" : "REVOKED";
    const license = await prisma.license.update({
      data: {
        expiresAt: body.action === "extend" ? body.expiresAt : undefined,
        reason: body.notes ?? current.reason,
        revokedAt: body.action === "revoke" ? new Date() : undefined,
        revokedById: body.action === "revoke" ? req.auth!.id : undefined,
        status,
      },
      include: {
        grantedBy: { select: { email: true, name: true, username: true } },
        user: { select: { email: true, name: true, username: true } },
      },
      where: { id: current.id },
    });
    await prisma.subscription.upsert({
      create: {
        currentPeriodEnd: license.expiresAt,
        status: status === "ACTIVE" ? "ACTIVE" : status === "SUSPENDED" ? "SUSPENDED" : "CANCELED",
        tier: license.type === "LIFETIME" ? "LIFETIME" : "ENTERPRISE",
        userId: license.userId,
      },
      update: {
        currentPeriodEnd: license.expiresAt,
        status: status === "ACTIVE" ? "ACTIVE" : status === "SUSPENDED" ? "SUSPENDED" : "CANCELED",
        tier: license.type === "LIFETIME" ? "LIFETIME" : "ENTERPRISE",
      },
      where: { userId: license.userId },
    });
    if (license.type === "LIFETIME") {
      await prisma.user.update({
        data: {
          isLifetime: status === "ACTIVE",
          lifetimeRevokedAt: status === "REVOKED" ? new Date() : undefined,
          lifetimeRevokedBy: status === "REVOKED" ? req.auth!.id : undefined,
        },
        where: { id: license.userId },
      });
    }
    await prisma.billingEvent.create({
      data: {
        message: `Developer owner ${body.action} license.`,
        metadata: { action: body.action, licenseId: license.id, notes: body.notes } as Prisma.InputJsonObject,
        type: body.action === "revoke" ? "LICENSE_REVOKED" : "LICENSE_GRANTED",
        userId: license.userId,
      },
    });
    await prisma.auditLog.create({
      data: {
        action: body.action === "revoke" ? "LICENSE_REVOKED" : "LICENSE_GRANTED",
        actorId: req.auth!.id,
        entityId: license.id,
        entityType: "License",
        message: `Developer owner ${body.action} license for ${license.user.email}.`,
      },
    });
    res.json({ license: serializeLicense(license) });
  } catch (error) {
    next(error);
  }
});

subscriptionsRouter.delete("/licenses/:userId", ownerOnly, async (req, res, next) => {
  try {
    const result = await revokeLifetimeLicense(String(req.params.userId), req.auth!.id, "Owner license dashboard revoke");
    res.json(result);
  } catch (error) {
    next(error);
  }
});

subscriptionsRouter.post("/activate", ownerOnly, validateBody(activateSubscriptionSchema), async (req, res, next) => {
  try {
    if (req.body.plan === "lifetime") {
      throw new AppError(400, "Use the lifetime license endpoint instead of plan activation.", "PRIVATE_LIFETIME_PLAN");
    }
    const subscription = await activateUserPlan(req.body.userId, fromApiTier(req.body.plan));
    res.status(201).json({ subscription });
  } catch (error) {
    next(error);
  }
});

subscriptionsRouter.post("/admin/users/:userId/suspend", ownerRole, validateBody(adminSubscriptionActionSchema), async (req, res, next) => {
  try {
    const userId = String(req.params.userId);
    const updated = await prisma.userSubscription.updateMany({
      data: { graceEndsAt: req.body.expiresAt, status: "SUSPENDED", suspendedAt: new Date() },
      where: { userId, status: { in: ["ACTIVE", "TRIALING", "PAST_DUE"] } },
    });
    await prisma.subscription.upsert({
      create: { status: "SUSPENDED", tier: fromApiTier(req.body.plan ?? "enterprise"), userId },
      update: { status: "SUSPENDED" },
      where: { userId },
    });
    await prisma.notification.create({ data: { message: req.body.reason ?? "Your subscription has been suspended by an administrator.", title: "Subscription suspended", type: "CRITICAL", userId } });
    await prisma.auditLog.create({ data: { action: "SUBSCRIPTION_UPDATED", actorId: req.auth!.id, entityId: userId, entityType: "Subscription", message: "Subscription suspended manually.", metadata: { reason: req.body.reason } as Prisma.InputJsonObject } });
    res.json({ updatedCount: updated.count });
  } catch (error) {
    next(error);
  }
});

subscriptionsRouter.post("/admin/users/:userId/activate", ownerRole, validateBody(adminSubscriptionActionSchema), async (req, res, next) => {
  try {
    const plan = fromApiTier(req.body.plan ?? "enterprise");
    const subscription = await activateUserPlan(String(req.params.userId), plan);
    await prisma.userSubscription.update({ data: { manuallyActivatedById: req.auth!.id, status: "ACTIVE" }, where: { id: subscription.id } });
    await prisma.auditLog.create({ data: { action: "SUBSCRIPTION_UPDATED", actorId: req.auth!.id, entityId: subscription.id, entityType: "UserSubscription", message: `Subscription manually activated as ${plan}.` } });
    res.status(201).json({ subscription });
  } catch (error) {
    next(error);
  }
});

subscriptionsRouter.post("/admin/users/:userId/extend", ownerRole, validateBody(adminSubscriptionActionSchema), async (req, res, next) => {
  try {
    const userId = String(req.params.userId);
    const subscription = await prisma.userSubscription.findFirst({ include: { plan: true }, orderBy: { updatedAt: "desc" }, where: { userId } });
    if (!subscription) throw new AppError(404, "Subscription not found.", "SUBSCRIPTION_NOT_FOUND");
    const months = req.body.months ?? 1;
    const base = subscription.expirationDate && subscription.expirationDate > new Date() ? subscription.expirationDate : new Date();
    const expirationDate = req.body.expiresAt ?? new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + months, base.getUTCDate()));
    const updated = await prisma.userSubscription.update({
      data: { currentPeriodEnd: expirationDate, expirationDate, graceEndsAt: null, renewalDate: expirationDate, status: "ACTIVE" },
      where: { id: subscription.id },
    });
    await prisma.subscription.upsert({
      create: { currentPeriodEnd: expirationDate, status: "ACTIVE", tier: subscription.plan.code, userId },
      update: { currentPeriodEnd: expirationDate, status: "ACTIVE", tier: subscription.plan.code },
      where: { userId },
    });
    await prisma.notification.create({ data: { message: `Your subscription was extended until ${expirationDate.toISOString()}.`, title: "Subscription extended", type: "SUCCESS", userId } });
    await prisma.auditLog.create({ data: { action: "SUBSCRIPTION_UPDATED", actorId: req.auth!.id, entityId: subscription.id, entityType: "UserSubscription", message: `Subscription manually extended by ${months} month(s).` } });
    res.json({ subscription: updated });
  } catch (error) {
    next(error);
  }
});

subscriptionsRouter.post("/admin/users/:userId/invoices", ownerRole, async (req, res, next) => {
  try {
    const subscription = await prisma.userSubscription.findFirst({ orderBy: { updatedAt: "desc" }, where: { userId: String(req.params.userId) } });
    if (!subscription) throw new AppError(404, "Subscription not found.", "SUBSCRIPTION_NOT_FOUND");
    res.status(201).json({ invoice: await createInvoiceForSubscription(subscription.id) });
  } catch (error) {
    next(error);
  }
});

subscriptionsRouter.post("/admin/users/:userId/impersonate", ownerRole, async (req, res, next) => {
  try {
    const target = await prisma.user.findUnique({ where: { id: String(req.params.userId) } });
    if (!target) throw new AppError(404, "User not found.", "USER_NOT_FOUND");
    if (target.role === "OWNER") throw new AppError(403, "Owner account cannot be impersonated.", "OWNER_IMPERSONATION_BLOCKED");
    const session = await prisma.session.create({
      data: {
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        ipAddress: req.ip,
        refreshTokenHash: crypto.randomBytes(32).toString("hex"),
        userAgent: req.get("user-agent"),
        userId: target.id,
      },
    });
    const accessToken = signAccessToken({ actorId: req.auth!.id, actorRole: req.auth!.role, role: target.role, sessionId: session.id, userId: target.id });
    await prisma.auditLog.create({ data: { action: "IMPERSONATION_STARTED", actorId: req.auth!.id, entityId: target.id, entityType: "User", message: `Super admin started impersonation for ${target.email}.` } });
    res.status(201).json({ accessToken, expiresAt: session.expiresAt, impersonatedUserId: target.id });
  } catch (error) {
    next(error);
  }
});

subscriptionsRouter.post("/payments/initiate", validateBody(initiatePaymentSchema), async (req, res, next) => {
  try {
    rejectPrivateLifetime(req.body.plan, req.auth?.role);
    const result = await initiatePayment(req.auth!.id, fromApiTier(req.body.plan), req.body.provider);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

subscriptionsRouter.post("/payments/:paymentId/receipt", validateBody(receiptSchema), async (req, res, next) => {
  try {
    const payment = await prisma.payment.update({
      data: { receiptUrl: req.body.receiptUrl, status: "PENDING" },
      where: { id: String(req.params.paymentId), userId: req.auth!.id },
    });
    res.json({ payment });
  } catch (error) {
    next(error);
  }
});

subscriptionsRouter.post("/payments/:paymentId/review", ownerRole, validateBody(reviewPaymentSchema), async (req, res, next) => {
  try {
    const payment = await prisma.payment.findUnique({ where: { id: String(req.params.paymentId) } });
    if (!payment) throw new AppError(404, "Payment not found.", "PAYMENT_NOT_FOUND");
    const approved = req.body.decision === "approve";
    const updated = await prisma.payment.update({
      data: {
        callbackPayload: { decision: req.body.decision, reason: req.body.reason } as Prisma.InputJsonObject,
        reviewedAt: new Date(),
        reviewedById: req.auth!.id,
        status: approved ? "APPROVED" : "REJECTED",
      },
      where: { id: payment.id },
    });
    if (approved && req.body.plan) {
      rejectPrivateLifetime(req.body.plan, req.auth?.role);
      await completePayment({ actorId: req.auth!.id, paymentId: payment.id, providerPayload: { decision: req.body.decision, reason: req.body.reason } as Prisma.InputJsonObject, status: "APPROVED" });
      if (!payment.subscriptionId) {
        await activateUserPlan(payment.userId, fromApiTier(req.body.plan));
      }
      await prisma.notification.create({
        data: { message: "Your payment was approved and subscription is active.", title: "Payment approved", type: "SUCCESS", userId: payment.userId },
      });
    } else if (!approved) {
      await prisma.notification.create({
        data: { message: req.body.reason ?? "Your payment receipt was rejected.", title: "Payment rejected", type: "WARNING", userId: payment.userId },
      });
    }
    await financialAudit({
      action: approved ? "MANUAL_PAYMENT_APPROVED" : "PAYMENT_FAILED",
      actorId: req.auth!.id,
      amountCents: payment.amountCents,
      currency: payment.currency,
      entityId: payment.id,
      entityType: "Payment",
      metadata: { decision: req.body.decision, reason: req.body.reason } as Prisma.InputJsonObject,
      userId: payment.userId,
    });
    res.json({ payment: updated });
  } catch (error) {
    next(error);
  }
});

subscriptionsRouter.post("/payments/paymob/webhook", validateBody(verifyPaymentSchema), async (req, res, next) => {
  try {
    const transactionId = typeof req.body["transactionId"] === "string" ? req.body["transactionId"] : undefined;
    if (!transactionId) throw new AppError(400, "Paymob transaction id is required.", "TRANSACTION_REQUIRED");
    const payment = await prisma.payment.findFirst({ where: { transactionId } });
    if (!payment) throw new AppError(404, "Payment not found.", "PAYMENT_NOT_FOUND");
    const status = req.body["success"] === true || req.body["status"] === "PAID" ? "PAID" : "FAILED";
    const updated = await prisma.payment.update({
      data: { callbackPayload: req.body as Prisma.InputJsonObject, status },
      where: { id: payment.id },
    });
    res.json({ payment: updated });
  } catch (error) {
    next(error);
  }
});

subscriptionsRouter.patch(
  "/:userId",
  requireRole("SUPER_ADMIN"),
  validateBody(updateSubscriptionSchema),
  async (req, res, next) => {
    try {
      const userId = String(req.params.userId);
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        throw new AppError(404, "User not found.", "USER_NOT_FOUND");
      }
      if (req.body.tier === "lifetime") {
        throw new AppError(400, "Use the lifetime license endpoint instead of subscription tier updates.", "PRIVATE_LIFETIME_PLAN");
      }

      const subscription = await prisma.subscription.upsert({
        create: {
          status: req.body.status ?? "ACTIVE",
          tier: fromApiTier(req.body.tier),
          userId: user.id,
        },
        update: {
          status: req.body.status,
          tier: fromApiTier(req.body.tier),
        },
        where: { userId: user.id },
      });

      res.json({
        subscription: {
          id: subscription.id,
          status: subscription.status,
          tier: toApiTier(subscription.tier),
          userId: subscription.userId,
        },
      });
    } catch (error) {
      next(error);
    }
  },
);
