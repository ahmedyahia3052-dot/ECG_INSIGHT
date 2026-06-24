import type { Role, SubscriptionTier, User } from "@prisma/client";

export type ApiRole = "super_admin" | "admin" | "doctor" | "student";
export type ApiSubscriptionTier = "free" | "basic" | "professional" | "unlimited" | "lifetime" | "enterprise";

const roleToApi: Record<Role, ApiRole> = {
  ADMIN: "admin",
  DOCTOR: "doctor",
  OWNER: "super_admin",
  STUDENT: "student",
  SUPER_ADMIN: "super_admin",
};

const roleFromApi: Record<ApiRole, Role> = {
  admin: "ADMIN",
  doctor: "DOCTOR",
  student: "STUDENT",
  super_admin: "SUPER_ADMIN",
};

const tierToApi: Record<SubscriptionTier, ApiSubscriptionTier> = {
  BASIC: "basic",
  ENTERPRISE: "enterprise",
  FREE: "free",
  LIFETIME: "lifetime",
  PROFESSIONAL: "professional",
  UNLIMITED: "unlimited",
};

const tierFromApi: Record<ApiSubscriptionTier, SubscriptionTier> = {
  basic: "BASIC",
  enterprise: "ENTERPRISE",
  free: "FREE",
  lifetime: "LIFETIME",
  professional: "PROFESSIONAL",
  unlimited: "UNLIMITED",
};

export function toApiRole(role: Role): ApiRole {
  return roleToApi[role];
}

export function fromApiRole(role: ApiRole): Role {
  return roleFromApi[role];
}

export function toApiTier(tier: SubscriptionTier): ApiSubscriptionTier {
  return tierToApi[tier];
}

export function fromApiTier(tier: ApiSubscriptionTier): SubscriptionTier {
  return tierFromApi[tier];
}

export function serializeUser(
  user: Pick<
    User,
    | "avatarInitials"
    | "email"
    | "emailVerified"
    | "id"
    | "institution"
    | "isActive"
    | "licenseNumber"
    | "name"
    | "role"
    | "specialization"
    | "createdAt"
    | "updatedAt"
  > & {
    subscription?: { tier: SubscriptionTier } | null;
  },
) {
  return {
    avatarInitials: user.avatarInitials,
    caseCount: 0,
    email: user.email,
    emailVerified: user.emailVerified,
    id: user.id,
    institution: user.institution ?? undefined,
    isActive: user.isActive,
    joinedDate: user.createdAt.toISOString().slice(0, 10),
    lastActive: user.updatedAt.toISOString().slice(0, 10),
    licenseNumber: user.licenseNumber ?? undefined,
    name: user.name,
    role: toApiRole(user.role),
    specialization: user.specialization ?? undefined,
    subscriptionTier: user.subscription ? toApiTier(user.subscription.tier) : "free",
  };
}
