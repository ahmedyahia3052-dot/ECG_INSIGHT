import type { NextFunction, Request, Response } from "express";
import { Router } from "express";
import type { Prisma, SubscriptionTier } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../config/prisma";
import { requireAuth } from "../../middleware/auth";
import { AppError } from "../../middleware/error";
import { hashPassword, initialsForName } from "../../utils/crypto";
import { fromApiRole, serializeUser, toApiTier } from "../../utils/users";
import { activateUserPlan, grantLifetimeLicense, revokeLifetimeLicense } from "../../subscriptions/monetization.service";

export const superAdminRouter = Router();

superAdminRouter.use(requireAuth);
superAdminRouter.use((req: Request, _res: Response, next: NextFunction) => {
  if (req.auth?.role !== "OWNER" && req.auth?.role !== "SUPER_ADMIN") {
    next(new AppError(403, "Owner or Super Admin access required.", "SUPER_ADMIN_ONLY"));
    return;
  }
  next();
});

superAdminRouter.use((req: Request, res: Response, next: NextFunction) => {
  res.on("finish", () => {
    if (!req.auth || res.statusCode >= 500) return;
    prisma.auditLog.create({
      data: {
        action: req.auth.role === "OWNER" ? "SECURITY_EVENT_CREATED" : "PERMISSION_CHANGED",
        actorId: req.auth.id,
        entityType: "ProtectedAdminEndpoint",
        ipAddress: req.ip,
        message: `Protected admin endpoint ${req.method} ${req.originalUrl} completed with ${res.statusCode}.`,
        metadata: { method: req.method, path: req.originalUrl, statusCode: res.statusCode },
        userAgent: req.get("user-agent"),
      },
    }).catch(() => {});
  });
  next();
});

const planFromInput = (plan: string): SubscriptionTier => (plan === "PRO" ? "PROFESSIONAL" : plan) as SubscriptionTier;
const planToApi = (plan: SubscriptionTier) => (plan === "PROFESSIONAL" ? "pro" : toApiTier(plan));

function isProtectedOwner(user: { protectedOwner: boolean; role: string }) {
  return user.protectedOwner || user.role === "OWNER";
}

function assertCanModifyProtectedOwner(actorRole: string | undefined, target: { protectedOwner: boolean; role: string }) {
  if (isProtectedOwner(target) && actorRole !== "OWNER") {
    throw new AppError(403, "Only the Owner can modify the protected owner account.", "OWNER_IMMUTABLE");
  }
}

async function auditAdminAction(input: {
  actorId: string;
  action: string;
  targetId?: string;
  targetType?: string;
  metadata?: Prisma.InputJsonObject;
}) {
  return prisma.auditLog.create({
    data: {
      action:
        input.action === "GRANT_LICENSE"
          ? "LICENSE_GRANTED"
          : input.action === "REVOKE_LICENSE"
            ? "LICENSE_REVOKED"
          : input.action === "CHANGE_PLAN"
            ? "SUBSCRIPTION_UPDATED"
            : input.action === "PAYMENT_UPDATED"
              ? "PAYMENT_UPDATED"
              : "PERMISSION_CHANGED",
      actorId: input.actorId,
      entityId: input.targetId,
      entityType: input.targetType,
      message: `Super Admin action: ${input.action}`,
      metadata: { adminAction: input.action, ...(input.metadata ?? {}) },
    },
  });
}

