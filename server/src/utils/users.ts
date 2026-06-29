import type { Organization, Role, SubscriptionTier, User } from "@prisma/client";

export type ApiRole = "super_admin" | "admin" | "corporate_client" | "doctor" | "student" | "user";
export type ApiSubscriptionTier = "free" | "clinic" | "hospital" | "basic" | "professional" | "unlimited" | "lifetime" | "enterprise";

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
  CLINIC: "clinic",
  ENTERPRISE: "enterprise",
  FREE: "free",
  HOSPITAL: "hospital",
  LIFETIME: "lifetime",
  PROFESSIONAL: "professional",
  UNLIMITED: "unlimited",
};

const tierFromApi: Record<ApiSubscriptionTier, SubscriptionTier> = {
  basic: "BASIC",
  clinic: "CLINIC",
  enterprise: "ENTERPRISE",
  free: "FREE",
  hospital: "HOSPITAL",
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

function organizationTypeLabel(type: Organization["type"]) {
  if (type === "HOSPITAL") return "Hospital";
  if (type === "CLINIC") return "Clinic";
  if (type === "COMPANY") return "Company";
  if (type === "GOVERNMENT") return "Government Institution";
  return "Healthcare Organization";
}

export function serializeUser(
  user: Pick<
    User,
    | "avatarInitials"
    | "accountType"
    | "department"
    | "email"
    | "emailVerified"
    | "employeeId"
    | "id"
    | "institution"
    | "isActive"
    | "isLifetime"
    | "lifetimeGrantedAt"
    | "lifetimeGrantedBy"
    | "licenseNumber"
    | "name"
    | "organizationId"
    | "ownerPasswordSetupRequired"
    | "ownerTwoFactorRequired"
    | "positionTitle"
    | "protectedOwner"
    | "role"
    | "phoneNumber"
    | "phoneVerified"
    | "registrationRole"
    | "specialization"
    | "username"
    | "createdAt"
    | "updatedAt"
  > & {
    organization?: Pick<Organization, "country" | "email" | "name" | "type"> | null;
    subscription?: { tier: SubscriptionTier } | null;
  },
) {
  return {
    avatarInitials: user.avatarInitials,
    accountType: user.accountType,
    caseCount: 0,
    department: user.department ?? undefined,
    email: user.email,
    emailVerified: user.emailVerified,
    employeeId: user.employeeId ?? undefined,
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
    organizationCountry: user.organization?.country ?? undefined,
    organizationEmail: user.organization?.email ?? undefined,
    organizationId: user.organizationId ?? undefined,
    organizationName: user.organization?.name ?? undefined,
    organizationType: user.organization ? organizationTypeLabel(user.organization.type) : undefined,
    ownerPasswordSetupRequired: user.ownerPasswordSetupRequired,
    ownerTwoFactorRequired: user.ownerTwoFactorRequired,
    protectedOwner: user.protectedOwner,
    positionTitle: user.positionTitle ?? undefined,
    phoneNumber: user.phoneNumber ?? undefined,
    phoneVerified: user.phoneVerified,
    role: toApiRole(user.role),
    registrationRole: user.registrationRole ?? undefined,
    specialization: user.specialization ?? undefined,
    subscriptionTier: user.subscription ? publicUserTier(user.subscription.tier) : "free",
    username: user.username ?? undefined,
  };
}
