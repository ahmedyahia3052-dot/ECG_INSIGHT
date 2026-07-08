import type { AuditAction, Prisma } from "@prisma/client";
import { prisma } from "../../../config/prisma";

export async function logLongitudinalAudit(input: {
  action: AuditAction;
  actorId: string;
  message: string;
  caseId?: string;
  patientId?: string;
  organizationId?: string | null;
  metadata?: Prisma.InputJsonValue;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        action: input.action,
        actor: { connect: { id: input.actorId } },
        case: input.caseId ? { connect: { id: input.caseId } } : undefined,
        patient: input.patientId ? { connect: { id: input.patientId } } : undefined,
        organizationId: input.organizationId ?? undefined,
        message: input.message,
        metadata: input.metadata,
        entityType: "ECGLongitudinalTimeline",
      },
    });
  } catch {
    // audit must not block clinical reads
  }

  if (input.patientId) {
    const timelineType =
      input.action === "ECG_TIMELINE_VIEWED"
        ? "ECG_TIMELINE_VIEWED"
        : input.action === "ECG_FOLLOW_UP_GENERATED"
          ? "ECG_FOLLOW_UP_RECOMMENDED"
          : input.action === "ECG_TREND_ANALYSIS_GENERATED"
            ? "ECG_TREND_ANALYSIS_GENERATED"
            : null;

    if (timelineType) {
      await prisma.timelineEvent
        .create({
          data: {
            patientId: input.patientId,
            caseId: input.caseId,
            type: timelineType,
            title: input.message,
            metadata: input.metadata,
          },
        })
        .catch(() => undefined);
    }
  }
}
