import crypto from "node:crypto";
import type { FinancialAuditAction, PaymentProvider, PaymentStatus, Prisma, RefundStatus, SubscriptionTier } from "@prisma/client";
import { prisma } from "../config/prisma";
import { AppError } from "../middleware/error";
import { paymentProvider } from "../services/payments";
import { activateUserPlan, createInvoiceForSubscription, ensureDefaultPlans } from "./monetization.service";

const paidStatuses: PaymentStatus[] = ["APPROVED", "PAID"];

function invoiceNumber() {
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `INV-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${random}`;
}

function addMonths(date: Date, months: number) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, date.getUTCDate(), date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds()));
}

export function requestHash(body: unknown) {
  return crypto.createHash("sha256").update(JSON.stringify(body ?? {})).digest("hex");
}

export function verifyWebhookSignature(payload: unknown, signature: string | undefined, secret = process.env["PAYMENT_WEBHOOK_SECRET"] ?? "dev-payment-webhook-secret") {
  if (!signature) return false;
  const expected = crypto.createHmac("sha256", secret).update(JSON.stringify(payload ?? {})).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

async function notifyUser(userId: string, title: string, message: string, type: "CRITICAL" | "INFO" | "SUCCESS" | "WARNING") {
  await prisma.notification.create({ data: { message, title, type, userId } });
}

export async function financialAudit(input: {
  action: FinancialAuditAction;
  actorId?: string | null;
  amountCents?: number | null;
  currency?: string | null;
  entityId?: string | null;
  entityType: string;
  ipAddress?: string | null;
  metadata?: Prisma.InputJsonObject;
  userAgent?: string | null;
  userId?: string | null;
}) {
  return prisma.financialAuditLog.create({
    data: {
      action: input.action,
      actorId: input.actorId,
      amountCents: input.amountCents,
      currency: input.currency,
      entityId: input.entityId,
      entityType: input.entityType,
      ipAddress: input.ipAddress,
      metadata: input.metadata,
      userAgent: input.userAgent,
      userId: input.userId,
    },
  });
}

async function idempotentResponse(route: string, key: string | undefined, body: unknown, userId?: string | null) {
  if (!key) return null;
  const hash = requestHash(body);
  const existing = await prisma.paymentIdempotencyKey.findUnique({ where: { key_route: { key, route } } });
  if (existing) {
    if (existing.requestHash !== hash) throw new AppError(409, "Idempotency key was reused with a different payload.", "IDEMPOTENCY_CONFLICT");
    return existing.responseJson;
  }
  await prisma.paymentIdempotencyKey.create({
    data: {
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      key,
      requestHash: hash,
      route,
      userId,
    },
  });
  return null;
}

async function storeIdempotentResponse(route: string, key: string | undefined, response: unknown, statusCode: number) {
  if (!key) return;
  await prisma.paymentIdempotencyKey.updateMany({
    data: { responseJson: response as Prisma.InputJsonObject, statusCode },
    where: { key, route },
  });
}

function fraudScore(input: { amountCents: number; provider: PaymentProvider; recentFailures: number }) {
  let score = 0;
  if (input.amountCents > 500_000) score += 35;
  if (input.provider === "BANK_TRANSFER" || input.provider === "INSTAPAY") score += 10;
  score += Math.min(40, input.recentFailures * 10);
  return Math.min(100, score);
}

export async function createCheckoutSession(input: {
  idempotencyKey?: string;
  ipAddress?: string;
  planCode: SubscriptionTier;
  provider: PaymentProvider;
  userAgent?: string;
  userId: string;
}) {
  const cached = await idempotentResponse("checkout-session", input.idempotencyKey, input, input.userId);
  if (cached) return cached;

  await ensureDefaultPlans();
  const [user, plan, recentFailures] = await Promise.all([
    prisma.user.findUnique({ where: { id: input.userId } }),
    prisma.subscriptionPlan.findUnique({ where: { code: input.planCode } }),
    prisma.payment.count({ where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, status: "FAILED", userId: input.userId } }),
  ]);
  if (!user) throw new AppError(404, "User not found.", "USER_NOT_FOUND");
  if (!plan) throw new AppError(404, "Subscription plan not found.", "PLAN_NOT_FOUND");

  const pendingSubscription = await prisma.userSubscription.create({
    data: {
      currentPeriodStart: new Date(),
      planId: plan.id,
      status: plan.priceCents === 0 ? "ACTIVE" : "PENDING_REVIEW",
      userId: input.userId,
    },
  });
  const invoice = await prisma.invoice.create({
    data: {
      amountCents: plan.priceCents,
      currency: plan.currency,
      dueAt: new Date(Date.now() + plan.gracePeriodDays * 24 * 60 * 60 * 1000),
      invoiceNumber: invoiceNumber(),
      lineItems: { items: [{ amountCents: plan.priceCents, description: `${plan.name} subscription`, planCode: plan.code, quantity: 1 }] } as Prisma.InputJsonObject,
      planId: plan.id,
      status: plan.priceCents === 0 ? "PAID" : "PENDING",
      subscriptionId: pendingSubscription.id,
      userId: input.userId,
    },
  });
  const score = fraudScore({ amountCents: plan.priceCents, provider: input.provider, recentFailures });
  const payment = await prisma.payment.create({
    data: {
      amountCents: plan.priceCents,
      currency: plan.currency,
      fraudScore: score,
      idempotencyKey: input.idempotencyKey,
      invoiceId: invoice.id,
      paymentMethod: input.provider,
      provider: input.provider,
      status: plan.priceCents === 0 ? "PAID" : "PENDING",
      subscriptionId: pendingSubscription.id,
      userId: input.userId,
    },
  });
  const initiation = await paymentProvider(input.provider).initiate({
    amountCents: payment.amountCents,
    currency: payment.currency,
    paymentId: payment.id,
    planCode: plan.code,
    userEmail: user.email,
    userId: user.id,
  });
  const updatedPayment = await prisma.payment.update({
    data: {
      checkoutSessionId: `${input.provider.toLowerCase()}_checkout_${payment.id}`,
      gatewayReference: initiation.transactionId,
      providerPayload: initiation.providerPayload as Prisma.InputJsonObject,
      transactionId: initiation.transactionId,
    },
    where: { id: payment.id },
  });
  const transaction = await prisma.paymentTransaction.create({
    data: {
      amount: updatedPayment.amountCents,
      currency: updatedPayment.currency,
      gatewayEventId: initiation.transactionId,
      idempotencyKey: input.idempotencyKey,
      invoiceId: invoice.id,
      paymentId: updatedPayment.id,
      paymentMethod: input.provider,
      provider: input.provider,
      providerPayload: initiation.providerPayload as Prisma.InputJsonObject,
      referenceNumber: initiation.transactionId,
      status: plan.priceCents === 0 ? "SUCCESS" : "PENDING",
      subscriptionId: pendingSubscription.id,
      userId: input.userId,
    },
  });
  await prisma.billingEvent.create({ data: { message: `Invoice ${invoice.invoiceNumber} generated.`, metadata: { invoiceId: invoice.id } as Prisma.InputJsonObject, subscriptionId: pendingSubscription.id, type: "INVOICE_GENERATED", userId: input.userId } });
  await prisma.billingEvent.create({ data: { message: `Checkout session created for ${plan.name}.`, metadata: { paymentId: updatedPayment.id, provider: input.provider } as Prisma.InputJsonObject, subscriptionId: pendingSubscription.id, type: "PAYMENT_INITIATED", userId: input.userId } });
  await notifyUser(input.userId, "Invoice generated", `Invoice ${invoice.invoiceNumber} is ready for payment.`, "INFO");
  await financialAudit({ action: score >= 70 ? "FRAUD_REVIEW_FLAGGED" : "CHECKOUT_CREATED", actorId: input.userId, amountCents: updatedPayment.amountCents, currency: updatedPayment.currency, entityId: updatedPayment.id, entityType: "Payment", ipAddress: input.ipAddress, metadata: { fraudScore: score, invoiceId: invoice.id, provider: input.provider } as Prisma.InputJsonObject, userAgent: input.userAgent, userId: input.userId });

  const response = { checkout: initiation, invoice, payment: updatedPayment, transaction };
  await storeIdempotentResponse("checkout-session", input.idempotencyKey, response, 201);
  return response;
}

