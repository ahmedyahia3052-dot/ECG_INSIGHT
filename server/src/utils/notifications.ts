import type { NotificationType, Role } from "@prisma/client";
import { prisma } from "../config/prisma";
import { emitRealtime } from "../realtime/realtime.service";

export async function createNotification(input: {
  caseId?: string;
  message: string;
  targetRole?: Role;
  title: string;
  type?: NotificationType;
  userId?: string;
}) {
  const notification = await prisma.notification.create({
    data: {
      caseId: input.caseId,
      message: input.message,
      targetRole: input.targetRole,
      title: input.title,
      type: input.type ?? "INFO",
      userId: input.userId,
    },
  });
  emitRealtime("notification.created", notification, input.userId ? [`user:${input.userId}`] : []);
  return notification;
}
