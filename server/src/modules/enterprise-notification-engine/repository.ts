import type { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { DEFAULT_NOTIFICATION_RULES } from "./notification-rules";
import { ENTERPRISE_NOTIFICATION_ENGINE_VERSION } from "./types";

export async function ensureDefaultNotificationRules() {
  await Promise.all(
    DEFAULT_NOTIFICATION_RULES.map((rule) =>
      prisma.notificationRule.upsert({
        create: {
          category: rule.category,
          criteriaJson: rule.criteriaJson as Prisma.InputJsonObject | undefined,
          deliveryModes: rule.deliveryModes,
          description: rule.description,
          enabled: true,
          eventType: rule.eventType,
          name: rule.name,
          notificationType: rule.notificationType,
          priority: rule.priority,
          ruleCode: rule.ruleCode,
          templateKey: rule.templateKey,
          version: ENTERPRISE_NOTIFICATION_ENGINE_VERSION,
        },
        update: {
          category: rule.category,
          deliveryModes: rule.deliveryModes,
          description: rule.description,
          eventType: rule.eventType,
          name: rule.name,
          notificationType: rule.notificationType,
          priority: rule.priority,
          templateKey: rule.templateKey,
          version: ENTERPRISE_NOTIFICATION_ENGINE_VERSION,
        },
        where: { ruleCode: rule.ruleCode },
      }),
    ),
  );
}

export async function listEnabledRulesForEvent(eventType: string) {
  return prisma.notificationRule.findMany({
    orderBy: [{ priority: "desc" }, { name: "asc" }],
    where: { enabled: true, eventType: eventType as never },
  });
}

export async function createClinicalEventRecord(input: {
  actorId?: string;
  caseId?: string;
  eventType: string;
  message: string;
  patientId?: string;
  payload?: Record<string, unknown>;
  title: string;
}) {
  return prisma.clinicalEvent.create({
    data: {
      actorId: input.actorId,
      caseId: input.caseId,
      engineVersion: ENTERPRISE_NOTIFICATION_ENGINE_VERSION,
      eventType: input.eventType as never,
      message: input.message,
      patientId: input.patientId,
      payloadJson: input.payload as Prisma.InputJsonObject | undefined,
      title: input.title,
    },
  });
}

export async function listClinicalEventHistory(filters: {
  caseId?: string;
  eventType?: string;
  limit?: number;
  patientId?: string;
}) {
  return prisma.clinicalEvent.findMany({
    orderBy: { createdAt: "desc" },
    take: filters.limit ?? 100,
    where: {
      ...(filters.caseId ? { caseId: filters.caseId } : {}),
      ...(filters.eventType ? { eventType: filters.eventType as never } : {}),
      ...(filters.patientId ? { patientId: filters.patientId } : {}),
    },
  });
}

export async function resolveCaseStakeholderUserIds(caseId: string) {
  const ecgCase = await prisma.eCGCase.findUnique({
    select: {
      assignedDoctorId: true,
      patientId: true,
      reviewedById: true,
      reviewerId: true,
      uploadedById: true,
    },
    where: { id: caseId },
  });
  if (!ecgCase) return { patientId: undefined as string | undefined, userIds: [] as string[] };

  const userIds = [
    ecgCase.uploadedById,
    ecgCase.assignedDoctorId,
    ecgCase.reviewedById,
    ecgCase.reviewerId,
  ].filter((value): value is string => Boolean(value));

  return { patientId: ecgCase.patientId, userIds: [...new Set(userIds)] };
}

export async function findNotificationTemplate(templateKey?: string | null, locale = "en") {
  if (!templateKey) return null;
  return prisma.notificationTemplate.findUnique({
    where: { key_locale: { key: templateKey, locale } },
  });
}

export async function listUnreadEnterpriseNotifications(userId: string, limit = 50) {
  return prisma.notificationRecipient.findMany({
    include: {
      notification: {
        include: {
          clinicalEvent: true,
          recipients: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    where: {
      deliveryMode: "IN_APP",
      status: { in: ["PENDING", "DELIVERED"] },
      userId,
    },
  });
}

export async function listEnterpriseNotificationsForUser(input: {
  limit?: number;
  page?: number;
  read?: boolean;
  userId: string;
}) {
  const page = input.page ?? 1;
  const pageSize = input.limit ?? 50;
  const where: Prisma.NotificationRecipientWhereInput = {
    deliveryMode: "IN_APP",
    userId: input.userId,
    ...(input.read === undefined
      ? {}
      : input.read
        ? { status: "READ" }
        : { status: { in: ["PENDING", "DELIVERED"] } }),
  };

  const [total, recipients] = await Promise.all([
    prisma.notificationRecipient.count({ where }),
    prisma.notificationRecipient.findMany({
      include: {
        notification: {
          include: {
            clinicalEvent: true,
            recipients: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      where,
    }),
  ]);

  return { page, pageSize, recipients, total };
}
