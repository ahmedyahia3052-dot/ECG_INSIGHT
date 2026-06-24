import { apiRequest } from "./api";

export type SubscriptionPlanCode = "basic" | "enterprise" | "free" | "lifetime" | "professional" | "unlimited";

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
  createdAt: string;
  id: string;
  status: string;
  type: string;
  user: { email: string; name: string };
  userId: string;
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

export async function getMySubscription(accessToken: string) {
  return apiRequest<unknown>("/subscriptions/me", { accessToken });
}

export async function activateSubscription(accessToken: string, userId: string, plan: SubscriptionPlanCode) {
  return apiRequest<unknown>("/subscriptions/activate", {
    accessToken,
    body: JSON.stringify({ plan, userId }),
    method: "POST",
  });
}

export async function grantLifetimeLicense(accessToken: string, userId: string, reason?: string) {
  return apiRequest<unknown>("/subscriptions/licenses/lifetime", {
    accessToken,
    body: JSON.stringify({ reason, userId }),
    method: "POST",
  });
}
