import { apiRequest } from "./api";

export type SubscriptionPlanCode = "basic" | "clinic" | "enterprise" | "free" | "hospital" | "lifetime" | "professional";
export type PaymentGateway = "BANK_TRANSFER" | "CARD" | "INSTAPAY" | "PAYMOB" | "STRIPE" | "WALLET";

export interface SubscriptionPlan {
  active: boolean;
  analysisQuota: number | null;
  aiFeatureAccess?: Record<string, unknown>;
  billingCycle: string;
  code: SubscriptionPlanCode;
  currency: string;
  description?: string;
  gracePeriodDays: number;
  id: string;
  maxOrganizations: number | null;
  maxUsers: number | null;
  multiUser: boolean;
  name: string;
  priceCents: number;
  quotaWindowHours: number | null;
  storageQuotaMb: number | null;
  teamManagement: boolean;
  trialDays: number;
}

export interface SubscriptionAnalytics {
  activeUsers: number;
  dailyAnalyses: number;
  expiringSubscriptions: Array<{ expirationDate: string; plan: string; userEmail: string; userId: string }>;
  monthlyRevenueCents: number;
  paymentStatusSummary: Array<{ count: number; status: string }>;
  subscriptionDistribution: Array<{ count: number; plan: string }>;
  totalUsers: number;
}

export interface FinancialDashboard {
  activeSubscriptions: number;
  churnRate: number;
  conversionRate: number;
  monthlyRecurringRevenueCents: number;
  paymentStatusSummary: Array<{ count: number; status: string }>;
  revenueCents: number;
}

export interface LicenseRecord {
  email: string;
  expiryDate: string | null;
  grantedBy: string;
  id: string;
  notes?: string;
  startDate: string;
  status: string;
  userId: string;
  userName: string;
  username: string | null;
  subscriptionType: string;
}

export interface InvoiceRecord {
  amountCents: number;
  currency: string;
  dueAt?: string;
  id: string;
  invoiceNumber: string;
  issuedAt: string;
  paidAt?: string;
  status: string;
}

export interface PaymentRecord {
  amountCents: number;
  createdAt: string;
  currency: string;
  id: string;
  invoice?: InvoiceRecord | null;
  provider: string;
  status: string;
}

export interface PaymentTransactionRecord {
  amount: number;
  createdAt: string;
  currency: string;
  id: string;
  paymentMethod: string;
  provider: PaymentGateway;
  referenceNumber?: string | null;
  status: string;
}

export interface PaymentMethodRecord {
  id: string;
  isDefault: boolean;
  label: string;
  last4?: string | null;
  provider: PaymentGateway;
  status: string;
  type: string;
}

export interface RefundRecord {
  amountCents: number;
  createdAt: string;
  currency: string;
  id: string;
  paymentId: string;
  reason?: string | null;
  status: string;
}

export interface FinancialAuditRecord {
  action: string;
  amountCents?: number | null;
  createdAt: string;
  currency?: string | null;
  entityId?: string | null;
  entityType: string;
  id: string;
}

export interface UsageTrackingRecord {
  exceeded: boolean;
  id: string;
  metric: string;
  quantity: number;
  quota: number | null;
  windowEnd: string;
  windowStart: string;
}

export interface BillingEvent {
  createdAt: string;
  id: string;
  message: string;
  type: string;
}

export async function listSubscriptionPlans(accessToken: string) {
  return apiRequest<{ plans: SubscriptionPlan[] }>("/subscriptions/plans", { accessToken });
}

export async function getSubscriptionAnalytics(accessToken: string) {
  return apiRequest<{ analytics: SubscriptionAnalytics }>("/subscriptions/analytics", { accessToken });
}

export async function getFinancialDashboard(accessToken: string) {
  return apiRequest<{ dashboard: FinancialDashboard }>("/subscriptions/financial/dashboard", { accessToken });
}

export async function getFinancialAdminCenter(accessToken: string) {
  return apiRequest<{
    auditLogs: FinancialAuditRecord[];
    invoices: InvoiceRecord[];
    manualPayments: PaymentRecord[];
    refunds: RefundRecord[];
    transactions: PaymentTransactionRecord[];
  }>("/subscriptions/financial/admin-center", { accessToken });
}

export async function listLicenses(accessToken: string) {
  return apiRequest<{ licenses: LicenseRecord[] }>("/subscriptions/licenses", { accessToken });
}

export async function revokeLicense(accessToken: string, userId: string) {
  return apiRequest<{ revokedCount: number }>(`/subscriptions/licenses/${userId}`, {
    accessToken,
    method: "DELETE",
  });
}

export async function grantOwnerLicense(accessToken: string, input: {
  expiresAt?: string;
  lifetime: boolean;
  notes?: string;
  plan: SubscriptionPlanCode;
  startsAt?: string;
  userId: string;
}) {
  return apiRequest<{ license: LicenseRecord }>("/subscriptions/licenses", {
    accessToken,
    body: JSON.stringify(input),
    method: "POST",
  });
}

