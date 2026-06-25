import { apiRequest } from "./api";

export type SubscriptionPlanCode = "basic" | "enterprise" | "free" | "lifetime" | "professional";

export interface SubscriptionPlan {
  active: boolean;
  analysisQuota: number | null;
  billingCycle: string;
  code: SubscriptionPlanCode;
  currency: string;
  description?: string;
  id: string;
  multiUser: boolean;
  name: string;
  priceCents: number;
  quotaWindowHours: number | null;
  teamManagement: boolean;
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
  lifetimeAccess: {
    granted: boolean;
    grantedAt?: string | null;
    grantedBy?: string | null;
    message?: string | null;
    noExpiration: boolean;
    unlimitedAnalyses: boolean;
  };
  plan: SubscriptionPlan;
  quota: {
    canAnalyze: boolean;
    nextResetAt: string;
    quota: number | null;
    remaining: number | null;
    used: number;
    warning: boolean;
  };
}

export async function getMySubscription(accessToken: string) {
  return apiRequest<MySubscription>("/subscriptions/me", { accessToken });
}

export async function activateSubscription(accessToken: string, userId: string, plan: SubscriptionPlanCode) {
  return apiRequest<unknown>("/subscriptions/activate", {
    accessToken,
    body: JSON.stringify({ plan, userId }),
    method: "POST",
  });
}

