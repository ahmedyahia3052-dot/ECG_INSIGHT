import type { OrganizationType, SubscriptionTier } from "@prisma/client";
import type { Request } from "express";
import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../../middleware/auth";
import { AppError } from "../../middleware/error";
import { validateBody, validateQuery } from "../../middleware/validate";
import { listOrganizationAuditLogs } from "./audit.service";
import {
  createBranch,
  createCustomEnterpriseRole,
  createDepartment,
  createOrganization,
  createOrganizationNotification,
  getOrganizationById,
  inviteOrganizationMember,
  listOrganizationNotifications,
  listOrganizations,
  seedSystemEnterpriseRoles,
  softDeleteOrganization,
  updateOrganization,
  updateOrganizationBranding,
  updateOrganizationSubscription,
} from "./organization.service";
import { ENTERPRISE_PERMISSIONS } from "./permissions";
import {
  brandingUpdateSchema,
  branchCreateSchema,
  customRoleSchema,
  departmentCreateSchema,
  memberInviteSchema,
  notificationCreateSchema,
  organizationCreateSchema,
  organizationUpdateSchema,
  paginationSchema,
  subscriptionUpdateSchema,
} from "./schemas";
import { requirePermission, requireTenantAccess, resolveUserOrganizationId } from "./tenant.middleware";

function organizationIdParam(req: Request): string {
  const id = req.params.organizationId;
  if (typeof id !== "string" || !id) throw new AppError(400, "Invalid organization ID.", "ORG_ID_INVALID");
  return id;
}

export const organizationPlatformRouter = Router();

organizationPlatformRouter.use(requireAuth);

organizationPlatformRouter.post("/bootstrap", requireRole("SUPER_ADMIN", "OWNER"), async (_req, res, next) => {
  try {
    await seedSystemEnterpriseRoles();
    res.json({ ok: true, permissions: ENTERPRISE_PERMISSIONS });
  } catch (error) {
    next(error);
  }
});

organizationPlatformRouter.get("/permissions/catalog", (_req, res) => {
  res.json({ permissions: ENTERPRISE_PERMISSIONS });
});

organizationPlatformRouter.get("/", validateQuery(paginationSchema), async (req, res, next) => {
  try {
    const isPlatform = req.auth!.role === "OWNER" || req.auth!.role === "SUPER_ADMIN";
    if (isPlatform) {
      const result = await listOrganizations(req.query as { page?: number; pageSize?: number; search?: string });
      res.json(result);
      return;
    }
    const orgId = await resolveUserOrganizationId(req.auth!.id);
    if (!orgId) throw new AppError(403, "No organization membership.", "ORG_MEMBERSHIP_REQUIRED");
    const org = await getOrganizationById(orgId);
    res.json({ items: org ? [org] : [], page: 1, pageSize: 1, total: org ? 1 : 0, totalPages: org ? 1 : 0 });
  } catch (error) {
    next(error);
  }
});

organizationPlatformRouter.post("/", requireRole("SUPER_ADMIN", "OWNER", "ADMIN"), validateBody(organizationCreateSchema), async (req, res, next) => {
  try {
    const body = req.body as z.infer<typeof organizationCreateSchema>;
    const organization = await createOrganization({
      ...body,
      actorId: req.auth!.id,
      subscriptionTier: body.subscriptionTier as SubscriptionTier | undefined,
      type: body.type as OrganizationType,
    });
    res.status(201).json({ organization });
  } catch (error) {
    next(error);
  }
});

organizationPlatformRouter.get("/:organizationId", requireTenantAccess(), async (req, res, next) => {
  try {
    const organization = await getOrganizationById(organizationIdParam(req));
    if (!organization) throw new AppError(404, "Organization not found.", "ORG_NOT_FOUND");
    res.json({ organization });
  } catch (error) {
    next(error);
  }
});

organizationPlatformRouter.patch(
  "/:organizationId",
  requireTenantAccess(),
  requirePermission("organization.manage"),
  validateBody(organizationUpdateSchema),
  async (req, res, next) => {
    try {
      const organization = await updateOrganization(organizationIdParam(req), req.body, req.auth!.id);
      res.json({ organization });
    } catch (error) {
      next(error);
    }
  },
);