export async function updateOwnerLicense(accessToken: string, licenseId: string, input: {
  action: "activate" | "extend" | "resume" | "revoke" | "suspend";
  expiresAt?: string;
  notes?: string;
}) {
  return apiRequest<{ license: LicenseRecord }>(`/subscriptions/licenses/${licenseId}`, {
    accessToken,
    body: JSON.stringify(input),
    method: "PATCH",
  });
}

export interface MySubscription {
  billingHistory?: BillingEvent[];
  invoices?: InvoiceRecord[];
  lifetimeAccess: {
    granted: boolean;
    grantedAt?: string | null;
    grantedBy?: string | null;
    message?: string | null;
    noExpiration: boolean;
    unlimitedAnalyses: boolean;
  };
  payments?: PaymentRecord[];
  plan: SubscriptionPlan;
  quota: {
    canAnalyze: boolean;
    limits?: {
      aiFeatureAccess?: Record<string, unknown>;
      maxOrganizations: number | null;
      maxUsers: number | null;
      storageQuotaMb: number | null;
    };
    nextResetAt: string;
    quota: number | null;
    remaining: number | null;
    used: number;
    warning: boolean;
  };
  subscription?: unknown;
  usageTracking?: UsageTrackingRecord[];
}

export async function getMySubscription(accessToken: string) {
  return apiRequest<MySubscription>("/subscriptions/me", { accessToken });
}

export async function getBillingHistory(accessToken: string) {
  return apiRequest<{ billingEvents: BillingEvent[]; invoices: InvoiceRecord[]; payments: PaymentRecord[]; usageTracking: UsageTrackingRecord[] }>("/subscriptions/billing-history", { accessToken });
}

export async function getUsageDashboard(accessToken: string) {
  return apiRequest<{ quota: MySubscription["quota"]; usageTracking: UsageTrackingRecord[] }>("/subscriptions/usage", { accessToken });
}

export async function createCheckoutSession(accessToken: string, input: {
  idempotencyKey?: string;
  plan: SubscriptionPlanCode;
  provider: PaymentGateway;
}) {
  return apiRequest<{ checkout: { redirectUrl?: string; providerPayload: Record<string, unknown>; transactionId?: string }; invoice: InvoiceRecord; payment: PaymentRecord; transaction: PaymentTransactionRecord }>("/subscriptions/checkout", {
    accessToken,
    body: JSON.stringify(input),
    headers: input.idempotencyKey ? { "idempotency-key": input.idempotencyKey } : undefined,
    method: "POST",
  });
}

export async function retryPayment(accessToken: string, paymentId: string) {
  return apiRequest<unknown>("/subscriptions/payments/retry", {
    accessToken,
    body: JSON.stringify({ paymentId }),
    method: "POST",
  });
}

export async function listPaymentMethods(accessToken: string) {
  return apiRequest<{ methods: PaymentMethodRecord[] }>("/subscriptions/payment-methods", { accessToken });
}

export async function addPaymentMethod(accessToken: string, input: {
  expMonth?: number;
  expYear?: number;
  fingerprint?: string;
  isDefault?: boolean;
  label: string;
  last4?: string;
  provider: PaymentGateway;
  providerToken?: string;
  type: string;
}) {
  return apiRequest<{ method: PaymentMethodRecord }>("/subscriptions/payment-methods", {
    accessToken,
    body: JSON.stringify(input),
    method: "POST",
  });
}

export async function changePlan(accessToken: string, plan: SubscriptionPlanCode, direction: "downgrade" | "upgrade") {
  return apiRequest<{ subscription: unknown }>(`/subscriptions/subscription/${direction}`, {
    accessToken,
    body: JSON.stringify({ plan }),
    method: "POST",
  });
}

export async function convertTrial(accessToken: string, plan: SubscriptionPlanCode) {
  return apiRequest<{ subscription: unknown }>("/subscriptions/subscription/convert-trial", {
    accessToken,
    body: JSON.stringify({ plan }),
    method: "POST",
  });
}

export async function cancelMySubscription(accessToken: string, immediately = false) {
  return apiRequest<{ subscription: unknown }>("/subscriptions/subscription/cancel", {
    accessToken,
    body: JSON.stringify({ immediately }),
    method: "POST",
  });
}

export async function requestRefund(accessToken: string, input: { amountCents?: number; paymentId: string; reason?: string }) {
  return apiRequest<{ refund: RefundRecord }>("/subscriptions/refunds", {
    accessToken,
    body: JSON.stringify(input),
    method: "POST",
  });
}

export async function reviewRefund(accessToken: string, refundId: string, input: { decision: "approve" | "reject"; reason?: string }) {
  return apiRequest<{ refund: RefundRecord }>(`/subscriptions/refunds/${refundId}/review`, {
    accessToken,
    body: JSON.stringify(input),
    method: "POST",
  });
}

export async function activateSubscription(accessToken: string, userId: string, plan: SubscriptionPlanCode) {
  return apiRequest<unknown>("/subscriptions/activate", {
    accessToken,
    body: JSON.stringify({ plan, userId }),
    method: "POST",
  });
}

