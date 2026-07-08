import type { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";

export async function recordEngineAudit(input: {
  action: "ENTERPRISE_RULE_EXECUTED";
  actorId: string;
  caseId: string;
  message: string;
  metadata?: Prisma.InputJsonValue;
  patientId: string;
}) {
  return prisma.auditLog.create({
    data: {
      action: input.action,
      actorId: input.actorId,
      caseId: input.caseId,
      message: input.message,
      metadata: input.metadata,
      patientId: input.patientId,
    },
  });
}
