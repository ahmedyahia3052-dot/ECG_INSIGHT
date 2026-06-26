import { Router } from "express";
import type { RequestHandler } from "express";
import type { NotificationCategory, NotificationChannel, Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { requireAuth, requireRole } from "../middleware/auth";
import { AppError } from "../middleware/error";
import { emitRealtime } from "../realtime/realtime.service";
import {
  broadcastNotification,
  createUnifiedNotification,
  ensureDefaultNotificationTemplates,
  processScheduledNotifications,
  unreadNotificationCount,
  upsertNotificationPreferences,
} from "./notification-center.service";

export const notificationsRouter = Router();

notificationsRouter.use(requireAuth);

function canSeeNotification(req: { auth?: Express.AuthUser }) {
  return {
    OR: [
      { userId: req.auth!.id },
      { targetRole: req.auth!.role },
      { targetRole: null, userId: null },
      ...(req.auth!.role === "SUPER_ADMIN" || req.auth!.role === "ADMIN" ? [{}] : []),
    ],
  } satisfies Prisma.NotificationWhereInput;
}

function destination(notification: { actionUrl: string | null; caseId: string | null; entityId: string | null; entityType: string | null; patientId: string | null; reportId: string | null }) {
  if (notification.actionUrl) return notification.actionUrl;
  if (notification.entityType === "ecg_review" && notification.caseId) return `/ecg-cases/${notification.caseId}/review`;
  if (notification.caseId) return `/ecg-cases/${notification.caseId}`;
  if (notification.patientId) return `/patients/${notification.patientId}`;
  if (notification.reportId) return `/reports/${notification.reportId}`;
  if (notification.entityType === "patient" && notification.entityId) return `/patients/${notification.entityId}`;
  if (notification.entityType === "report" && notification.entityId) return `/reports/${notification.entityId}`;
  return undefined;
}

function serializeNotification(notification: {
  actionUrl: string | null;
  caseId: string | null;
  category?: string;
  createdAt: Date;
  entityId: string | null;
  entityType: string | null;
  id: string;
  message: string;
  patientId: string | null;
  read: boolean;
  reportId: string | null;
  scheduledAt?: Date | null;
  sentAt?: Date | null;
  title: string;
  type: string;
}) {
  return {
    actionUrl: destination(notification),
    caseId: notification.caseId ?? undefined,
    category: notification.category,
    entityId: notification.entityId ?? undefined,
    entityType: notification.entityType ?? undefined,
    id: notification.id,
    message: notification.message,
    patientId: notification.patientId ?? undefined,
    read: notification.read,
    reportId: notification.reportId ?? undefined,
    scheduledAt: notification.scheduledAt?.toISOString(),
    sentAt: notification.sentAt?.toISOString(),
    timestamp: notification.createdAt.toISOString(),
    title: notification.title,
    type: notification.type.toLowerCase(),
  };
}

notificationsRouter.get("/", async (req, res, next) => {
  try {
    const query = z
      .object({
        category: z.enum(["CRITICAL_ECG_ALERT", "SUBSCRIPTION_EVENT", "PAYMENT_EVENT", "REPORT_GENERATION", "USER_INVITATION", "OCCUPATIONAL_CLEARANCE", "SYSTEM_ALERT"]).optional(),
        page: z.coerce.number().int().min(1).default(1),
        pageSize: z.coerce.number().int().min(1).max(100).default(50),
        q: z.string().trim().optional(),
        read: z.enum(["true", "false"]).optional(),
        type: z.enum(["INFO", "WARNING", "SUCCESS", "CRITICAL"]).optional(),
      })
      .parse(req.query);
    const where: Prisma.NotificationWhereInput = {
      AND: [
        canSeeNotification(req),
        ...(query.q
          ? [
              {
                OR: [
                  { title: { contains: query.q } },
                  { message: { contains: query.q } },
                ],
              },
            ]
          : []),
      ],
      ...(query.read ? { read: query.read === "true" } : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(query.category ? { category: query.category } : {}),
    };
    const [total, notifications] = await Promise.all([
      prisma.notification.count({ where }),
      prisma.notification.findMany({
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        where,
      }),
    ]);

    res.json({
      notifications: notifications.map(serializeNotification),
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.ceil(total / query.pageSize),
    });
  } catch (error) {
    next(error);
  }
});

notificationsRouter.post("/", async (req, res, next) => {
  try {
    const body = z
      .object({
        category: z.enum(["CRITICAL_ECG_ALERT", "SUBSCRIPTION_EVENT", "PAYMENT_EVENT", "REPORT_GENERATION", "USER_INVITATION", "OCCUPATIONAL_CLEARANCE", "SYSTEM_ALERT"]).default("SYSTEM_ALERT"),
        channels: z.array(z.enum(["IN_APP", "EMAIL", "PUSH", "SMS"])).default(["IN_APP"]),
        message: z.string().trim().min(1),
        patientId: z.string().trim().optional(),
        priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("MEDIUM"),
        reportId: z.string().trim().optional(),
        caseId: z.string().trim().optional(),
        actionUrl: z.string().trim().optional(),
        entityId: z.string().trim().optional(),
        entityType: z.string().trim().optional(),
        title: z.string().trim().min(1),
        type: z.enum(["INFO", "WARNING", "SUCCESS", "CRITICAL"]).default("INFO"),
        userId: z.string().trim().optional(),
      })
      .parse(req.body);
    const notification = await createUnifiedNotification({
      ...body,
      category: body.category,
      channels: body.channels,
      userId: body.userId ?? req.auth!.id,
    });
    res.status(201).json({ notification: serializeNotification(notification) });
  } catch (error) {
    next(error);
  }
});

notificationsRouter.get("/unread-count", async (req, res, next) => {
  try {
    res.json({ unreadCount: await unreadNotificationCount(req.auth!.id, req.auth!.role) });
  } catch (error) {
    next(error);
  }
});

notificationsRouter.get("/history", async (req, res, next) => {
  try {
    const logs = await prisma.notificationDeliveryLog.findMany({
      include: { notification: true },
      orderBy: { createdAt: "desc" },
      take: 100,
      where: { userId: req.auth!.id },
    });
    res.json({ logs });
  } catch (error) {
    next(error);
  }
});

notificationsRouter.get("/preferences", async (req, res, next) => {
  try {
    const preferences = await prisma.notificationPreference.findMany({ orderBy: { category: "asc" }, where: { userId: req.auth!.id } });
    res.json({ preferences });
  } catch (error) {
    next(error);
  }
});

notificationsRouter.put("/preferences", async (req, res, next) => {
  try {
    const body = z.object({
      preferences: z.array(z.object({
        category: z.enum(["CRITICAL_ECG_ALERT", "SUBSCRIPTION_EVENT", "PAYMENT_EVENT", "REPORT_GENERATION", "USER_INVITATION", "OCCUPATIONAL_CLEARANCE", "SYSTEM_ALERT"]),
        emailEnabled: z.boolean().optional(),
        frequency: z.enum(["IMMEDIATE", "DAILY_DIGEST", "WEEKLY_DIGEST", "MUTED"]).optional(),
        inAppEnabled: z.boolean().optional(),
        locale: z.string().trim().min(2).max(12).optional(),
        pushEnabled: z.boolean().optional(),
        smsEnabled: z.boolean().optional(),
      })),
    }).parse(req.body);
    const preferences = await upsertNotificationPreferences(req.auth!.id, body.preferences);
    res.json({ preferences });
  } catch (error) {
    next(error);
  }
});

notificationsRouter.post("/preferences", async (req, res, next) => {
  try {
    const legacy = z.object({ preferences: z.record(z.string(), z.unknown()) }).parse(req.body);
    const preferences = Object.entries(legacy.preferences).map(([category, value]) => ({
      category: category as NotificationCategory,
      ...(typeof value === "object" && value ? value as Record<string, unknown> : {}),
    }));
    res.status(201).json({ preferences: await upsertNotificationPreferences(req.auth!.id, preferences as Parameters<typeof upsertNotificationPreferences>[1]) });
  } catch (error) {
    next(error);
  }
});

notificationsRouter.get("/templates", requireRole("ADMIN"), async (_req, res, next) => {
  try {
    await ensureDefaultNotificationTemplates();
    const templates = await prisma.notificationTemplate.findMany({ orderBy: [{ key: "asc" }, { locale: "asc" }] });
    res.json({ templates });
  } catch (error) {
    next(error);
  }
});

notificationsRouter.post("/templates", requireRole("ADMIN"), async (req, res, next) => {
  try {
    const body = z.object({
      active: z.boolean().default(true),
      bodyTemplate: z.string().min(1),
      category: z.enum(["CRITICAL_ECG_ALERT", "SUBSCRIPTION_EVENT", "PAYMENT_EVENT", "REPORT_GENERATION", "USER_INVITATION", "OCCUPATIONAL_CLEARANCE", "SYSTEM_ALERT"]),
      htmlTemplate: z.string().optional(),
      key: z.string().trim().min(2),
      locale: z.string().trim().min(2).default("en"),
      pushTemplate: z.string().optional(),
      smsTemplate: z.string().optional(),
      titleTemplate: z.string().min(1),
      variables: z.record(z.string(), z.unknown()).optional(),
    }).parse(req.body);
    const template = await prisma.notificationTemplate.upsert({
      create: { ...body, variables: body.variables as Prisma.InputJsonObject | undefined },
      update: { ...body, variables: body.variables as Prisma.InputJsonObject | undefined },
      where: { key_locale: { key: body.key, locale: body.locale } },
    });
    res.status(201).json({ template });
  } catch (error) {
    next(error);
  }
});

notificationsRouter.post("/admin/broadcast", requireRole("ADMIN"), async (req, res, next) => {
  try {
    const body = z.object({
      category: z.enum(["CRITICAL_ECG_ALERT", "SUBSCRIPTION_EVENT", "PAYMENT_EVENT", "REPORT_GENERATION", "USER_INVITATION", "OCCUPATIONAL_CLEARANCE", "SYSTEM_ALERT"]).default("SYSTEM_ALERT"),
      channels: z.array(z.enum(["IN_APP", "EMAIL", "PUSH", "SMS"])).default(["IN_APP", "EMAIL"]),
      message: z.string().trim().min(1),
      scheduledAt: z.coerce.date().optional(),
      targetRole: z.enum(["OWNER", "SUPER_ADMIN", "ADMIN", "DOCTOR", "CORPORATE_CLIENT", "USER", "STUDENT"]).optional(),
      title: z.string().trim().min(1),
      type: z.enum(["INFO", "WARNING", "SUCCESS", "CRITICAL"]).default("INFO"),
      userIds: z.array(z.string()).optional(),
    }).parse(req.body);
    const notifications = await broadcastNotification({
      category: body.category,
      channels: body.channels as NotificationChannel[],
      message: body.message,
      scheduledAt: body.scheduledAt,
      targetRole: body.targetRole,
      title: body.title,
      type: body.type,
      userIds: body.userIds,
    });
    await prisma.auditLog.create({
      data: {
        action: "NOTIFICATION_UPDATED",
        actorId: req.auth!.id,
        entityType: "Notification",
        message: `Broadcast notification created for ${notifications.length} recipient(s).`,
        metadata: { category: body.category, scheduledAt: body.scheduledAt?.toISOString(), targetRole: body.targetRole } as Prisma.InputJsonObject,
      },
    });
    res.status(201).json({ notifications });
  } catch (error) {
    next(error);
  }
});

notificationsRouter.post("/admin/process-scheduled", requireRole("ADMIN"), async (_req, res, next) => {
  try {
    res.json({ notifications: await processScheduledNotifications() });
  } catch (error) {
    next(error);
  }
});

notificationsRouter.patch("/read-all", async (req, res, next) => {
  try {
    const result = await prisma.notification.updateMany({
      data: { read: true },
      where: canSeeNotification(req),
    });
    await prisma.auditLog.create({
      data: {
        action: "NOTIFICATION_UPDATED",
        actorId: req.auth!.id,
        message: `Marked ${result.count} notifications as read.`,
      },
    });
    emitRealtime("notification.count.updated", { userId: req.auth!.id }, [`user:${req.auth!.id}`]);
    res.json({ updatedCount: result.count });
  } catch (error) {
    next(error);
  }
});

const markNotificationReadHandler: RequestHandler = async (req, res, next) => {
  try {
    const existing = await prisma.notification.findFirst({
      where: {
        id: String(req.params.notificationId),
        ...canSeeNotification(req),
      },
    });
    if (!existing) throw new AppError(404, "Notification not found.", "NOTIFICATION_NOT_FOUND");
    const notification = await prisma.notification.update({
      data: { read: true },
      where: { id: existing.id },
    });
    await prisma.auditLog.create({
      data: {
        action: "NOTIFICATION_UPDATED",
        actorId: req.auth!.id,
        caseId: notification.caseId,
        entityId: notification.id,
        entityType: "Notification",
        message: `Notification marked read: ${notification.title}.`,
      },
    });
    emitRealtime("notification.updated", notification, [`user:${req.auth!.id}`]);
    emitRealtime("notification.count.updated", { userId: req.auth!.id }, [`user:${req.auth!.id}`]);
    res.json({ notification: serializeNotification(notification) });
  } catch (error) {
    next(error);
  }
};

notificationsRouter.patch("/:notificationId/read", markNotificationReadHandler);
notificationsRouter.post("/:notificationId/read", markNotificationReadHandler);

notificationsRouter.delete("/:notificationId", async (req, res, next) => {
  try {
    const notification = await prisma.notification.findFirst({
      where: {
        id: String(req.params.notificationId),
        ...canSeeNotification(req),
      },
    });
    if (!notification) throw new AppError(404, "Notification not found.", "NOTIFICATION_NOT_FOUND");
    await prisma.notification.delete({ where: { id: notification.id } });
    await prisma.auditLog.create({
      data: {
        action: "NOTIFICATION_DELETED",
        actorId: req.auth!.id,
        caseId: notification.caseId,
        entityId: notification.id,
        entityType: "Notification",
        message: `Notification deleted: ${notification.title}.`,
      },
    });
    emitRealtime("notification.count.updated", { userId: req.auth!.id }, [`user:${req.auth!.id}`]);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