function startOfToday() {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

function startOfMonth() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

superAdminRouter.get("/dashboard", async (_req, res, next) => {
  try {
    const today = startOfToday();
    const month = startOfMonth();
    const [totalUsers, activeUsers, freeUsers, proUsers, enterpriseUsers, lifetimeUsers, dailyUsage, monthlyUsage, revenueToday, revenueMonth, revenueTotal, expiringSubscriptions, newRegistrations] =
      await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { isActive: true } }),
        prisma.subscription.count({ where: { tier: "FREE" } }),
        prisma.subscription.count({ where: { tier: "PROFESSIONAL" } }),
        prisma.subscription.count({ where: { tier: "ENTERPRISE" } }),
        prisma.user.count({ where: { OR: [{ isLifetime: true }, { subscription: { tier: "LIFETIME" } }] } }),
        prisma.usageRecord.aggregate({ _sum: { quantity: true }, where: { action: "ECG_ANALYSIS", createdAt: { gte: today } } }),
        prisma.usageRecord.aggregate({ _sum: { quantity: true }, where: { action: "ECG_ANALYSIS", createdAt: { gte: month } } }),
        prisma.paymentTransaction.aggregate({ _sum: { amount: true }, where: { createdAt: { gte: today }, status: "SUCCESS" } }),
        prisma.paymentTransaction.aggregate({ _sum: { amount: true }, where: { createdAt: { gte: month }, status: "SUCCESS" } }),
        prisma.paymentTransaction.aggregate({ _sum: { amount: true }, where: { status: "SUCCESS" } }),
        prisma.userSubscription.findMany({
          include: { plan: true, user: true },
          orderBy: { expirationDate: "asc" },
          take: 10,
          where: { expirationDate: { gte: new Date(), lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) }, status: "ACTIVE" },
        }),
        prisma.user.count({ where: { createdAt: { gte: today } } }),
      ]);

    res.json({
      dashboard: {
        activeUsers,
        dailyEcgAnalyses: dailyUsage._sum.quantity ?? 0,
        enterpriseUsers,
        expiringSubscriptions: expiringSubscriptions.map((subscription) => ({
          expirationDate: subscription.expirationDate,
          plan: subscription.plan.name,
          userEmail: subscription.user.email,
          userId: subscription.userId,
        })),
        freeUsers,
        lifetimeUsers,
        monthlyEcgAnalyses: monthlyUsage._sum.quantity ?? 0,
        newRegistrations,
        proUsers,
        revenueThisMonth: revenueMonth._sum.amount ?? 0,
        revenueToday: revenueToday._sum.amount ?? 0,
        revenueTotal: revenueTotal._sum.amount ?? 0,
        totalUsers,
      },
    });
  } catch (error) {
    next(error);
  }
});

superAdminRouter.get("/users", async (req, res, next) => {
  try {
    const query = z
      .object({
        filter: z.enum(["all", "active", "disabled", "free", "pro", "enterprise", "lifetime"]).default("all"),
        page: z.coerce.number().int().min(1).default(1),
        pageSize: z.coerce.number().int().min(1).max(100).default(25),
        q: z.string().trim().optional(),
      })
      .parse(req.query);
    const where: Prisma.UserWhereInput = {
      AND: [
        ...(query.q
          ? [{ OR: [{ name: { contains: query.q } }, { email: { contains: query.q } }, { institution: { contains: query.q } }] }]
          : []),
        query.filter === "active"
          ? { isActive: true }
          : query.filter === "disabled"
            ? { isActive: false }
            : query.filter === "free"
              ? { subscription: { tier: "FREE" } }
              : query.filter === "pro"
                ? { subscription: { tier: "PROFESSIONAL" } }
                : query.filter === "enterprise"
                  ? { subscription: { tier: "ENTERPRISE" } }
                  : query.filter === "lifetime"
                    ? { OR: [{ isLifetime: true }, { subscription: { tier: "LIFETIME" } }] }
                    : {},
      ],
    };
    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        include: { subscription: true },
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        where,
      }),
    ]);
    res.json({
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.ceil(total / query.pageSize),
      users: users.map((user) => ({ ...serializeUser(user), isLifetime: user.isLifetime })),
    });
  } catch (error) {
    next(error);
  }
});

const createUserSchema = z.object({
  email: z.string().email(),
  institution: z.string().trim().max(120).optional(),
  name: z.string().trim().min(2).max(120),
  password: z.string().min(8).max(128).default("ChangeMe123!"),
  role: z.enum(["admin", "doctor", "student"]),
});

