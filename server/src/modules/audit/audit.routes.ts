import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/prisma";
import { requireAuth, requireRole } from "../../middleware/auth";
import { AppError } from "../../middleware/error";

export const auditRouter = Router();

const clientAuditActionSchema = z.enum(["PATIENT_VIEWED", "REPORT_DOWNLOADED", "REPORT_VIEWED"]);

auditRouter.use(requireAuth);

auditRouter.get("/", requireRole("ADMIN"), async (req, res, next) => {
  try {
    const entityType = typeof req.query.entityType === "string" ? req.query.entityType : undefined;
    const patientId = typeof req.query.patientId === "string" ? req.query.patientId : undefined;
    const caseId = typeof req.query.caseId === "string" ? req.query.caseId : undefined;
    const logs = await prisma.auditLog.findMany({
      include: { actor: { select: { email: true, id: true, name: true, role: true } } },
      orderBy: { createdAt: "desc" },
      take: 200,
      where: { caseId, entityType, patientId },
    });
    res.json({
      logs: logs.map((log) => ({
        action: log.action,
        actor: log.actor ? { email: log.actor.email, id: log.actor.id, name: log.actor.name, role: log.actor.role } : null,
        actorId: log.actorId,
        caseId: log.caseId ?? undefined,
        createdAt: log.createdAt.toISOString(),
        id: log.id,
        message: log.message,
        metadata: log.metadata,
        newValue: log.newValue ?? undefined,
        oldValue: log.oldValue ?? undefined,
        patientId: log.patientId ?? undefined,
      })),
    });
  } catch (error) {
    next(error);
  }
});

auditRouter.post("/", requireRole("DOCTOR"), async (req, res, next) => {
  try {
    const body = z
      .object({
        action: clientAuditActionSchema,
        entityId: z.string().trim().optional(),
        entityType: z.string().trim().optional(),
        message: z.string().trim().min(1).max(500),
        newValue: z.unknown().optional(),
        oldValue: z.unknown().optional(),
        patientId: z.string().trim().optional(),
      })
      .parse(req.body);
    const log = await prisma.auditLog.create({
      data: {
        action: body.action,
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
    if (error instanceof z.ZodError) {
      next(new AppError(400, "Audit action is not permitted for client submission.", "AUDIT_ACTION_FORBIDDEN"));
      return;
    }
    next(error);
  }
});
