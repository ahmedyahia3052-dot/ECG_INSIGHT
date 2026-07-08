import type { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { emitRealtime } from "../../realtime/realtime.service";
import { logNotificationEngineAudit } from "./audit.service";
import {
  deliveryModeToChannel,
  deliveryModeToProvider,
  deliveryStatusForMode,
  matchRulesForEvent,
  mergeRecipientUserIds,
  recipientStatusForMode,
  renderTemplate,
} from "./rule-engine";
import {
  createClinicalEventRecord,
  ensureDefaultNotificationRules,
  findNotificationTemplate,
  listEnabledRulesForEvent,
  listEnterpriseNotificationsForUser,
  listUnreadEnterpriseNotifications,
  resolveCaseStakeholderUserIds,
} from "./repository";
import type { EnterpriseNotificationView, PublishClinicalEventInput, PublishedEventResult } from "./types";
import { ENTERPRISE_NOTIFICATION_ENGINE_VERSION } from "./types";

function serializeEnterpriseNotification(input: {
  notification: {
    caseId: string | null;
    category: string;
    clinicalEventId: string | null;
    createdAt: Date;
    id: string;
    message: string;
    patientId: string | null;
    read: boolean;
    title: string;
    type: string;
    recipients: Array<{ deliveryMode: string; readAt: Date | null; status: string }>;
  };
  readAt?: Date | null;
}): EnterpriseNotificationView {
  return {
    caseId: input.notification.caseId ?? undefined,
    category: input.notification.category as EnterpriseNotificationView["category"],
    clinicalEventId: input.notification.clinicalEventId ?? undefined,
    createdAt: input.notification.createdAt.toISOString(),
    deliveryModes: input.notification.recipients.map((recipient) => recipient.deliveryMode as EnterpriseNotificationView["deliveryModes"][number]),
    id: input.notification.id,
    message: input.notification.message,
    patientId: input.notification.patientId ?? undefined,
    read: input.notification.read,
    readAt: input.readAt?.toISOString(),
    title: input.notification.title,
    type: input.notification.type.toLowerCase(),
  };
}

export async function publishClinicalEvent(input: PublishClinicalEventInput): Promise<PublishedEventResult> {
  await ensureDefaultNotificationRules();

  let patientId = input.patientId;
  let stakeholderUserIds: string[] = [];
  if (input.caseId) {
    const stakeholders = await resolveCaseStakeholderUserIds(input.caseId);
    patientId = patientId ?? stakeholders.patientId;
    stakeholderUserIds = stakeholders.userIds;
  }

  const clinicalEvent = await createClinicalEventRecord({
    actorId: input.actorId,
    caseId: input.caseId,
    eventType: input.eventType,
    message: input.message,
    patientId,
    payload: input.payload,
    title: input.title,
  });

  const recipientUserIds = mergeRecipientUserIds(stakeholderUserIds, input.recipientUserIds);

  await logNotificationEngineAudit({
    action: "CLINICAL_EVENT_PUBLISHED",
    actorId: input.actorId ?? recipientUserIds[0] ?? input.caseId ?? clinicalEvent.id,
    caseId: input.caseId,
    entityId: clinicalEvent.id,
    entityType: "ClinicalEvent",
    message: `Clinical event published: ${input.eventType}.`,
    metadata: {
      engineVersion: ENTERPRISE_NOTIFICATION_ENGINE_VERSION,
      eventType: input.eventType,
      title: input.title,
    },
    patientId,
  });

  const persistedRules = await listEnabledRulesForEvent(input.eventType);
  const rules = persistedRules.length
    ? persistedRules.map((rule) => ({
        category: rule.category,
        deliveryModes: rule.deliveryModes,
        description: rule.description,
        eventType: rule.eventType,
        id: rule.id,
        name: rule.name,
        notificationType: rule.notificationType,
        priority: rule.priority,
        ruleCode: rule.ruleCode,
        templateKey: rule.templateKey ?? undefined,
      }))
    : matchRulesForEvent(input.eventType);
  const notificationIds: string[] = [];
  let recipientCount = 0;

  const templateVariables: Record<string, unknown> = {
    caseId: input.caseId,
    message: input.message,
    patientId,
    title: input.title,
    ...(input.payload ?? {}),
  };

  for (const rule of rules) {
    const template = await findNotificationTemplate(rule.templateKey);
    const title = template ? renderTemplate(template.titleTemplate, templateVariables) : input.title;
    const message = template ? renderTemplate(template.bodyTemplate, templateVariables) : input.message;

    for (const userId of recipientUserIds) {
      const notification = await prisma.notification.create({
        data: {
          caseId: input.caseId,
          category: rule.category,
          clinicalEventId: clinicalEvent.id,
          engineVersion: ENTERPRISE_NOTIFICATION_ENGINE_VERSION,
          message,
          patientId,
          priority: rule.priority,
          read: false,
          sentAt: new Date(),
          templateId: template?.id,
          title,
          type: rule.notificationType,
          userId,
        },
      });
      notificationIds.push(notification.id);

      for (const deliveryMode of rule.deliveryModes) {
        const recipient = await prisma.notificationRecipient.create({
          data: {
            deliveredAt: deliveryMode === "IN_APP" ? new Date() : undefined,
            deliveryMode,
            notificationId: notification.id,
            status: recipientStatusForMode(deliveryMode),
            userId,
          },
        });
        recipientCount += 1;

        const deliveryLog = await prisma.notificationDeliveryLog.create({
          data: {
            attemptCount: deliveryStatusForMode(deliveryMode) === "SENT" ? 1 : 0,
            channel: deliveryModeToChannel(deliveryMode),
            deliveredAt: deliveryStatusForMode(deliveryMode) === "SENT" ? new Date() : undefined,
            notificationId: notification.id,
            payloadJson: {
              deliveryMode,
              engineVersion: ENTERPRISE_NOTIFICATION_ENGINE_VERSION,
              eventType: input.eventType,
              recipientId: recipient.id,
            } as Prisma.InputJsonObject,
            provider: deliveryModeToProvider(deliveryMode),
            status: deliveryStatusForMode(deliveryMode),
            subject: title,
            userId,
          },
        });

        await logNotificationEngineAudit({
          action: "NOTIFICATION_ENGINE_DELIVERED",
          actorId: input.actorId ?? userId,
          caseId: input.caseId,
          entityId: deliveryLog.id,
          entityType: "NotificationDeliveryLog",
          message: `Notification delivered via ${deliveryMode} for event ${input.eventType}.`,
          metadata: {
            deliveryMode,
            notificationId: notification.id,
            recipientId: recipient.id,
            userId,
          },
          patientId,
        });

        if (deliveryMode === "IN_APP") {
          emitRealtime("notification.created", notification, [`user:${userId}`]);
          emitRealtime("notification.count.updated", { userId }, [`user:${userId}`]);
        }
      }
    }
  }

  return {
    clinicalEventId: clinicalEvent.id,
    engineVersion: ENTERPRISE_NOTIFICATION_ENGINE_VERSION,
    eventType: input.eventType,
    notificationIds,
    recipientCount,
  };
}

export {
  ensureDefaultNotificationRules,
  listClinicalEventHistory,
} from "./repository";

export { serializeEnterpriseNotification };

export async function listUnreadNotificationsForUser(userId: string, limit = 50) {
  const recipients = await listUnreadEnterpriseNotifications(userId, limit);
  return recipients.map((recipient) =>
    serializeEnterpriseNotification({
      notification: recipient.notification,
      readAt: recipient.readAt,
    }),
  );
}

export async function listNotificationsForUser(userId: string, query: { limit?: number; page?: number; read?: boolean }) {
  const result = await listEnterpriseNotificationsForUser({
    limit: query.limit,
    page: query.page,
    read: query.read,
    userId,
  });

  return {
    notifications: result.recipients.map((recipient) =>
      serializeEnterpriseNotification({
        notification: recipient.notification,
        readAt: recipient.readAt,
      }),
    ),
    page: result.page,
    pageSize: result.pageSize,
    total: result.total,
    totalPages: Math.ceil(result.total / result.pageSize),
  };
}

export async function markNotificationsRead(userId: string, input: { all?: boolean; notificationIds?: string[] }) {
  const where: Prisma.NotificationRecipientWhereInput = input.all
    ? {
        deliveryMode: "IN_APP",
        status: { in: ["PENDING", "DELIVERED"] },
        userId,
      }
    : {
        deliveryMode: "IN_APP",
        notification: { id: { in: input.notificationIds ?? [] } },
        userId,
      };

  const recipients = await prisma.notificationRecipient.findMany({
    include: { notification: true },
    where,
  });

  const now = new Date();
  let updatedCount = 0;

  for (const recipient of recipients) {
    await prisma.notificationRecipient.update({
      data: {
        readAt: now,
        status: "READ",
      },
      where: { id: recipient.id },
    });

    await prisma.notification.update({
      data: { read: true },
      where: { id: recipient.notificationId },
    });

    await logNotificationEngineAudit({
      action: "NOTIFICATION_ENGINE_READ",
      actorId: userId,
      caseId: recipient.notification.caseId ?? undefined,
      entityId: recipient.notificationId,
      entityType: "Notification",
      message: `Notification marked read: ${recipient.notification.title}.`,
      metadata: {
        recipientId: recipient.id,
      },
      patientId: recipient.notification.patientId ?? undefined,
    });

    updatedCount += 1;
  }

  emitRealtime("notification.count.updated", { userId }, [`user:${userId}`]);

  return { updatedCount };
}
