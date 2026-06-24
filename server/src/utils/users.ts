import type { Role, SubscriptionTier, User } from "@prisma/client";

export type ApiRole = "super_admin" | "admin" | "corporate_client" | "doctor" | "student" | "user";
export type ApiSubscriptionTier = "free" | "basic" | "professional" | "unlimited" | "lifetime" | "enterprise";

const roleToApi: Record<Role, ApiRole> = {
  ADMIN: "admin",
  CORPORATE_CLIENT: "corporate_client",
  DOCTOR: "doctor",
  OWNER: "super_admin",
  STUDENT: "student",
  SUPER_ADMIN: "super_admin",
  USER: "user",
};

const roleFromApi: Record<ApiRole, Role> = {
  admin: "ADMIN",
  corporate_client: "CORPORATE_CLIENT",
  doctor: "DOCTOR",
  student: "STUDENT",
  super_admin: "SUPER_ADMIN",
  user: "USER",
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

function publicUserTier(tier: SubscriptionTier): Exclude<ApiSubscriptionTier, "lifetime" | "unlimited"> {
  if (tier === "LIFETIME" || tier === "UNLIMITED") return "enterprise";
  return toApiTier(tier) as Exclude<ApiSubscriptionTier, "lifetime" | "unlimited">;
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
    | "isLifetime"
    | "lifetimeGrantedAt"
    | "lifetimeGrantedBy"
    | "licenseNumber"
    | "name"
    | "ownerPasswordSetupRequired"
    | "ownerTwoFactorRequired"
    | "protectedOwner"
    | "role"
    | "phoneNumber"
    | "phoneVerified"
    | "specialization"
    | "username"
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
    isOwner: user.role === "OWNER" || user.protectedOwner,
    isLifetime: user.isLifetime,
    joinedDate: user.createdAt.toISOString().slice(0, 10),
    lastActive: user.updatedAt.toISOString().slice(0, 10),
    lifetimeGrantedAt: user.lifetimeGrantedAt?.toISOString(),
    lifetimeGrantedBy: user.lifetimeGrantedBy ?? undefined,
    licenseNumber: user.licenseNumber ?? undefined,
    name: user.name,
    ownerPasswordSetupRequired: user.ownerPasswordSetupRequired,
    ownerTwoFactorRequired: user.ownerTwoFactorRequired,
    protectedOwner: user.protectedOwner,
    phoneNumber: user.phoneNumber ?? undefined,
    phoneVerified: user.phoneVerified,
    role: toApiRole(user.role),
    specialization: user.specialization ?? undefined,
    subscriptionTier: user.subscription ? publicUserTier(user.subscription.tier) : "free",
    username: user.username ?? undefined,
  };
}
