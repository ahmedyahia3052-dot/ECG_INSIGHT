import type { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";

export async function recordEngineAudit(input: {
  action: "ECG_ALERT_ENGINE_GENERATED" | "ECG_RISK_ENGINE_RECALCULATED" | "CLINICAL_ALERT_CREATED" | "RISK_ASSESSMENT_COMPLETED";
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