export async function completePayment(input: {
  actorId?: string | null;
  failureReason?: string;
  paymentId: string;
  providerPayload?: Prisma.InputJsonObject;
  status: PaymentStatus;
}) {
  const payment = await prisma.payment.findUnique({ include: { invoice: true, subscription: { include: { plan: true } } }, where: { id: input.paymentId } });
  if (!payment) throw new AppError(404, "Payment not found.", "PAYMENT_NOT_FOUND");
  const paid = paidStatuses.includes(input.status);
  const updated = await prisma.payment.update({
    data: {
      callbackPayload: input.providerPayload,
      failureReason: input.failureReason,
      paidAt: paid ? new Date() : undefined,
      status: input.status,
    },
    where: { id: payment.id },
  });
  await prisma.paymentTransaction.create({
    data: {
      amount: payment.amountCents,
      currency: payment.currency,
      failureReason: input.failureReason,
      invoiceId: payment.invoiceId,
      paymentId: payment.id,
      paymentMethod: payment.paymentMethod ?? payment.provider,
      provider: payment.provider,
      providerPayload: input.providerPayload,
      referenceNumber: payment.transactionId,
      status: paid ? "SUCCESS" : input.status === "REFUNDED" ? "REFUNDED" : "FAILED",
      subscriptionId: payment.subscriptionId,
      userId: payment.userId,
    },
  });
  if (payment.invoiceId) {
    await prisma.invoice.update({ data: { paidAt: paid ? new Date() : undefined, status: paid ? "PAID" : input.status }, where: { id: payment.invoiceId } });
  }
  if (paid && payment.subscription?.plan) {
    await activateUserPlan(payment.userId, payment.subscription.plan.code);
    await notifyUser(payment.userId, "Payment successful", "Your payment was received and subscription is active.", "SUCCESS");
    await prisma.billingEvent.create({ data: { message: "Payment succeeded and subscription activated.", metadata: { paymentId: payment.id, provider: payment.provider } as Prisma.InputJsonObject, subscriptionId: payment.subscriptionId, type: "PAYMENT_APPROVED", userId: payment.userId } });
    await financialAudit({ action: "PAYMENT_SUCCEEDED", actorId: input.actorId ?? payment.userId, amountCents: payment.amountCents, currency: payment.currency, entityId: payment.id, entityType: "Payment", metadata: { provider: payment.provider } as Prisma.InputJsonObject, userId: payment.userId });
  } else if (!paid) {
    await notifyUser(payment.userId, "Payment failed", input.failureReason ?? "Your payment could not be completed.", "WARNING");
    await prisma.billingEvent.create({ data: { message: input.failureReason ?? "Payment failed.", metadata: { paymentId: payment.id, provider: payment.provider } as Prisma.InputJsonObject, subscriptionId: payment.subscriptionId, type: "PAYMENT_FAILED", userId: payment.userId } });
    await financialAudit({ action: "PAYMENT_FAILED", actorId: input.actorId ?? payment.userId, amountCents: payment.amountCents, currency: payment.currency, entityId: payment.id, entityType: "Payment", metadata: { reason: input.failureReason } as Prisma.InputJsonObject, userId: payment.userId });
  }
  return updated;
}

