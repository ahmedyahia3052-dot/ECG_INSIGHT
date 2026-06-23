import { Router } from "express";
import { prisma } from "../config/prisma";
import { requireAuth } from "../middleware/auth";

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
