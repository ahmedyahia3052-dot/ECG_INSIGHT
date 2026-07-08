import type { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";

type EngineAuditInput = {
  action: "ENTERPRISE_RULE_EXECUTED";
  actorId: string;
  caseId: string;
  message: string;
  metadata?: Prisma.InputJsonValue;
  patientId: string;
};

export async function recordEngineAudit(input: EngineAuditInput) {
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

export async function recordEngineAuditsBatch(inputs: EngineAuditInput[]) {
  if (!inputs.length) return { count: 0 };
  const result = await prisma.auditLog.createMany({
    data: inputs.map((input) => ({
      action: input.action,
      actorId: input.actorId,
      caseId: input.caseId,
      message: input.message,
      metadata: input.metadata,
      patientId: input.patientId,
    })),
  });
  return result;
}