export async function retryPayment(paymentId: string, userId: string) {
  const payment = await prisma.payment.findFirst({ include: { subscription: { include: { plan: true } } }, where: { id: paymentId, userId } });
  if (!payment) throw new AppError(404, "Payment not found.", "PAYMENT_NOT_FOUND");
  if (!payment.subscription?.plan) throw new AppError(400, "Payment is not linked to a subscription plan.", "PAYMENT_PLAN_MISSING");
  await financialAudit({ action: "PAYMENT_RETRIED", actorId: userId, amountCents: payment.amountCents, currency: payment.currency, entityId: payment.id, entityType: "Payment", userId });
  return createCheckoutSession({ planCode: payment.subscription.plan.code, provider: payment.provider, userId });
}

export async function changeSubscriptionPlan(userId: string, planCode: SubscriptionTier) {
  const subscription = await activateUserPlan(userId, planCode);
  await prisma.billingEvent.create({ data: { message: `Subscription changed to ${planCode}.`, metadata: { plan: planCode } as Prisma.InputJsonObject, subscriptionId: subscription.id, type: "SUBSCRIPTION_UPDATED", userId } });
  await notifyUser(userId, "Subscription updated", `Your plan changed to ${planCode}.`, "SUCCESS");
  await financialAudit({ action: "SUBSCRIPTION_CHANGED", actorId: userId, entityId: subscription.id, entityType: "UserSubscription", metadata: { plan: planCode } as Prisma.InputJsonObject, userId });
  return subscription;
}

