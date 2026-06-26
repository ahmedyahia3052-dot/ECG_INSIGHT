import { apiRequest } from "./api";

export type SubscriptionPlanCode = "basic" | "clinic" | "enterprise" | "free" | "hospital" | "lifetime" | "professional";

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

export async function activateSubscription(accessToken: string, userId: string, plan: SubscriptionPlanCode) {
  return apiRequest<unknown>("/subscriptions/activate", {
    accessToken,
    body: JSON.stringify({ plan, userId }),
    method: "POST",
  });
}

