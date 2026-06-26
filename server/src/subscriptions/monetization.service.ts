import type { BillingEventType, PaymentProvider, Prisma, SubscriptionTier } from "@prisma/client";
import { prisma } from "../config/prisma";
import { AppError } from "../middleware/error";
import { paymentProvider } from "../services/payments";

const defaultPlans: Array<{
  aiFeatureAccess?: Prisma.InputJsonObject;
  analysisQuota: number | null;
  billingCycle: "DAILY" | "LIFETIME" | "MONTHLY";
  code: SubscriptionTier;
  description: string;
  gracePeriodDays?: number;
  maxOrganizations?: number | null;
  maxUsers?: number | null;
  multiUser?: boolean;
  name: string;
  priceCents: number;
  quotaWindowHours: number | null;
  storageQuotaMb?: number | null;
  teamManagement?: boolean;
  trialDays?: number;
}> = [
  { aiFeatureAccess: { basicAi: true, copilot: false, realAi: false }, analysisQuota: 5, billingCycle: "MONTHLY", code: "FREE", description: "Starter plan with 5 ECG analyses per month.", maxOrganizations: 1, maxUsers: 1, name: "Free", priceCents: 0, quotaWindowHours: 720, storageQuotaMb: 512, trialDays: 0 },
  { aiFeatureAccess: { basicAi: true, copilot: true, realAi: false }, analysisQuota: 150, billingCycle: "MONTHLY", code: "CLINIC", description: "Clinic plan for small cardiology teams.", maxOrganizations: 1, maxUsers: 10, multiUser: true, name: "Clinic", priceCents: 4900, quotaWindowHours: 720, storageQuotaMb: 10_240, teamManagement: true, trialDays: 14 },
  { aiFeatureAccess: { advancedReporting: true, basicAi: true, copilot: true, realAi: true }, analysisQuota: 1_000, billingCycle: "MONTHLY", code: "HOSPITAL", description: "Hospital plan with advanced AI and larger quotas.", maxOrganizations: 3, maxUsers: 75, multiUser: true, name: "Hospital", priceCents: 14900, quotaWindowHours: 720, storageQuotaMb: 102_400, teamManagement: true, trialDays: 14 },
  { aiFeatureAccess: { advancedReporting: true, apiAccess: true, basicAi: true, copilot: true, realAi: true }, analysisQuota: null, billingCycle: "MONTHLY", code: "ENTERPRISE", description: "Enterprise plan with unlimited analyses and organization management.", maxOrganizations: null, maxUsers: null, multiUser: true, name: "Enterprise", priceCents: 29900, quotaWindowHours: 720, storageQuotaMb: null, teamManagement: true, trialDays: 30 },
  { aiFeatureAccess: { basicAi: true, copilot: true, realAi: false }, analysisQuota: 150, billingCycle: "MONTHLY", code: "BASIC", description: "Legacy alias for Clinic.", maxOrganizations: 1, maxUsers: 10, multiUser: true, name: "Basic", priceCents: 4900, quotaWindowHours: 720, storageQuotaMb: 10_240, teamManagement: true, trialDays: 14 },
  { aiFeatureAccess: { advancedReporting: true, basicAi: true, copilot: true, realAi: true }, analysisQuota: 1_000, billingCycle: "MONTHLY", code: "PROFESSIONAL", description: "Legacy alias for Hospital.", maxOrganizations: 3, maxUsers: 75, multiUser: true, name: "Professional", priceCents: 14900, quotaWindowHours: 720, storageQuotaMb: 102_400, teamManagement: true, trialDays: 14 },
  { aiFeatureAccess: { advancedReporting: true, apiAccess: true, basicAi: true, copilot: true, realAi: true }, analysisQuota: null, billingCycle: "MONTHLY", code: "UNLIMITED", description: "Legacy unlimited enterprise plan.", maxOrganizations: null, maxUsers: null, multiUser: true, name: "Unlimited", priceCents: 29900, quotaWindowHours: 720, storageQuotaMb: null, teamManagement: true, trialDays: 30 },
  { aiFeatureAccess: { advancedReporting: true, apiAccess: true, basicAi: true, copilot: true, realAi: true }, analysisQuota: null, billingCycle: "LIFETIME", code: "LIFETIME", description: "Owner-granted permanent unlimited access.", maxOrganizations: null, maxUsers: null, name: "Lifetime Premium", priceCents: 0, quotaWindowHours: null, storageQuotaMb: null },
];

