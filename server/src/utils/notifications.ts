import type { NotificationCategory, NotificationChannel, NotificationType, Role } from "@prisma/client";
import { createUnifiedNotification } from "../notifications/notification-center.service";

export async function createNotification(input: {
  actionUrl?: string;
  caseId?: string;
  category?: NotificationCategory;
  channels?: NotificationChannel[];
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
  return createUnifiedNotification(input);
}
