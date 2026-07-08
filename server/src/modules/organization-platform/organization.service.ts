import type { DepartmentCategory, OrganizationType, Prisma, SubscriptionTier } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { SUBSCRIPTION_PLAN_LIMITS, SYSTEM_ROLE_DEFINITIONS } from "./permissions";
import { recordEnterpriseAudit } from "./audit.service";

export async function seedSystemEnterpriseRoles() {
  for (const role of SYSTEM_ROLE_DEFINITIONS) {
    const existing = await prisma.enterpriseRole.findFirst({
      where: { isSystem: true, organizationId: null, slug: role.slug },
    });
    if (existing) {
      await prisma.enterpriseRole.update({
        data: { name: role.name, permissions: role.permissions },
        where: { id: existing.id },
      });
    } else {
      await prisma.enterpriseRole.create({
        data: {
          isSystem: true,
          name: role.name,
          permissions: role.permissions,
          scope: "PLATFORM",
          slug: role.slug,
        },
      });
    }
  }
}

export async function createOrganization(input: {
  name: string;
  type: OrganizationType;
  address?: string;
  city?: string;
  country?: string;
  email?: string;
  phone?: string;
  logo?: string;
  brandColor?: string;
  timezone?: string;
  language?: string;
  licenseNumber?: string;
  taxNumber?: string;
  storageQuotaMb?: number;
  aiQuotaMonthly?: number;
  subscriptionTier?: SubscriptionTier;
  actorId: string;
}) {
  const tier = input.subscriptionTier ?? "FREE";
  const limits = SUBSCRIPTION_PLAN_LIMITS[tier as keyof typeof SUBSCRIPTION_PLAN_LIMITS] ?? SUBSCRIPTION_PLAN_LIMITS.FREE;

  const organization = await prisma.organization.create({
    data: {
      address: input.address,
      aiQuotaMonthly: input.aiQuotaMonthly ?? limits.aiCreditsMonthly,
      brandColor: input.brandColor ?? "#0F766E",
      city: input.city,
      country: input.country,
      email: input.email,
      language: input.language ?? "en",
      licenseNumber: input.licenseNumber,
      logo: input.logo,
      name: input.name,
      phone: input.phone,
      storageQuotaMb: input.storageQuotaMb ?? limits.storageLimitMb,
      taxNumber: input.taxNumber,
      timezone: input.timezone ?? "UTC",
      type: input.type,
      branding: { create: { primaryColor: input.brandColor ?? "#0F766E" } },
      subscription: {
        create: {
          aiCreditsMonthly: limits.aiCreditsMonthly,
          ecgAnalysisLimit: limits.ecgAnalysisLimit,
          storageLimitMb: limits.storageLimitMb,
          teamLimit: limits.teamLimit,
          tier,
        },
      },
    },
    include: { branding: true, subscription: true },
  });

  await recordEnterpriseAudit("ORGANIZATION_CREATED", { actorId: input.actorId, organizationId: organization.id }, `Organization ${organization.name} created`);
  return organization;
}

export async function updateOrganization(organizationId: string, data: Prisma.OrganizationUpdateInput, actorId: string) {
  const organization = await prisma.organization.update({
    data: { ...data, version: { increment: 1 } },
    where: { id: organizationId, deletedAt: null },
  });
  await recordEnterpriseAudit("ORGANIZATION_UPDATED", { actorId, organizationId }, `Organization ${organization.name} updated`);
  return organization;
}

export async function softDeleteOrganization(organizationId: string, actorId: string) {
  const organization = await prisma.organization.update({
    data: { deletedAt: new Date(), status: "INACTIVE" },
    where: { id: organizationId },
  });
  await recordEnterpriseAudit("ORGANIZATION_DELETED", { actorId, organizationId }, `Organization ${organization.name} soft-deleted`);
  return organization;
}

