import { apiRequest } from "./api";

export interface SuperAdminDashboard {
  activeUsers: number;
  dailyEcgAnalyses: number;
  enterpriseUsers: number;
  expiringSubscriptions: Array<{ expirationDate: string; plan: string; userEmail: string; userId: string }>;
  freeUsers: number;
  lifetimeUsers: number;
  monthlyEcgAnalyses: number;
  newRegistrations: number;
  proUsers: number;
  revenueThisMonth: number;
  revenueToday: number;
  revenueTotal: number;
  totalUsers: number;
}

export interface SuperAdminUser {
  avatarInitials: string;
  email: string;
  emailVerified: boolean;
  id: string;
  isActive: boolean;
  isLifetime?: boolean;
  name: string;
  role: string;
  subscriptionTier: string;
}

export interface SuperAdminPlan {
  currency: string;
  features: unknown;
  id: string;
  isActive: boolean;
  monthlyQuota: number | null;
  name: string;
  plan: string;
  price: number;
}

export async function getSuperAdminDashboard(accessToken: string) {
  return apiRequest<{ dashboard: SuperAdminDashboard }>("/super-admin/dashboard", { accessToken });
}

export async function listSuperAdminUsers(accessToken: string, params = new URLSearchParams()) {
  const suffix = params.toString() ? `?${params.toString()}` : "";
  return apiRequest<{ page: number; pageSize: number; total: number; totalPages: number; users: SuperAdminUser[] }>(`/super-admin/users${suffix}`, { accessToken });
}

export async function superAdminUserAction(accessToken: string, userId: string, action: "disable" | "enable" | "force-logout" | "reset-password") {
  return apiRequest<{ ok: boolean; resetPassword?: string }>(`/super-admin/users/${userId}/actions/${action}`, { accessToken, method: "POST" });
}

export async function deleteSuperAdminUser(accessToken: string, userId: string) {
  return apiRequest<void>(`/super-admin/users/${userId}`, { accessToken, method: "DELETE" });
}

export async function changeSuperAdminUserPlan(accessToken: string, userId: string, plan: "BASIC" | "ENTERPRISE" | "FREE" | "PRO") {
  return apiRequest<unknown>(`/super-admin/users/${userId}/plan`, { accessToken, body: JSON.stringify({ plan }), method: "POST" });
}

export async function grantSuperAdminLifetime(accessToken: string, userId: string) {
  return apiRequest<unknown>(`/super-admin/users/${userId}/lifetime`, { accessToken, method: "POST" });
}

export async function revokeSuperAdminLifetime(accessToken: string, userId: string) {
  return apiRequest<unknown>(`/super-admin/users/${userId}/lifetime`, { accessToken, method: "DELETE" });
}

export async function extendSuperAdminSubscription(accessToken: string, userId: string, months: number) {
  return apiRequest<unknown>(`/super-admin/users/${userId}/subscription/extend`, { accessToken, body: JSON.stringify({ months }), method: "POST" });
}

export async function listSuperAdminPlans(accessToken: string) {
  return apiRequest<{ plans: SuperAdminPlan[] }>("/super-admin/plans", { accessToken });
}

export async function upsertSuperAdminPlan(accessToken: string, plan: {
  currency: string;
  features: string[];
  isActive: boolean;
  monthlyQuota?: number | null;
  name: string;
  plan: "BASIC" | "ENTERPRISE" | "FREE" | "PRO";
  price: number;
}) {
  return apiRequest<unknown>("/super-admin/plans", { accessToken, body: JSON.stringify(plan), method: "POST" });
}

export async function getSuperAdminRevenue(accessToken: string) {
  return apiRequest<{ revenue: Record<string, unknown> }>("/super-admin/revenue", { accessToken });
}

export async function listSuperAdminLicenses(accessToken: string) {
  return apiRequest<{ gifts: unknown[]; licenses: unknown[] }>("/super-admin/licenses", { accessToken });
}

export async function giftSuperAdminLicense(accessToken: string, userId: string, duration: "1_MONTH" | "3_MONTHS" | "6_MONTHS" | "12_MONTHS" | "LIFETIME") {
  return apiRequest<unknown>("/super-admin/gift-licenses", { accessToken, body: JSON.stringify({ duration, userId }), method: "POST" });
}

export async function listSuperAdminAudit(accessToken: string, params = new URLSearchParams()) {
  const suffix = params.toString() ? `?${params.toString()}` : "";
  return apiRequest<{ logs: Array<{ action: string; createdAt: string; entityId?: string; entityType?: string; id: string; message: string }>; total: number }>(`/super-admin/audit${suffix}`, { accessToken });
}
