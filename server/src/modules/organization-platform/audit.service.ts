import type { AuditAction, Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";

export type AuditContext = {
  actorId: string;
  organizationId?: string;
  ipAddress?: string;
  userAgent?: string;
};

export async function recordEnterpriseAudit(
  action: AuditAction,
  ctx: AuditContext,
  message: string,
  details?: {
    entityType?: string;
    entityId?: string;
    metadata?: Prisma.InputJsonValue;
    oldValue?: Prisma.InputJsonValue;
    newValue?: Prisma.InputJsonValue;
  },
) {
  return prisma.auditLog.create({
    data: {
      action,
      actorId: ctx.actorId,
      entityId: details?.entityId,
      entityType: details?.entityType,
      message,
      metadata: details?.metadata,
      newValue: details?.newValue,
      oldValue: details?.oldValue,
      organizationId: ctx.organizationId,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    },
  });
}

export async function recordLoginHistory(input: {
  userId: string;
  organizationId?: string;
  ipAddress?: string;
  userAgent?: string;
  deviceId?: string;
  success: boolean;
  failureReason?: string;
}) {
  return prisma.loginHistory.create({ data: input });
}

export async function listOrganizationAuditLogs(organizationId: string, page = 1, pageSize = 50) {
  const skip = (page - 1) * pageSize;
  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
      where: { organizationId },
    }),
    prisma.auditLog.count({ where: { organizationId } }),
  ]);
  return { items, page, pageSize, total, totalPages: Math.ceil(total / pageSize) };
}
