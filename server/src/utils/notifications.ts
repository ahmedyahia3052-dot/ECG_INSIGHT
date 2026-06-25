import type { NotificationType, Role } from "@prisma/client";
import { prisma } from "../config/prisma";
import { emitRealtime } from "../realtime/realtime.service";

export async function createNotification(input: {
  actionUrl?: string;
  caseId?: string;
  entityId?: string;
  entityType?: string;
  message: string;
  patientId?: string;
  reportId?: string;
  targetRole?: Role;
  title: string;
  type?: NotificationType;
  userId?: string;
}) {
  const notification = await prisma.notification.create({
    data: {
      actionUrl: input.actionUrl ?? destinationUrl(input),
      caseId: input.caseId,
      entityId: input.entityId ?? input.reportId ?? input.patientId ?? input.caseId,
      entityType: input.entityType ?? (input.reportId ? "report" : input.patientId ? "patient" : input.caseId ? "ecg_case" : undefined),
      message: input.message,
      patientId: input.patientId,
      reportId: input.reportId,
      targetRole: input.targetRole,
      title: input.title,
      type: input.type ?? "INFO",
      userId: input.userId,
    },
  });
  emitRealtime("notification.created", notification, input.userId ? [`user:${input.userId}`] : []);
  return notification;
}

function destinationUrl(input: { caseId?: string; entityType?: string; patientId?: string; reportId?: string }) {
  if (input.entityType === "ecg_review" && input.caseId) return `/ecg-cases/${input.caseId}/review`;
  if (input.caseId) return `/ecg-cases/${input.caseId}`;
  if (input.patientId) return `/patients/${input.patientId}`;
  if (input.reportId) return `/reports/${input.reportId}`;
  return undefined;
}