export async function cancelSubscription(userId: string, immediately = false) {
  const subscription = await prisma.userSubscription.findFirst({ include: { plan: true }, orderBy: { updatedAt: "desc" }, where: { status: { in: ["ACTIVE", "TRIALING", "PAST_DUE", "PENDING_REVIEW"] }, userId } });
  if (!subscription) throw new AppError(404, "Subscription not found.", "SUBSCRIPTION_NOT_FOUND");
  const updated = await prisma.userSubscription.update({
    data: immediately ? { status: "CANCELED" } : { cancelAtPeriodEnd: true },
    where: { id: subscription.id },
  });
  await prisma.billingEvent.create({ data: { message: immediately ? "Subscription canceled immediately." : "Subscription scheduled to cancel at period end.", metadata: { immediately } as Prisma.InputJsonObject, subscriptionId: subscription.id, type: "SUBSCRIPTION_CANCELED", userId } });
  await notifyUser(userId, "Subscription cancellation updated", immediately ? "Your subscription was canceled." : "Your subscription will cancel at period end.", "WARNING");
  await financialAudit({ action: "SUBSCRIPTION_CANCELED", actorId: userId, entityId: subscription.id, entityType: "UserSubscription", metadata: { immediately } as Prisma.InputJsonObject, userId });
  return updated;
}

export async function renewDueSubscriptions(now = new Date()) {
  const due = await prisma.userSubscription.findMany({
    include: { plan: true, user: true },
    where: { cancelAtPeriodEnd: false, renewalDate: { lte: now }, status: "ACTIVE" },
  });
  const renewed = [];
  for (const subscription of due) {
    const nextEnd = addMonths(subscription.renewalDate ?? now, subscription.plan.billingCycle === "YEARLY" ? 12 : 1);
    const updated = await prisma.userSubscription.update({
      data: { currentPeriodEnd: nextEnd, currentPeriodStart: now, expirationDate: nextEnd, renewalDate: nextEnd },
      where: { id: subscription.id },
    });
    const invoice = await createInvoiceForSubscription(subscription.id);
    await prisma.billingEvent.create({ data: { message: `${subscription.plan.name} subscription renewed.`, metadata: { invoiceId: invoice.id, nextEnd: nextEnd.toISOString() } as Prisma.InputJsonObject, subscriptionId: subscription.id, type: "SUBSCRIPTION_RENEWED", userId: subscription.userId } });
    await notifyUser(subscription.userId, "Subscription renewed", `Your ${subscription.plan.name} subscription renewed.`, "SUCCESS");
    await financialAudit({ action: "SUBSCRIPTION_RENEWED", entityId: subscription.id, entityType: "UserSubscription", metadata: { invoiceId: invoice.id } as Prisma.InputJsonObject, userId: subscription.userId });
    renewed.push(updated);
  }
  return renewed;
}