superAdminRouter.post("/users", async (req, res, next) => {
  try {
    const body = createUserSchema.parse(req.body);
    const email = body.email.trim().toLowerCase();
    if (await prisma.user.findUnique({ where: { email } })) throw new AppError(409, "Email already exists.", "EMAIL_EXISTS");
    const user = await prisma.user.create({
      data: {
        avatarInitials: initialsForName(body.name),
        email,
        emailVerified: true,
        institution: body.institution,
        isActive: true,
        name: body.name,
        passwordHash: await hashPassword(body.password),
        role: fromApiRole(body.role),
        subscription: { create: { status: "ACTIVE", tier: body.role === "student" ? "FREE" : "PROFESSIONAL" } },
      },
      include: { subscription: true },
    });
    await auditAdminAction({ action: "CREATE_USER", actorId: req.auth!.id, targetId: user.id, targetType: "User" });
    res.status(201).json({ user: serializeUser(user) });
  } catch (error) {
    next(error);
  }
});

const editUserSchema = z.object({
  institution: z.string().trim().max(120).nullable().optional(),
  name: z.string().trim().min(2).max(120).optional(),
  role: z.enum(["admin", "doctor", "student"]).optional(),
});

superAdminRouter.patch("/users/:userId", async (req, res, next) => {
  try {
    const body = editUserSchema.parse(req.body);
    const target = await prisma.user.findUnique({ where: { id: String(req.params.userId) } });
    if (!target) throw new AppError(404, "User not found.", "USER_NOT_FOUND");
    assertCanModifyProtectedOwner(req.auth!.role, target);
    if (target.role === "SUPER_ADMIN" || target.role === "OWNER") throw new AppError(403, "Protected admin accounts cannot be downgraded.", "PRIVILEGE_ESCALATION_BLOCKED");
    const user = await prisma.user.update({
      data: {
        institution: body.institution,
        name: body.name,
        role: body.role ? fromApiRole(body.role) : undefined,
      },
      include: { subscription: true },
      where: { id: target.id },
    });
    await auditAdminAction({ action: "EDIT_USER", actorId: req.auth!.id, targetId: user.id, targetType: "User" });
    res.json({ user: serializeUser(user) });
  } catch (error) {
    next(error);
  }
});

superAdminRouter.post("/users/:userId/actions/:action", async (req, res, next) => {
  try {
    const action = z.enum(["disable", "enable", "force-logout", "reset-password"]).parse(req.params.action);
    const userId = String(req.params.userId);
    if (userId === req.auth!.id && action === "disable") throw new AppError(400, "You cannot disable yourself.", "SELF_STATUS");
    const target = await prisma.user.findUnique({ where: { id: userId } });
    if (!target) throw new AppError(404, "User not found.", "USER_NOT_FOUND");
    assertCanModifyProtectedOwner(req.auth!.role, target);
    if (isProtectedOwner(target) && action !== "reset-password") {
      throw new AppError(403, "Protected owner account cannot be disabled or force logged out.", "OWNER_IMMUTABLE");
    }
    if ((target.role === "SUPER_ADMIN" || target.role === "OWNER") && target.id !== req.auth!.id) {
      throw new AppError(403, "Protected admin account action blocked.", "PRIVILEGE_ESCALATION_BLOCKED");
    }
    if (action === "disable" || action === "enable") {
      await prisma.user.update({ data: { isActive: action === "enable" }, where: { id: userId } });
      if (action === "disable") await prisma.session.updateMany({ data: { revokedAt: new Date() }, where: { userId, revokedAt: null } });
    }
    if (action === "force-logout") await prisma.session.updateMany({ data: { revokedAt: new Date() }, where: { userId, revokedAt: null } });
    let resetPassword: string | undefined;
    if (action === "reset-password") {
      resetPassword = `Reset-${Math.random().toString(36).slice(2, 10)}!`;
      await prisma.user.update({
        data: { forcePasswordReset: true, passwordHash: await hashPassword(resetPassword), passwordChangedAt: new Date() },
        where: { id: userId },
      });
    }
    await auditAdminAction({ action: action.toUpperCase().replace("-", "_"), actorId: req.auth!.id, targetId: userId, targetType: "User" });
    res.json({ ok: true, resetPassword });
  } catch (error) {
    next(error);
  }
});

