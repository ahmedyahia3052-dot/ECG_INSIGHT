import type { AuditAction, Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";

export async function logNotificationEngineAudit(input: {
  action: AuditAction;
  actorId: string;
  caseId?: string;
  entityId?: string;
  entityType?: string;
  message: string;
  metadata?: Record<string, unknown>;
  patientId?: string;
}) {
  await prisma.auditLog.create({
    data: {
      action: input.action,
      actorId: input.actorId,
      caseId: input.caseId,
      entityId: input.entityId,
      entityType: input.entityType,
      message: input.message,
      metadata: input.metadata as Prisma.InputJsonObject | undefined,
      patientId: input.patientId,
    },
  });
}