export async function listOrganizations(filters: { page?: number; pageSize?: number; search?: string } = {}) {
  const page = filters.page ?? 1;
  const pageSize = Math.min(filters.pageSize ?? 25, 100);
  const where: Prisma.OrganizationWhereInput = { deletedAt: null };
  if (filters.search) where.name = { contains: filters.search, mode: "insensitive" };

  const [items, total] = await Promise.all([
    prisma.organization.findMany({
      include: { subscription: true, branding: true, _count: { select: { branches: true, members: true, departments: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      where,
    }),
    prisma.organization.count({ where }),
  ]);

  return { items, page, pageSize, total, totalPages: Math.ceil(total / pageSize) };
}

export async function getOrganizationById(organizationId: string) {
  return prisma.organization.findFirst({
    include: {
      branding: true,
      subscription: true,
      branches: { orderBy: { name: "asc" }, where: { deletedAt: null } },
      departments: { orderBy: { name: "asc" }, where: { deletedAt: null } },
      members: {
        include: { enterpriseRole: true, user: { select: { email: true, id: true, name: true, role: true } } },
        where: { deletedAt: null },
      },
      enterpriseRoles: { where: { deletedAt: null } },
    },
    where: { deletedAt: null, id: organizationId },
  });
}

export async function createDepartment(input: {
  organizationId: string;
  name: string;
  category?: DepartmentCategory;
  description?: string;
  companyId?: string;
  actorId: string;
}) {
  const department = await prisma.department.create({
    data: {
      category: input.category ?? "CUSTOM",
      companyId: input.companyId,
      description: input.description,
      name: input.name,
      organizationId: input.organizationId,
    },
  });
  await recordEnterpriseAudit("SETTINGS_CHANGED", { actorId: input.actorId, organizationId: input.organizationId }, `Department ${department.name} created`, { entityId: department.id, entityType: "Department" });
  return department;
}

export async function createBranch(input: {
  organizationId: string;
  name: string;
  address?: string;
  city?: string;
  country?: string;
  gpsLatitude?: number;
  gpsLongitude?: number;
  managerUserId?: string;
  departmentId?: string;
  actorId: string;
}) {
  const branch = await prisma.organizationBranch.create({ data: input });
  await recordEnterpriseAudit("BRANCH_CREATED", { actorId: input.actorId, organizationId: input.organizationId }, `Branch ${branch.name} created`, { entityId: branch.id, entityType: "OrganizationBranch" });
  return branch;
}

export async function inviteOrganizationMember(input: {
  organizationId: string;
  userId: string;
  enterpriseRoleId?: string;
  departmentId?: string;
  branchId?: string;
  actorId: string;
}) {
  const member = await prisma.organizationMember.upsert({
    create: {
      branchId: input.branchId,
      departmentId: input.departmentId,
      enterpriseRoleId: input.enterpriseRoleId,
      invitedAt: new Date(),
      organizationId: input.organizationId,
      status: "INVITED",
      userId: input.userId,
    },
    update: {
      branchId: input.branchId,
      departmentId: input.departmentId,
      enterpriseRoleId: input.enterpriseRoleId,
      status: "INVITED",
    },
    where: { organizationId_userId: { organizationId: input.organizationId, userId: input.userId } },
  });
  await recordEnterpriseAudit("USER_INVITED", { actorId: input.actorId, organizationId: input.organizationId }, "User invited to organization", { entityId: member.id, entityType: "OrganizationMember" });
  return member;
}

export async function updateOrganizationSubscription(organizationId: string, tier: SubscriptionTier, actorId: string) {
  const limits = SUBSCRIPTION_PLAN_LIMITS[tier as keyof typeof SUBSCRIPTION_PLAN_LIMITS] ?? SUBSCRIPTION_PLAN_LIMITS.FREE;
  const subscription = await prisma.organizationSubscription.upsert({
    create: {
      aiCreditsMonthly: limits.aiCreditsMonthly,
      ecgAnalysisLimit: limits.ecgAnalysisLimit,
      organizationId,
      storageLimitMb: limits.storageLimitMb,
      teamLimit: limits.teamLimit,
      tier,
    },
    update: {
      aiCreditsMonthly: limits.aiCreditsMonthly,
      ecgAnalysisLimit: limits.ecgAnalysisLimit,
      storageLimitMb: limits.storageLimitMb,
      teamLimit: limits.teamLimit,
      tier,
    },
    where: { organizationId },
  });
  await recordEnterpriseAudit("SUBSCRIPTION_CHANGED", { actorId, organizationId }, `Subscription changed to ${tier}`);
  return subscription;
}

export async function updateOrganizationBranding(organizationId: string, data: Prisma.OrganizationBrandingUpdateInput, actorId: string) {
  const branding = await prisma.organizationBranding.upsert({
    create: { organizationId, ...(data as object) },
    update: data,
    where: { organizationId },
  });
  await recordEnterpriseAudit("BRANDING_UPDATED", { actorId, organizationId }, "Organization branding updated");
  return branding;
}

export async function createOrganizationNotification(input: {
  organizationId: string;
  userId?: string;
  category: "SYSTEM" | "SECURITY" | "CLINICAL" | "AI" | "BILLING" | "LICENSE" | "MAINTENANCE";
  title: string;
  body: string;
  metadata?: Prisma.InputJsonValue;
}) {
  return prisma.organizationNotification.create({ data: input });
}

export async function listOrganizationNotifications(organizationId: string, userId?: string, unreadOnly = false) {
  return prisma.organizationNotification.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    where: {
      organizationId,
      ...(unreadOnly ? { read: false } : {}),
      ...(userId ? { OR: [{ userId }, { userId: null }] } : {}),
    },
  });
}

export async function createCustomEnterpriseRole(input: {
  organizationId: string;
  name: string;
  slug: string;
  description?: string;
  permissions: string[];
}) {
  return prisma.enterpriseRole.create({
    data: {
      description: input.description,
      name: input.name,
      organizationId: input.organizationId,
      permissions: input.permissions,
      scope: "ORGANIZATION",
      slug: input.slug,
    },
  });
}