export async function financialDashboard() {
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const lastMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const [revenue, mrrPlans, activeSubscriptions, canceledThisMonth, trials, convertedTrials, payments] = await Promise.all([
    prisma.payment.aggregate({ _sum: { amountCents: true }, where: { status: { in: paidStatuses }, createdAt: { gte: monthStart } } }),
    prisma.userSubscription.findMany({ include: { plan: true }, where: { status: "ACTIVE" } }),
    prisma.userSubscription.count({ where: { status: "ACTIVE" } }),
    prisma.userSubscription.count({ where: { status: "CANCELED", updatedAt: { gte: monthStart } } }),
    prisma.userSubscription.count({ where: { createdAt: { gte: lastMonthStart }, trialEndsAt: { not: null } } }),
    prisma.userSubscription.count({ where: { status: "ACTIVE", trialEndsAt: { not: null }, updatedAt: { gte: lastMonthStart } } }),
    prisma.payment.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);
  const mrrCents = mrrPlans.reduce((sum, subscription) => sum + (subscription.plan.billingCycle === "YEARLY" ? Math.round(subscription.plan.priceCents / 12) : subscription.plan.priceCents), 0);
  const churnRate = activeSubscriptions + canceledThisMonth === 0 ? 0 : Math.round((canceledThisMonth / (activeSubscriptions + canceledThisMonth)) * 1000) / 10;
  const conversionRate = trials === 0 ? 0 : Math.round((convertedTrials / trials) * 1000) / 10;
  return {
    activeSubscriptions,
    churnRate,
    conversionRate,
    monthlyRecurringRevenueCents: mrrCents,
    paymentStatusSummary: payments.map((item) => ({ count: item._count._all, status: item.status })),
    revenueCents: revenue._sum.amountCents ?? 0,
  };
}

export async function requestRefund(input: { actorId: string; amountCents?: number; paymentId: string; reason?: string }) {
  const payment = await prisma.payment.findUnique({ include: { invoice: true }, where: { id: input.paymentId } });
  if (!payment) throw new AppError(404, "Payment not found.", "PAYMENT_NOT_FOUND");
  if (!paidStatuses.includes(payment.status)) throw new AppError(400, "Only paid payments can be refunded.", "PAYMENT_NOT_REFUNDABLE");
  const refund = await prisma.refund.create({
    data: {
      amountCents: input.amountCents ?? payment.amountCents,
      currency: payment.currency,
      invoiceId: payment.invoiceId,
      paymentId: payment.id,
      reason: input.reason,
      requestedById: input.actorId,
      userId: payment.userId,
    },
  });
  await prisma.billingEvent.create({ data: { message: "Refund requested.", metadata: { paymentId: payment.id, reason: input.reason, refundId: refund.id } as Prisma.InputJsonObject, subscriptionId: payment.subscriptionId, type: "REFUND_REQUESTED", userId: payment.userId } });
  await financialAudit({ action: "REFUND_REQUESTED", actorId: input.actorId, amountCents: refund.amountCents, currency: refund.currency, entityId: refund.id, entityType: "Refund", metadata: { paymentId: payment.id } as Prisma.InputJsonObject, userId: payment.userId });
  return refund;
}

export async function reviewRefund(input: { actorId: string; decision: "approve" | "reject"; refundId: string; reason?: string }) {
  const refund = await prisma.refund.findUnique({ include: { payment: true }, where: { id: input.refundId } });
  if (!refund) throw new AppError(404, "Refund not found.", "REFUND_NOT_FOUND");
  const status: RefundStatus = input.decision === "approve" ? "REFUNDED" : "REJECTED";
  const updated = await prisma.refund.update({
    data: { metadata: { reviewReason: input.reason } as Prisma.InputJsonObject, processedAt: new Date(), processedById: input.actorId, providerRefundId: input.decision === "approve" ? `refund_${refund.id}` : undefined, status },
    where: { id: refund.id },
  });
  if (input.decision === "approve") {
    await prisma.payment.update({ data: { status: "REFUNDED" }, where: { id: refund.paymentId } });
  }
  await prisma.billingEvent.create({ data: { message: input.decision === "approve" ? "Refund processed." : "Refund rejected.", metadata: { refundId: refund.id, reason: input.reason } as Prisma.InputJsonObject, subscriptionId: refund.payment.subscriptionId, type: input.decision === "approve" ? "REFUND_PROCESSED" : "PAYMENT_REJECTED", userId: refund.userId } });
  await notifyUser(refund.userId, input.decision === "approve" ? "Refund processed" : "Refund rejected", input.reason ?? (input.decision === "approve" ? "Your refund was processed." : "Your refund request was rejected."), input.decision === "approve" ? "SUCCESS" : "WARNING");
  await financialAudit({ action: input.decision === "approve" ? "REFUND_APPROVED" : "REFUND_REJECTED", actorId: input.actorId, amountCents: refund.amountCents, currency: refund.currency, entityId: refund.id, entityType: "Refund", metadata: { reason: input.reason } as Prisma.InputJsonObject, userId: refund.userId });
  return updated;
}