export async function ensureDefaultPlans() {
  await Promise.all(
    defaultPlans.map((plan) =>
      prisma.subscriptionPlan.upsert({
        create: {
          active: true,
          aiFeatureAccess: plan.aiFeatureAccess,
          analysisQuota: plan.analysisQuota,
          billingCycle: plan.billingCycle,
          code: plan.code,
          description: plan.description,
          gracePeriodDays: plan.gracePeriodDays ?? 7,
          maxOrganizations: plan.maxOrganizations,
          maxUsers: plan.maxUsers,
          multiUser: plan.multiUser ?? false,
          name: plan.name,
          priceCents: plan.priceCents,
          quotaWindowHours: plan.quotaWindowHours,
          storageQuotaMb: plan.storageQuotaMb,
          teamManagement: plan.teamManagement ?? false,
          trialDays: plan.trialDays ?? 0,
        },
        update: {
          aiFeatureAccess: plan.aiFeatureAccess,
          gracePeriodDays: plan.gracePeriodDays ?? 7,
          maxOrganizations: plan.maxOrganizations,
          maxUsers: plan.maxUsers,
          storageQuotaMb: plan.storageQuotaMb,
          trialDays: plan.trialDays ?? 0,
        },
        where: { code: plan.code },
      }),
    ),
  );
}

function windowFor(plan: { billingCycle: string; quotaWindowHours: number | null }, now = new Date()) {
  if (plan.quotaWindowHours) {
    return {
      end: new Date(now.getTime() + plan.quotaWindowHours * 60 * 60 * 1000),
      start: new Date(now.getTime() - plan.quotaWindowHours * 60 * 60 * 1000),
    };
  }
  const start = new Date(now);
  start.setUTCDate(1);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setUTCMonth(end.getUTCMonth() + 1);
  return { end, start };
}

async function latestCommercialSubscription(userId: string) {
  await reconcileSubscriptionLifecycle(userId);
  return prisma.userSubscription.findFirst({
    include: { plan: true },
    orderBy: { updatedAt: "desc" },
    where: {
      status: { in: ["ACTIVE", "TRIALING"] },
      userId,
    },
  });
}