superAdminRouter.delete("/users/:userId", async (req, res, next) => {
  try {
    const userId = String(req.params.userId);
    if (userId === req.auth!.id) throw new AppError(400, "You cannot delete yourself.", "SELF_DELETE");
    const target = await prisma.user.findUnique({ where: { id: userId } });
    if (!target) throw new AppError(404, "User not found.", "USER_NOT_FOUND");
    if (target.role === "SUPER_ADMIN" || target.role === "OWNER" || target.protectedOwner) throw new AppError(403, "Super Admin and Owner accounts cannot be deleted.", "PROTECTED_ACCOUNT");
    await prisma.user.delete({ where: { id: userId } });
    await auditAdminAction({ action: "DELETE_USER", actorId: req.auth!.id, targetId: userId, targetType: "User" });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

const changePlanSchema = z.object({ plan: z.enum(["BASIC", "FREE", "PRO", "PROFESSIONAL", "ENTERPRISE"]) });

superAdminRouter.post("/users/:userId/plan", async (req, res, next) => {
  try {
    const { plan } = changePlanSchema.parse(req.body);
    const subscription = await activateUserPlan(String(req.params.userId), planFromInput(plan));
    await auditAdminAction({ action: "CHANGE_PLAN", actorId: req.auth!.id, metadata: { plan }, targetId: String(req.params.userId), targetType: "User" });
    res.json({ subscription });
  } catch (error) {
    next(error);
  }
});

superAdminRouter.post("/users/:userId/lifetime", async (req, res, next) => {
  try {
    const license = await grantLifetimeLicense(String(req.params.userId), req.auth!.id, "Super Admin lifetime grant");
    await auditAdminAction({ action: "GRANT_LICENSE", actorId: req.auth!.id, targetId: String(req.params.userId), targetType: "User" });
    res.status(201).json({ license });
  } catch (error) {
    next(error);
  }
});

superAdminRouter.delete("/users/:userId/lifetime", async (req, res, next) => {
  try {
    const result = await revokeLifetimeLicense(String(req.params.userId), req.auth!.id, "Super Admin lifetime revoke");
    await auditAdminAction({ action: "REVOKE_LICENSE", actorId: req.auth!.id, targetId: String(req.params.userId), targetType: "User" });
    res.json(result);
  } catch (error) {
    next(error);
  }
});

const extendSubscriptionSchema = z.object({ months: z.number().int().min(1).max(36).default(1) });

superAdminRouter.post("/users/:userId/subscription/extend", async (req, res, next) => {
  try {
    const { months } = extendSubscriptionSchema.parse(req.body);
    const userId = String(req.params.userId);
    const subscription = await prisma.userSubscription.findFirst({
      include: { plan: true },
      orderBy: { updatedAt: "desc" },
      where: { status: "ACTIVE", userId },
    });
    if (!subscription) throw new AppError(404, "Active subscription not found.", "SUBSCRIPTION_NOT_FOUND");
    if (subscription.plan.code === "LIFETIME") throw new AppError(400, "Lifetime access has no expiration date.", "LIFETIME_NO_EXPIRATION");
    const base = subscription.expirationDate && subscription.expirationDate > new Date() ? subscription.expirationDate : new Date();
    const expirationDate = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + months, base.getUTCDate()));
    const updated = await prisma.userSubscription.update({
      data: { currentPeriodEnd: expirationDate, expirationDate, renewalDate: expirationDate },
      where: { id: subscription.id },
    });
    await auditAdminAction({ action: "EXTEND_SUBSCRIPTION", actorId: req.auth!.id, metadata: { months }, targetId: userId, targetType: "User" });
    res.json({ subscription: updated });
  } catch (error) {
    next(error);
  }
});

const planSchema = z.object({
  currency: z.string().min(3).max(3).default("USD"),
  features: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
  monthlyQuota: z.number().int().min(0).nullable().optional(),
  name: z.string().min(2),
  plan: z.enum(["BASIC", "FREE", "PRO", "PROFESSIONAL", "ENTERPRISE"]),
  price: z.number().int().min(0),
});

superAdminRouter.get("/plans", async (_req, res, next) => {
  try {
    const plans = await prisma.subscriptionPlan.findMany({ orderBy: { priceCents: "asc" } });
    res.json({
      plans: plans.map((plan) => ({
        currency: plan.currency,
        features: plan.features,
        id: plan.id,
        isActive: plan.isActive && plan.active,
        monthlyQuota: plan.monthlyQuota ?? plan.analysisQuota,
        name: plan.name,
        plan: planToApi(plan.code),
        price: plan.priceCents,
      })),
    });
  } catch (error) {
    next(error);
  }
});

superAdminRouter.post("/plans", async (req, res, next) => {
  try {
    const body = planSchema.parse(req.body);
    const plan = await prisma.subscriptionPlan.upsert({
      create: {
        active: body.isActive,
        analysisQuota: body.plan === "ENTERPRISE" ? null : body.monthlyQuota,
        code: planFromInput(body.plan),
        currency: body.currency,
        features: body.features,
        isActive: body.isActive,
        monthlyQuota: body.monthlyQuota,
        name: body.name,
        priceCents: body.price,
        quotaWindowHours: body.plan === "FREE" ? 24 : 720,
      },
      update: {
        active: body.isActive,
        analysisQuota: body.plan === "ENTERPRISE" ? null : body.monthlyQuota,
        currency: body.currency,
        features: body.features,
        isActive: body.isActive,
        monthlyQuota: body.monthlyQuota,
        name: body.name,
        priceCents: body.price,
      },
      where: { code: planFromInput(body.plan) },
    });
    await auditAdminAction({ action: "UPSERT_PLAN", actorId: req.auth!.id, metadata: { plan: body.plan }, targetId: plan.id, targetType: "SubscriptionPlan" });
    res.status(201).json({ plan });
  } catch (error) {
    next(error);
  }
});

superAdminRouter.patch("/plans/:planId", async (req, res, next) => {
  try {
    const body = planSchema.partial().parse(req.body);
    const plan = await prisma.subscriptionPlan.update({
      data: {
        active: body.isActive,
        currency: body.currency,
        features: body.features,
        isActive: body.isActive,
        monthlyQuota: body.monthlyQuota,
        name: body.name,
        priceCents: body.price,
      },
      where: { id: String(req.params.planId) },
    });
    await auditAdminAction({ action: "EDIT_PLAN", actorId: req.auth!.id, targetId: plan.id, targetType: "SubscriptionPlan" });
    res.json({ plan });
  } catch (error) {
    next(error);
  }
});

superAdminRouter.get("/revenue", async (_req, res, next) => {
  try {
    const transactions = await prisma.paymentTransaction.findMany({ orderBy: { createdAt: "desc" }, take: 500 });
    const byDay = new Map<string, number>();
    const byMonth = new Map<string, number>();
    for (const tx of transactions.filter((item) => item.status === "SUCCESS")) {
      const day = tx.createdAt.toISOString().slice(0, 10);
      const month = tx.createdAt.toISOString().slice(0, 7);
      byDay.set(day, (byDay.get(day) ?? 0) + tx.amount);
      byMonth.set(month, (byMonth.get(month) ?? 0) + tx.amount);
    }
    res.json({
      revenue: {
        byDay: [...byDay.entries()].map(([date, amount]) => ({ amount, date })),
        byMonth: [...byMonth.entries()].map(([month, amount]) => ({ amount, month })),
        byPlan: await prisma.subscription.groupBy({ by: ["tier"], _count: { _all: true } }),
        paymentStatus: await prisma.paymentTransaction.groupBy({ by: ["status"], _count: { _all: true } }),
        transactions,
        userGrowth: await prisma.user.groupBy({ by: ["role"], _count: { _all: true } }),
        usageTrend: await prisma.usageRecord.groupBy({ by: ["action"], _sum: { quantity: true } }),
      },
    });
  } catch (error) {
    next(error);
  }
});

const paymentSchema = z.object({
  amount: z.number().int().min(0),
  currency: z.string().min(3).max(3).default("USD"),
  paymentMethod: z.enum(["Credit Card", "Visa", "Mobile Wallet", "InstaPay"]),
  referenceNumber: z.string().optional(),
  status: z.enum(["PENDING", "SUCCESS", "FAILED", "REFUNDED"]).default("PENDING"),
  userId: z.string().min(1),
});

superAdminRouter.post("/payments", async (req, res, next) => {
  try {
    const body = paymentSchema.parse(req.body);
    const transaction = await prisma.paymentTransaction.create({ data: body });
    await auditAdminAction({ action: "PAYMENT_UPDATED", actorId: req.auth!.id, metadata: { status: body.status }, targetId: transaction.id, targetType: "PaymentTransaction" });
    res.status(201).json({ transaction });
  } catch (error) {
    next(error);
  }
});

const giftSchema = z.object({ duration: z.enum(["1_MONTH", "3_MONTHS", "6_MONTHS", "12_MONTHS", "LIFETIME"]), userId: z.string().min(1) });

superAdminRouter.post("/gift-licenses", async (req, res, next) => {
  try {
    const body = giftSchema.parse(req.body);
    const now = new Date();
    const months = { "1_MONTH": 1, "3_MONTHS": 3, "6_MONTHS": 6, "12_MONTHS": 12, LIFETIME: 0 }[body.duration];
    const expiresAt = body.duration === "LIFETIME" ? null : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + months, now.getUTCDate()));
    const gift = await prisma.giftLicense.create({
      data: { duration: body.duration, expiresAt, giftedById: req.auth!.id, metadata: { duration: body.duration }, userId: body.userId },
    });
    if (body.duration === "LIFETIME") await grantLifetimeLicense(body.userId, req.auth!.id, "Gift lifetime license");
    else await activateUserPlan(body.userId, "PROFESSIONAL");
    await auditAdminAction({ action: "GIFT_LICENSE", actorId: req.auth!.id, metadata: { duration: body.duration }, targetId: body.userId, targetType: "User" });
    res.status(201).json({ gift });
  } catch (error) {
    next(error);
  }
});

