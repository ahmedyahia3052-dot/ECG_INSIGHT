/**
 * Sprint 80 — Audit field helpers for create/update repository operations.
 */

export type AuditActor = {
  userId: string;
};

export type CreateAuditFields = {
  createdAt: Date;
  createdById: string;
};

export type UpdateAuditFields = {
  updatedAt: Date;
  updatedById: string;
};

export function buildCreateAudit(actor: AuditActor, now = new Date()): CreateAuditFields {
  return { createdAt: now, createdById: actor.userId };
}

export function buildUpdateAudit(actor: AuditActor, now = new Date()): UpdateAuditFields {
  return { updatedAt: now, updatedById: actor.userId };
}

export function buildCreateUpdateAudit(actor: AuditActor, now = new Date()) {
  return { ...buildCreateAudit(actor, now), ...buildUpdateAudit(actor, now) };
}

/** Audit log payload for immutable AuditLog writes. */
export function buildAuditLogEntry(input: {
  action: string;
  actorId: string;
  caseId?: string;
  entityId?: string;
  entityType?: string;
  message: string;
  metadata?: Record<string, unknown>;
  organizationId?: string;
  patientId?: string;
}) {
  return {
    action: input.action,
    actorId: input.actorId,
    caseId: input.caseId,
    entityId: input.entityId,
    entityType: input.entityType,
    message: input.message,
    metadata: input.metadata,
    organizationId: input.organizationId,
    patientId: input.patientId,
  };
}