export async function reconcileSubscriptionLifecycle(userId: string, now = new Date()) {
  const subscriptions = await prisma.userSubscription.findMany({
    include: { plan: true },
    where: { status: { in: ["ACTIVE", "TRIALING", "PAST_DUE"] }, userId },
  });
  for (const subscription of subscriptions) {
    if (subscription.status === "TRIALING" && subscription.trialEndsAt) {
      const daysLeft = Math.ceil((subscription.trialEndsAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
      if (daysLeft <= 3 && daysLeft >= 0) {
        await notifyUser(userId, "Trial ending soon", `Your ${subscription.plan.name} trial ends in ${daysLeft} day(s).`, "WARNING");
        await createBillingEvent({ message: "Trial ending notification generated.", metadata: { daysLeft, plan: subscription.plan.code }, subscriptionId: subscription.id, type: "TRIAL_ENDING", userId });
      }
      if (subscription.trialEndsAt <= now) {
        const graceEndsAt = new Date(now.getTime() + subscription.plan.gracePeriodDays * 24 * 60 * 60 * 1000);
        await prisma.userSubscription.update({
          data: { graceEndsAt, status: "PAST_DUE" },
          where: { id: subscription.id },
        });
        await notifyUser(userId, "Payment required", `Your ${subscription.plan.name} trial ended. Payment is required before ${graceEndsAt.toISOString()}.`, "WARNING");
        await createBillingEvent({ message: "Subscription moved from trial to grace period.", metadata: { graceEndsAt: graceEndsAt.toISOString(), plan: subscription.plan.code }, subscriptionId: subscription.id, type: "PAYMENT_REQUIRED", userId });
      }
    }
    const graceExpired = subscription.status === "PAST_DUE" && subscription.graceEndsAt && subscription.graceEndsAt <= now;
    const periodExpired = subscription.status === "ACTIVE" && subscription.expirationDate && subscription.expirationDate <= now;
    if (graceExpired || periodExpired) {
      await prisma.userSubscription.update({
        data: { status: "EXPIRED" },
        where: { id: subscription.id },
      });
      await prisma.subscription.upsert({
        create: { status: "EXPIRED", tier: subscription.plan.code, userId },
        update: { status: "EXPIRED", tier: subscription.plan.code },
        where: { userId },
      });
      await notifyUser(userId, "Subscription expired", `Your ${subscription.plan.name} subscription has expired.`, "CRITICAL");
      await createBillingEvent({ message: "Subscription expired.", metadata: { plan: subscription.plan.code }, subscriptionId: subscription.id, type: "SUBSCRIPTION_EXPIRED", userId });
    }
  }
}

async function activeLifetimeLicense(userId: string) {
  const now = new Date();
  return prisma.license.findFirst({
    where: {
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      status: "ACTIVE",
      type: "LIFETIME",
      userId,
    },
  });
}

async function legacySubscriptionPlan(userId: string) {
  const legacy = await prisma.subscription.findUnique({ where: { userId } });
  const plan = await prisma.subscriptionPlan.findUnique({ where: { code: legacy?.tier ?? "FREE" } });
  if (!plan) throw new AppError(500, "Default subscription plans are not configured.", "PLANS_MISSING");
  return { legacy, plan };
}

export async function subscriptionSummary(userId: string) {
  await ensureDefaultPlans();
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (user?.isLifetime) {
    const plan = await prisma.subscriptionPlan.findUniqueOrThrow({ where: { code: "LIFETIME" } });
    return { license: null, plan, subscription: null };
  }
  const license = await activeLifetimeLicense(userId);
  if (license) {
    const plan = await prisma.subscriptionPlan.findUniqueOrThrow({ where: { code: "LIFETIME" } });
    return { license, plan, subscription: null };
  }

  const commercial = await latestCommercialSubscription(userId);
  if (commercial) return { license: null, plan: commercial.plan, subscription: commercial };

  const { legacy, plan } = await legacySubscriptionPlan(userId);
  return { license: null, plan, subscription: legacy };
}

export async function quotaSnapshot(userId: string) {
  const summary = await subscriptionSummary(userId);
  const unlimited = summary.plan.analysisQuota === null || summary.plan.code === "LIFETIME";
  const { end, start } = windowFor(summary.plan);
  const used = unlimited
    ? 0
    : await prisma.usageRecord.aggregate({
        _sum: { quantity: true },
        where: { action: "ECG_ANALYSIS", createdAt: { gte: start, lt: end }, userId },
      }).then((result) => result._sum.quantity ?? 0);

  const quota = summary.plan.analysisQuota;
  const limits = {
    aiFeatureAccess: summary.plan.aiFeatureAccess,
    maxOrganizations: summary.plan.maxOrganizations,
    maxUsers: summary.plan.maxUsers,
    storageQuotaMb: summary.plan.storageQuotaMb,
  };
  return {
    canAnalyze: unlimited || used < (quota ?? 0),
    isUnlimited: unlimited,
    nextResetAt: end,
    plan: summary.plan,
    quota,
    remaining: unlimited ? null : Math.max((quota ?? 0) - used, 0),
    limits,
    subscription: summary.subscription,
    used,
    warning: !unlimited && quota ? used >= Math.floor(quota * 0.8) : false,
  };
}

async function createBillingEvent(input: {
  message: string;
  metadata?: Prisma.InputJsonObject;
  subscriptionId?: string | null;
  type: BillingEventType;
  userId?: string | null;
}) {
  return prisma.billingEvent.create({
    data: {
      message: input.message,
      metadata: input.metadata,
      subscriptionId: input.subscriptionId,
      type: input.type,
      userId: input.userId,
    },
  });
}

async function notifyUser(userId: string, title: string, message: string, type: "CRITICAL" | "INFO" | "SUCCESS" | "WARNING") {
  await prisma.notification.create({ data: { message, title, type, userId } });
}

export async function assertCanRunAnalysis(userId: string) {
  const snapshot = await quotaSnapshot(userId);
  if (!snapshot.canAnalyze) {
    await createBillingEvent({
      message: "ECG analysis quota exhausted.",
      metadata: { nextResetAt: snapshot.nextResetAt.toISOString(), plan: snapshot.plan.code },
      subscriptionId: "planId" in (snapshot.subscription ?? {}) ? snapshot.subscription?.id : null,
      type: "QUOTA_EXHAUSTED",
      userId,
    });
    await notifyUser(userId, "ECG quota exhausted", `Your ${snapshot.plan.name} quota is exhausted. Next reset: ${snapshot.nextResetAt.toISOString()}.`, "CRITICAL");
    throw new AppError(402, `ECG analysis quota exhausted. Next reset: ${snapshot.nextResetAt.toISOString()}.`, "SUBSCRIPTION_QUOTA_EXHAUSTED");
  }
  return snapshot;
}

export async function recordAnalysisUsage(userId: string, metadata: Prisma.InputJsonObject = {}) {
  const snapshot = await quotaSnapshot(userId);
  const { end, start } = windowFor(snapshot.plan);
  const subscriptionId = "planId" in (snapshot.subscription ?? {}) ? snapshot.subscription?.id : null;
  const usage = await prisma.usageRecord.create({
    data: {
      action: "ECG_ANALYSIS",
      metadata,
      quantity: 1,
      subscriptionId,
      userId,
      windowEnd: end,
      windowStart: start,
    },
  });
  await prisma.usageTracking.upsert({
    create: {
      exceeded: !snapshot.isUnlimited && snapshot.quota !== null && 1 > snapshot.quota,
      metadata: { action: "ECG_ANALYSIS", plan: snapshot.plan.code } as Prisma.InputJsonObject,
      metric: "ECG_ANALYSIS",
      quantity: 1,
      quota: snapshot.quota,
      subscriptionId,
      userId,
      windowEnd: end,
      windowStart: start,
    },
    update: {
      exceeded: !snapshot.isUnlimited && snapshot.quota !== null ? snapshot.used + 1 > snapshot.quota : false,
      quantity: { increment: 1 },
      quota: snapshot.quota,
    },
    where: { userId_metric_windowStart_windowEnd: { metric: "ECG_ANALYSIS", userId, windowEnd: end, windowStart: start } },
  });
  const updated = await quotaSnapshot(userId);

  if (updated.warning && updated.quota && updated.used === Math.floor(updated.quota * 0.8)) {
    await createBillingEvent({
      message: "ECG analysis quota reached 80%.",
      metadata: { plan: updated.plan.code, quota: updated.quota, used: updated.used },
      subscriptionId,
      type: "QUOTA_WARNING",
      userId,
    });
    await notifyUser(userId, "ECG quota warning", `You have used ${updated.used}/${updated.quota} ECG analyses.`, "WARNING");
  }

  await createBillingEvent({
    message: "ECG analysis usage recorded.",
    metadata: { ...metadata, plan: updated.plan.code },
    subscriptionId,
    type: "USAGE_RECORDED",
    userId,
  });

  return usage;
}

function invoiceNumber() {
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `INV-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${random}`;
}

export async function createInvoiceForSubscription(subscriptionId: string) {
  const subscription = await prisma.userSubscription.findUnique({
    include: { plan: true, user: true },
    where: { id: subscriptionId },
  });
  if (!subscription) throw new AppError(404, "Subscription not found.", "SUBSCRIPTION_NOT_FOUND");
  const dueAt = new Date(Date.now() + subscription.plan.gracePeriodDays * 24 * 60 * 60 * 1000);
  const invoice = await prisma.invoice.create({
    data: {
      amountCents: subscription.plan.priceCents,
      currency: subscription.plan.currency,
      dueAt,
      invoiceNumber: invoiceNumber(),
      lineItems: {
        items: [
          {
            amountCents: subscription.plan.priceCents,
            description: `${subscription.plan.name} subscription`,
            planCode: subscription.plan.code,
            quantity: 1,
          },
        ],
      } as Prisma.InputJsonObject,
      planId: subscription.planId,
      status: subscription.plan.priceCents === 0 ? "PAID" : "PENDING",
      subscriptionId: subscription.id,
      userId: subscription.userId,
      paidAt: subscription.plan.priceCents === 0 ? new Date() : undefined,
    },
  });
  await createBillingEvent({
    message: `Invoice ${invoice.invoiceNumber} generated for ${subscription.plan.name}.`,
    metadata: { amountCents: invoice.amountCents, invoiceId: invoice.id, plan: subscription.plan.code } as Prisma.InputJsonObject,
    subscriptionId: subscription.id,
    type: "PAYMENT_REQUIRED",
    userId: subscription.userId,
  });
  await prisma.auditLog.create({
    data: {
      action: "INVOICE_CREATED",
      actorId: subscription.userId,
      entityId: invoice.id,
      entityType: "Invoice",
      message: `Invoice ${invoice.invoiceNumber} generated.`,
      metadata: { subscriptionId: subscription.id, userId: subscription.userId } as Prisma.InputJsonObject,
    },
  });
  if (invoice.status === "PENDING") {
    await notifyUser(subscription.userId, "Payment required", `Invoice ${invoice.invoiceNumber} is due by ${dueAt.toISOString()}.`, "WARNING");
  }
  return invoice;
}

export async function grantLifetimeLicense(userId: string, grantedById: string, reason?: string) {
  const license = await prisma.license.create({
    data: { grantedById, reason, status: "ACTIVE", type: "LIFETIME", userId },
  });
  await prisma.user.update({
    data: {
      isLifetime: true,
      lifetimeGrantedAt: new Date(),
      lifetimeGrantedBy: grantedById,
      lifetimeRevokedAt: null,
      lifetimeRevokedBy: null,
    },
    where: { id: userId },
  });
  await createBillingEvent({
    message: "Lifetime license granted.",
    metadata: { reason },
    type: "LICENSE_GRANTED",
    userId,
  });
  await notifyUser(userId, "Lifetime license activated", "Your ECG Insight lifetime license is now active.", "SUCCESS");
  return license;
}

export async function revokeLifetimeLicense(userId: string, revokedById: string, reason?: string) {
  const now = new Date();
  const result = await prisma.license.updateMany({
    data: { revokedAt: now, revokedById, status: "REVOKED" },
    where: { status: "ACTIVE", type: "LIFETIME", userId },
  });
  await prisma.user.update({
    data: { isLifetime: false, lifetimeRevokedAt: now, lifetimeRevokedBy: revokedById },
    where: { id: userId },
  });
  await prisma.subscription.upsert({
    create: { status: "ACTIVE", tier: "FREE", userId },
    update: { status: "ACTIVE", tier: "FREE" },
    where: { userId },
  });
  await createBillingEvent({
    message: "Lifetime license revoked.",
    metadata: { reason, revokedById },
    type: "LICENSE_REVOKED",
    userId,
  });
  await notifyUser(userId, "Lifetime access revoked", "Your special lifetime access was revoked by an administrator.", "WARNING");
  return { revokedCount: result.count };
}

export async function activateUserPlan(userId: string, planCode: SubscriptionTier) {
  await ensureDefaultPlans();
  const plan = await prisma.subscriptionPlan.findUnique({ where: { code: planCode } });
  if (!plan) throw new AppError(404, "Subscription plan not found.", "PLAN_NOT_FOUND");
  const now = new Date();
  const { end } = windowFor(plan, now);
  const trialEndsAt = plan.trialDays > 0 ? new Date(now.getTime() + plan.trialDays * 24 * 60 * 60 * 1000) : null;
  const subscription = await prisma.userSubscription.create({
    data: {
      currentPeriodEnd: plan.billingCycle === "LIFETIME" ? null : end,
      currentPeriodStart: now,
      expirationDate: plan.billingCycle === "LIFETIME" ? null : end,
      planId: plan.id,
      renewalDate: plan.billingCycle === "LIFETIME" ? null : end,
      status: trialEndsAt ? "TRIALING" : "ACTIVE",
      trialEndsAt,
      userId,
    },
  });
  await prisma.subscription.upsert({
    create: { currentPeriodEnd: end, currentPeriodStart: now, status: trialEndsAt ? "TRIALING" : "ACTIVE", tier: plan.code, userId },
    update: { currentPeriodEnd: end, currentPeriodStart: now, status: trialEndsAt ? "TRIALING" : "ACTIVE", tier: plan.code },
    where: { userId },
  });
  const invoice = await createInvoiceForSubscription(subscription.id);
  await createBillingEvent({
    message: trialEndsAt ? `Trial started for ${plan.name}.` : `Subscription activated for ${plan.name}.`,
    metadata: { invoiceId: invoice.id, plan: plan.code, trialEndsAt: trialEndsAt?.toISOString() },
    subscriptionId: subscription.id,
    type: "SUBSCRIPTION_UPDATED",
    userId,
  });
  await notifyUser(userId, trialEndsAt ? "Trial started" : "Subscription activated", trialEndsAt ? `Your ${plan.name} trial ends on ${trialEndsAt.toISOString()}.` : `Your ${plan.name} subscription is active.`, "SUCCESS");
  return subscription;
}

export async function initiatePayment(userId: string, planCode: SubscriptionTier, provider: PaymentProvider) {
  await ensureDefaultPlans();
  const [user, plan] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.subscriptionPlan.findUnique({ where: { code: planCode } }),
  ]);
  if (!user) throw new AppError(404, "User not found.", "USER_NOT_FOUND");
  if (!plan) throw new AppError(404, "Subscription plan not found.", "PLAN_NOT_FOUND");

  const payment = await prisma.payment.create({
    data: {
      amountCents: plan.priceCents,
      currency: plan.currency,
      paymentMethod: provider,
      provider,
      status: provider === "INSTAPAY" || provider === "WALLET" ? "PENDING" : "PENDING",
      userId,
    },
  });
  const initiation = await paymentProvider(provider).initiate({
    amountCents: payment.amountCents,
    currency: payment.currency,
    paymentId: payment.id,
    planCode,
    userEmail: user.email,
    userId,
  });
  const updated = await prisma.payment.update({
    data: {
      providerPayload: initiation.providerPayload as Prisma.InputJsonObject,
      transactionId: initiation.transactionId,
    },
    where: { id: payment.id },
  });
  await createBillingEvent({
    message: `Payment initiated through ${provider}.`,
    metadata: { plan: planCode, redirectUrl: initiation.redirectUrl },
    type: "PAYMENT_INITIATED",
    userId,
  });
  return { initiation, payment: updated };
}

