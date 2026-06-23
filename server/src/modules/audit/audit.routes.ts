import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/prisma";
import { requireAuth, requireRole } from "../../middleware/auth";

export const auditRouter = Router();

auditRouter.use(requireAuth);

auditRouter.get("/", requireRole("ADMIN"), async (req, res, next) => {
  try {
    const entityType = typeof req.query.entityType === "string" ? req.query.entityType : undefined;
    const patientId = typeof req.query.patientId === "string" ? req.query.patientId : undefined;
    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      where: { entityType, patientId },
    });
    res.json({ logs });
  } catch (error) {
    next(error);
  }
});

auditRouter.post("/", requireRole("DOCTOR"), async (req, res, next) => {
  try {
    const body = z
      .object({
        action: z.string().trim().min(1),
        entityId: z.string().trim().optional(),
        entityType: z.string().trim().optional(),
        message: z.string().trim().min(1),
        newValue: z.unknown().optional(),
        oldValue: z.unknown().optional(),
        patientId: z.string().trim().optional(),
      })
      .parse(req.body);
    const log = await prisma.auditLog.create({
      data: {
        action: body.action as "CASE_UPDATED",
        actorId: req.auth!.id,
        entityId: body.entityId,
        entityType: body.entityType,
        ipAddress: req.ip,
        message: body.message,
        newValue: body.newValue === undefined ? undefined : JSON.parse(JSON.stringify(body.newValue)),
        oldValue: body.oldValue === undefined ? undefined : JSON.parse(JSON.stringify(body.oldValue)),
        patientId: body.patientId,
        userAgent: req.get("user-agent"),
      },
    });
    res.status(201).json({ log });
  } catch (error) {
    next(error);
  }
});
