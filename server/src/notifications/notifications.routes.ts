import { Router } from "express";
import type { RequestHandler } from "express";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { requireAuth } from "../middleware/auth";
import { AppError } from "../middleware/error";
import { emitRealtime } from "../realtime/realtime.service";

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
  createdAt: Date;
  entityId: string | null;
  entityType: string | null;
  id: string;
  message: string;
  patientId: string | null;
  read: boolean;
  reportId: string | null;
  title: string;
  type: string;
}) {
  return {
    actionUrl: destination(notification),
    caseId: notification.caseId ?? undefined,
    entityId: notification.entityId ?? undefined,
    entityType: notification.entityType ?? undefined,
    id: notification.id,
    message: notification.message,
    patientId: notification.patientId ?? undefined,
    read: notification.read,
    reportId: notification.reportId ?? undefined,
    timestamp: notification.createdAt.toISOString(),
    title: notification.title,
    type: notification.type.toLowerCase(),
  };
}

notificationsRouter.get("/", async (req, res, next) => {
  try {
    const query = z
      .object({
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
    const notification = await prisma.notification.create({
      data: {
        actionUrl: body.actionUrl,
        caseId: body.caseId,
        entityId: body.entityId ?? body.reportId ?? body.patientId ?? body.caseId,
        entityType: body.entityType ?? (body.reportId ? "report" : body.patientId ? "patient" : body.caseId ? "ecg_case" : undefined),
        message: body.message,
        patientId: body.patientId,
        priority: body.priority,
        reportId: body.reportId,
        title: body.title,
        type: body.type,
        userId: body.userId ?? req.auth!.id,
      },
    });
    emitRealtime("notification.created", notification, [`user:${notification.userId ?? req.auth!.id}`]);
    res.status(201).json({ notification: serializeNotification(notification) });
  } catch (error) {
    next(error);
  }
});

notificationsRouter.post("/preferences", async (req, res, next) => {
  try {
    const body = z.object({ preferences: z.record(z.string(), z.unknown()) }).parse(req.body);
    const notification = await prisma.notification.create({
      data: {
        message: "Notification preferences updated.",
        preferences: body.preferences as Prisma.InputJsonObject,
        title: "Notification Preferences",
        type: "INFO",
        userId: req.auth!.id,
      },
    });
    res.status(201).json({ notification });
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
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
