import type { CaseHistoryEventType, CaseManagementStatus, Prisma } from "@prisma/client";
import { prisma } from "../../../config/prisma";
import { serializeCaseAudit, serializeCaseEvent } from "../domain/types";

export class HistoryRepository {
  async recordHistory(input: {
    actorId?: string;
    caseId: string;
    eventType: CaseHistoryEventType;
    fromStatus?: CaseManagementStatus | null;
    payload?: Prisma.InputJsonValue;
    summary?: string;
    title: string;
    toStatus?: CaseManagementStatus | null;
  }) {
    try {
      const entry = await prisma.caseHistory.create({
        data: {
          actorId: input.actorId,
          caseId: input.caseId,
          eventType: input.eventType,
          fromStatus: input.fromStatus ?? undefined,
          payload: input.payload,
          summary: input.summary,
          title: input.title,
          toStatus: input.toStatus ?? undefined,
        },
      });
      return serializeCaseEvent(entry);
    } catch {
      return null;
    }
  }

  async recordAudit(input: {
    action: string;
    actorId: string;
    caseId: string;
    entityId?: string;
    entityType?: string;
    ipAddress?: string;
    message: string;
    metadata?: Prisma.InputJsonValue;
    newValue?: Prisma.InputJsonValue;
    oldValue?: Prisma.InputJsonValue;
  }) {
    try {
      const entry = await prisma.caseAudit.create({
        data: {
          action: input.action,
          actorId: input.actorId,
          caseId: input.caseId,
          entityId: input.entityId,
          entityType: input.entityType ?? "Case",
          ipAddress: input.ipAddress,
          message: input.message,
          metadata: input.metadata,
          newValue: input.newValue,
          oldValue: input.oldValue,
        },
      });
      await prisma.auditLog
        .create({
          data: {
            action: input.action as Prisma.AuditLogCreateInput["action"],
            actor: { connect: { id: input.actorId } },
            case: { connect: { id: input.caseId } },
            message: input.message,
            metadata: input.metadata,
            newValue: input.newValue,
            oldValue: input.oldValue,
          },
        })
        .catch(() => undefined);
      return serializeCaseAudit(entry);
    } catch {
      return null;
    }
  }

  async listHistory(caseId: string, limit: number, offset: number) {
    const [total, history] = await Promise.all([
      prisma.caseHistory.count({ where: { caseId } }),
      prisma.caseHistory.findMany({
        orderBy: { createdAt: "desc" },
        skip: offset,
        take: limit,
        where: { caseId },
      }),
    ]);
    return { history: history.map(serializeCaseEvent), offset, total };
  }

  async listAudit(caseId: string, limit: number, offset: number) {
    const [total, audit] = await Promise.all([
      prisma.caseAudit.count({ where: { caseId } }),
      prisma.caseAudit.findMany({
        orderBy: { createdAt: "desc" },
        skip: offset,
        take: limit,
        where: { caseId },
      }),
    ]);
    return { audit: audit.map(serializeCaseAudit), offset, total };
  }

  async listStatusHistory(caseId: string, limit: number, offset: number) {
    const [total, history] = await Promise.all([
      prisma.caseHistory.count({
        where: { caseId, eventType: { in: ["STATUS_CHANGED", "ARCHIVED", "RESTORED"] } },
      }),
      prisma.caseHistory.findMany({
        orderBy: { createdAt: "desc" },
        skip: offset,
        take: limit,
        where: { caseId, eventType: { in: ["STATUS_CHANGED", "ARCHIVED", "RESTORED"] } },
      }),
    ]);
    return { history: history.map(serializeCaseEvent), offset, total };
  }
}

export const historyRepository = new HistoryRepository();
