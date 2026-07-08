import type { Organization, Role, SubscriptionTier, User } from "@prisma/client";
import { toAuthenticationApiRole, fromAuthenticationApiRole, type AuthenticationApiRole } from "../modules/authentication/domain/roles";

export type ApiRole = AuthenticationApiRole;
export type ApiSubscriptionTier = "free" | "clinic" | "hospital" | "basic" | "professional" | "unlimited" | "lifetime" | "enterprise";

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
  return toAuthenticationApiRole(role);
}

export function fromApiRole(role: ApiRole): Role {
  return fromAuthenticationApiRole(role);
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
    | "name"
    | "ownerPasswordSetupRequired"
    | "ownerTwoFactorRequired"
    | "phoneNumber"
    | "phoneVerified"
    | "positionTitle"
    | "protectedOwner"
    | "registrationRole"
    | "protectedOwner"
    | "role"
    | "specialization"
  > & {
    organization?: Pick<Organization, "country" | "email" | "name" | "type"> | null;
    subscription?: { tier: SubscriptionTier } | null;
  },
) {
  const organization = user.organization;
  return {
    accountType: user.accountType,
    avatarInitials: user.avatarInitials,
    department: user.department ?? undefined,
    email: user.email,
    emailVerified: user.emailVerified,
    employeeId: user.employeeId ?? undefined,
    id: user.id,
    institution: user.institution ?? undefined,
    isActive: user.isActive,
    isLifetime: user.isLifetime,
    isOwner: user.protectedOwner || user.role === "OWNER",
    lifetimeGrantedAt: user.lifetimeGrantedAt?.toISOString(),
    lifetimeGrantedBy: user.lifetimeGrantedBy ?? undefined,
    name: user.name,
    organizationCountry: organization?.country ?? undefined,
    organizationEmail: organization?.email ?? undefined,
    organizationName: organization?.name ?? undefined,
    organizationType: organization ? organizationTypeLabel(organization.type) : undefined,
    ownerPasswordSetupRequired: user.ownerPasswordSetupRequired,
    ownerTwoFactorRequired: user.ownerTwoFactorRequired,
    phoneNumber: user.phoneNumber ?? undefined,
    phoneVerified: user.phoneVerified,
    positionTitle: user.positionTitle ?? undefined,
    protectedOwner: user.protectedOwner,
    registrationRole: user.registrationRole ?? undefined,
    role: toApiRole(user.role),
    specialization: user.specialization ?? undefined,
    subscriptionTier: user.subscription ? publicUserTier(user.subscription.tier) : "free",
  };
}
