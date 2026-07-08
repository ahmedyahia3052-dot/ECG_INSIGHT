import type { AuditAction } from "@prisma/client";
import { recordEnterpriseAudit } from "../organization-platform/audit.service";

export const ORGANIZATION_DOMAIN_VERSION = "sprint84-v1";

export async function recordDomainAudit(
  action: AuditAction,
  ctx: { actorId: string; organizationId?: string; caseId?: string; patientId?: string },
  message: string,
  entity?: { entityId?: string; entityType?: string },
) {
  return recordEnterpriseAudit(action, ctx, message, {
    entityId: entity?.entityId,
    entityType: entity?.entityType,
  });
}