organizationPlatformRouter.delete(
  "/:organizationId",
  requireTenantAccess(),
  requireRole("SUPER_ADMIN", "OWNER"),
  async (req, res, next) => {
    try {
      const organization = await softDeleteOrganization(organizationIdParam(req), req.auth!.id);
      res.json({ organization });
    } catch (error) {
      next(error);
    }
  },
);

organizationPlatformRouter.post(
  "/:organizationId/departments",
  requireTenantAccess(),
  requirePermission("department.manage"),
  validateBody(departmentCreateSchema),
  async (req, res, next) => {
    try {
      const department = await createDepartment({ ...req.body, actorId: req.auth!.id, organizationId: organizationIdParam(req) });
      res.status(201).json({ department });
    } catch (error) {
      next(error);
    }
  },
);

organizationPlatformRouter.post(
  "/:organizationId/branches",
  requireTenantAccess(),
  requirePermission("branch.manage"),
  validateBody(branchCreateSchema),
  async (req, res, next) => {
    try {
      const branch = await createBranch({ ...req.body, actorId: req.auth!.id, organizationId: organizationIdParam(req) });
      res.status(201).json({ branch });
    } catch (error) {
      next(error);
    }
  },
);

organizationPlatformRouter.post(
  "/:organizationId/members",
  requireTenantAccess(),
  requirePermission("user.invite"),
  validateBody(memberInviteSchema),
  async (req, res, next) => {
    try {
      const member = await inviteOrganizationMember({ ...req.body, actorId: req.auth!.id, organizationId: organizationIdParam(req) });
      res.status(201).json({ member });
    } catch (error) {
      next(error);
    }
  },
);

organizationPlatformRouter.post(
  "/:organizationId/roles",
  requireTenantAccess(),
  requirePermission("user.manage"),
  validateBody(customRoleSchema),
  async (req, res, next) => {
    try {
      const role = await createCustomEnterpriseRole({ ...req.body, organizationId: organizationIdParam(req) });
      res.status(201).json({ role });
    } catch (error) {
      next(error);
    }
  },
);

organizationPlatformRouter.patch(
  "/:organizationId/subscription",
  requireTenantAccess(),
  requirePermission("subscription.manage"),
  validateBody(subscriptionUpdateSchema),
  async (req, res, next) => {
    try {
      const subscription = await updateOrganizationSubscription(organizationIdParam(req), req.body.tier, req.auth!.id);
      res.json({ subscription });
    } catch (error) {
      next(error);
    }
  },
);

organizationPlatformRouter.patch(
  "/:organizationId/branding",
  requireTenantAccess(),
  requirePermission("branding.manage"),
  validateBody(brandingUpdateSchema),
  async (req, res, next) => {
    try {
      const branding = await updateOrganizationBranding(organizationIdParam(req), req.body, req.auth!.id);
      res.json({ branding });
    } catch (error) {
      next(error);
    }
  },
);

organizationPlatformRouter.get(
  "/:organizationId/audit",
  requireTenantAccess(),
  requirePermission("audit.access"),
  validateQuery(paginationSchema),
  async (req, res, next) => {
    try {
      const result = await listOrganizationAuditLogs(organizationIdParam(req), Number(req.query.page ?? 1), Number(req.query.pageSize ?? 50));
      res.json(result);
    } catch (error) {
      next(error);
    }
  },
);

organizationPlatformRouter.get("/:organizationId/notifications", requireTenantAccess(), async (req, res, next) => {
  try {
    const notifications = await listOrganizationNotifications(organizationIdParam(req), req.auth!.id, req.query.unread === "1");
    res.json({ notifications });
  } catch (error) {
    next(error);
  }
});

organizationPlatformRouter.post(
  "/:organizationId/notifications",
  requireTenantAccess(),
  requirePermission("notification.manage"),
  validateBody(notificationCreateSchema),
  async (req, res, next) => {
    try {
      const notification = await createOrganizationNotification({ ...req.body, organizationId: organizationIdParam(req) });
      res.status(201).json({ notification });
    } catch (error) {
      next(error);
    }
  },
);
