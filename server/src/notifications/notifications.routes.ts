import { Router } from "express";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { requireAuth } from "../middleware/auth";
import { emitRealtime } from "../realtime/realtime.service";

export const notificationsRouter = Router();

notificationsRouter.use(requireAuth);

notificationsRouter.get("/", async (req, res, next) => {
  try {
    const notifications = await prisma.notification.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      where: {
        OR: [{ userId: req.auth!.id }, { targetRole: req.auth!.role }, { targetRole: null, userId: null }],
      },
    });

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
    const notification = await prisma.notification.update({
      data: { read: true },
      where: { id: String(req.params.notificationId) },
    });
    res.json({ notification });
  } catch (error) {
    next(error);
  }
});