export async function ownerAnalytics() {
  await ensureDefaultPlans();
  const now = new Date();
  const today = new Date(now);
  today.setUTCHours(0, 0, 0, 0);
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const [totalUsers, activeUsers, monthlyRevenue, dailyAnalyses, plans, expiringSubscriptions, paymentStatuses] =
    await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.payment.aggregate({ _sum: { amountCents: true }, where: { createdAt: { gte: monthStart }, status: { in: ["APPROVED", "PAID"] } } }),
      prisma.usageRecord.aggregate({ _sum: { quantity: true }, where: { action: "ECG_ANALYSIS", createdAt: { gte: today } } }),
      prisma.userSubscription.groupBy({ by: ["planId"], _count: { _all: true }, where: { status: "ACTIVE" } }),
      prisma.userSubscription.findMany({
        include: { plan: true, user: true },
        orderBy: { expirationDate: "asc" },
        take: 10,
        where: { expirationDate: { gte: now, lte: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000) }, status: "ACTIVE" },
      }),
      prisma.payment.groupBy({ by: ["status"], _count: { _all: true } }),
    ]);
  const allPlans = await prisma.subscriptionPlan.findMany();
  const planMap = new Map(allPlans.map((plan) => [plan.id, plan]));

  return {
    activeUsers,
    dailyAnalyses: dailyAnalyses._sum.quantity ?? 0,
    expiringSubscriptions: expiringSubscriptions.map((subscription) => ({
      expirationDate: subscription.expirationDate,
      plan: subscription.plan.name,
      userEmail: subscription.user.email,
      userId: subscription.userId,
    })),
    monthlyRevenueCents: monthlyRevenue._sum.amountCents ?? 0,
    paymentStatusSummary: paymentStatuses.map((item) => ({ count: item._count._all, status: item.status })),
    subscriptionDistribution: plans.map((item) => ({
      count: item._count._all,
      plan: planMap.get(item.planId)?.code ?? item.planId,
    })),
    totalUsers,
  };
}
