import { Router } from "express";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { requireAuth } from "../middleware/auth";
import { AppError } from "../middleware/error";
import { emitRealtime } from "../realtime/realtime.service";

export const notificationsRouter = Router();

notificationsRouter.use(requireAuth);

notificationsRouter.get("/", async (req, res, next) => {
  try {
    const query = z
      .object({
        page: z.coerce.number().int().min(1).default(1),
        pageSize: z.coerce.number().int().min(1).max(100).default(50),
        read: z.enum(["true", "false"]).optional(),
        type: z.enum(["INFO", "WARNING", "SUCCESS", "CRITICAL"]).optional(),
      })
      .parse(req.query);
    const where: Prisma.NotificationWhereInput = {
      OR: [{ userId: req.auth!.id }, { targetRole: req.auth!.role }, { targetRole: null, userId: null }],
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
      notifications: notifications.map((notification) => ({
        caseId: notification.caseId ?? undefined,
        id: notification.id,
        message: notification.message,
        read: notification.read,
        timestamp: notification.createdAt.toISOString(),
        title: notification.title,
        type: notification.type.toLowerCase(),
      })),
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
        priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("MEDIUM"),
        title: z.string().trim().min(1),
        type: z.enum(["INFO", "WARNING", "SUCCESS", "CRITICAL"]).default("INFO"),
        userId: z.string().trim().optional(),
      })
      .parse(req.body);
    const notification = await prisma.notification.create({
      data: {
        message: body.message,
        priority: body.priority,
        title: body.title,
        type: body.type,
        userId: body.userId ?? req.auth!.id,
      },
    });
    emitRealtime("notification.created", notification, [`user:${notification.userId ?? req.auth!.id}`]);
    res.status(201).json({ notification });
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

notificationsRouter.post("/:notificationId/read", async (req, res, next) => {
  try {
    const existing = await prisma.notification.findFirst({
      where: {
        id: String(req.params.notificationId),
        OR: [{ userId: req.auth!.id }, { targetRole: req.auth!.role }, { targetRole: null, userId: null }],
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
    res.json({ notification });
  } catch (error) {
    next(error);
  }
});

notificationsRouter.delete("/:notificationId", async (req, res, next) => {
  try {
    const notification = await prisma.notification.findFirst({
      where: {
        id: String(req.params.notificationId),
        OR: [{ userId: req.auth!.id }, ...(req.auth!.role === "SUPER_ADMIN" || req.auth!.role === "ADMIN" ? [{}] : [])],
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
