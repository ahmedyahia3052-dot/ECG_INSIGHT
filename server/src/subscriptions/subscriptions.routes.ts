import { Router, type RequestHandler } from "express";
import type { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";
import { requireAuth, requireRole } from "../middleware/auth";
import { AppError } from "../middleware/error";
import { validateBody } from "../middleware/validate";
import { fromApiTier, serializeUser, toApiTier } from "../utils/users";
import {
  activateSubscriptionSchema,
  createPlanSchema,
  grantLicenseSchema,
  initiatePaymentSchema,
  planSchema,
  receiptSchema,
  reviewPaymentSchema,
  updateSubscriptionSchema,
  verifyPaymentSchema,
} from "./schemas";
import {
  activateUserPlan,
  ensureDefaultPlans,
  grantLifetimeLicense,
  initiatePayment,
  ownerAnalytics,
  quotaSnapshot,
  revokeLifetimeLicense,
  subscriptionSummary,
} from "./monetization.service";

export const subscriptionsRouter = Router();

subscriptionsRouter.use(requireAuth);

const ownerRole = requireRole("SUPER_ADMIN");
const publicPlanCodes: Parameters<typeof toApiTier>[0][] = ["FREE", "BASIC", "PROFESSIONAL", "ENTERPRISE"];

const ownerOnly: RequestHandler = (req, _res, next) => {
  if (req.auth?.role === "OWNER" || req.auth?.actorRole === "OWNER") {
    next();
    return;
  }
  next(new AppError(403, "Owner access required.", "OWNER_ONLY"));
};

function serializePlan(plan: {
  active: boolean;
  analysisQuota: number | null;
  billingCycle: string;
  code: Parameters<typeof toApiTier>[0];
  currency: string;
  description: string | null;
  id: string;
  multiUser: boolean;
  name: string;
  priceCents: number;
  quotaWindowHours: number | null;
  teamManagement: boolean;
}) {
  return {
    active: plan.active,
    analysisQuota: plan.analysisQuota,
    billingCycle: plan.billingCycle,
    code: toApiTier(plan.code),
    currency: plan.currency,
    description: plan.description,
    id: plan.id,
    multiUser: plan.multiUser,
    name: plan.name,
    priceCents: plan.priceCents,
    quotaWindowHours: plan.quotaWindowHours,
    teamManagement: plan.teamManagement,
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
    status: license.status,
    subscriptionType: license.type === "LIFETIME" ? "Lifetime Premium" : license.type.replaceAll("_", " "),
    userId: license.userId,
    userName: license.user.name,
    username: license.user.username,
  };
}

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
        code: fromApiTier(req.body.code),
        currency: req.body.currency ?? "USD",
        description: req.body.description,
        multiUser: req.body.multiUser ?? false,
        name: req.body.name,
        priceCents: req.body.priceCents ?? 0,
        quotaWindowHours: req.body.quotaWindowHours,
        teamManagement: req.body.teamManagement ?? false,
      },
      update: {
        active: req.body.active,
        analysisQuota: req.body.analysisQuota,
        currency: req.body.currency,
        description: req.body.description,
        multiUser: req.body.multiUser,
        name: req.body.name,
        priceCents: req.body.priceCents,
        quotaWindowHours: req.body.quotaWindowHours,
        teamManagement: req.body.teamManagement,
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
    const [summary, quota, billingHistory, payments, user] = await Promise.all([
      subscriptionSummary(req.auth!.id),
      quotaSnapshot(req.auth!.id),
      prisma.billingEvent.findMany({ orderBy: { createdAt: "desc" }, take: 20, where: { userId: req.auth!.id } }),
      prisma.payment.findMany({ orderBy: { createdAt: "desc" }, take: 20, where: { userId: req.auth!.id } }),
      prisma.user.findUnique({ where: { id: req.auth!.id } }),
    ]);
    res.json({
      billingHistory,
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
        nextResetAt: quota.nextResetAt,
        quota: quota.quota,
        remaining: quota.remaining,
        used: quota.used,
        warning: quota.warning,
      },
      subscription: summary.subscription,
    });
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

subscriptionsRouter.post("/licenses/lifetime", ownerRole, validateBody(grantLicenseSchema), async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.body.userId } });
    if (!user) throw new AppError(404, "User not found.", "USER_NOT_FOUND");
    const license = await grantLifetimeLicense(user.id, req.auth!.id, req.body.reason);
    res.status(201).json({ license });
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

subscriptionsRouter.delete("/licenses/:userId", ownerOnly, async (req, res, next) => {
  try {
    const result = await revokeLifetimeLicense(String(req.params.userId), req.auth!.id, "Owner license dashboard revoke");
    res.json(result);
  } catch (error) {
    next(error);
  }
});

subscriptionsRouter.post("/activate", ownerRole, validateBody(activateSubscriptionSchema), async (req, res, next) => {
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
      await activateUserPlan(payment.userId, fromApiTier(req.body.plan));
      await prisma.notification.create({
        data: { message: "Your payment was approved and subscription is active.", title: "Payment approved", type: "SUCCESS", userId: payment.userId },
      });
    } else if (!approved) {
      await prisma.notification.create({
        data: { message: req.body.reason ?? "Your payment receipt was rejected.", title: "Payment rejected", type: "WARNING", userId: payment.userId },
      });
    }
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