superAdminRouter.get("/licenses", async (_req, res, next) => {
  try {
    const [licenses, gifts] = await Promise.all([
      prisma.license.findMany({
        include: {
          grantedBy: { select: { email: true, name: true, username: true } },
          user: { select: { email: true, name: true, username: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.giftLicense.findMany({
        include: {
          giftedBy: { select: { email: true, name: true, username: true } },
          user: { select: { email: true, name: true, username: true } },
        },
        orderBy: { giftedAt: "desc" },
      }),
    ]);
    res.json({
      gifts: gifts.map((gift) => ({
        email: gift.user.email,
        expiryDate: gift.expiresAt,
        grantedBy: gift.giftedBy.name,
        id: gift.id,
        startDate: gift.startsAt,
        status: gift.expiresAt && gift.expiresAt < new Date() ? "EXPIRED" : "ACTIVE",
        subscriptionType: gift.duration.replaceAll("_", " "),
        userId: gift.userId,
        userName: gift.user.name,
        username: gift.user.username,
      })),
      licenses: licenses.map((license) => ({
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
      })),
    });
  } catch (error) {
    next(error);
  }
});

superAdminRouter.get("/audit", async (req, res, next) => {
  try {
    const query = z.object({ page: z.coerce.number().int().min(1).default(1), pageSize: z.coerce.number().int().min(1).max(100).default(50), q: z.string().optional() }).parse(req.query);
    const where: Prisma.AuditLogWhereInput = query.q ? { OR: [{ message: { contains: query.q } }, { entityType: { contains: query.q } }] } : {};
    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, skip: (query.page - 1) * query.pageSize, take: query.pageSize, where }),
    ]);
    res.json({ logs, page: query.page, pageSize: query.pageSize, total, totalPages: Math.ceil(total / query.pageSize) });
  } catch (error) {
    next(error);
  }
});
