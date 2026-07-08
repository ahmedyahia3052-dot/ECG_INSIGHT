import type { Role } from "@prisma/client";
import type { NextFunction, Request, Response } from "express";
import { prisma } from "../../config/prisma";
import { AppError } from "../../middleware/error";
import type { EnterprisePermission } from "./permissions";

const PLATFORM_ROLES: Role[] = ["OWNER", "SUPER_ADMIN"];

export async function resolveUserOrganizationId(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    select: { organizationId: true },
    where: { id: userId },
  });
  return user?.organizationId ?? null;
}

export function isPlatformAdmin(role: Role) {
  return PLATFORM_ROLES.includes(role);
}

/** Enforce tenant isolation — user may only access their organization unless platform admin. */
export function requireTenantAccess(orgIdParam = "organizationId") {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (!req.auth) throw new AppError(401, "Authentication required.", "AUTH_REQUIRED");

      const targetOrgId =
        (req.params[orgIdParam] as string | undefined) ??
        (req.body?.organizationId as string | undefined) ??
        (req.query?.organizationId as string | undefined);

      if (!targetOrgId) throw new AppError(400, "Organization ID is required.", "ORG_ID_REQUIRED");

      if (isPlatformAdmin(req.auth.role)) {
        req.tenant = { organizationId: targetOrgId, isPlatformAdmin: true };
        return next();
      }

      const userOrgId = await resolveUserOrganizationId(req.auth.id);
      if (!userOrgId || userOrgId !== targetOrgId) {
        throw new AppError(403, "Cross-tenant access denied.", "TENANT_FORBIDDEN");
      }

      req.tenant = { organizationId: targetOrgId, isPlatformAdmin: false };
      next();
    } catch (error) {
      next(error);
    }
  };
}

export async function resolveMemberPermissions(userId: string, organizationId: string): Promise<string[]> {
  const member = await prisma.organizationMember.findFirst({
    include: { enterpriseRole: true },
    where: { organizationId, userId, deletedAt: null, status: "ACTIVE" },
  });

  if (member?.enterpriseRole?.permissions) {
    const perms = member.enterpriseRole.permissions;
    return Array.isArray(perms) ? (perms as string[]) : [];
  }

  const user = await prisma.user.findUnique({ select: { role: true }, where: { id: userId } });
  if (!user) return [];

  if (isPlatformAdmin(user.role)) return ["*"];

  const systemRole = await prisma.enterpriseRole.findFirst({
    where: { isSystem: true, organizationId: null, slug: mapPrismaRoleToSlug(user.role) },
  });
  if (systemRole?.permissions && Array.isArray(systemRole.permissions)) {
    return systemRole.permissions as string[];
  }

  return [];
}

function mapPrismaRoleToSlug(role: Role): string {
  const map: Partial<Record<Role, string>> = {
    ADMIN: "organization_admin",
    DOCTOR: "doctor",
    OWNER: "developer",
    STUDENT: "student",
    SUPER_ADMIN: "super_admin",
    USER: "viewer",
  };
  return map[role] ?? "viewer";
}

export function requirePermission(...required: EnterprisePermission[]) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (!req.auth) throw new AppError(401, "Authentication required.", "AUTH_REQUIRED");

      if (isPlatformAdmin(req.auth.role)) return next();

      const orgId = req.tenant?.organizationId ?? (await resolveUserOrganizationId(req.auth.id));
      if (!orgId) throw new AppError(403, "Organization membership required.", "ORG_MEMBERSHIP_REQUIRED");

      const permissions = await resolveMemberPermissions(req.auth.id, orgId);
      if (permissions.includes("*")) return next();

      const allowed = required.every((perm) => permissions.includes(perm));
      if (!allowed) throw new AppError(403, "Insufficient enterprise permissions.", "PERMISSION_DENIED");

      next();
    } catch (error) {
      next(error);
    }
  };
}
