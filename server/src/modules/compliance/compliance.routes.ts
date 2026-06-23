import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/prisma";
import { requireAuth, requireRole } from "../../middleware/auth";

export const complianceRouter = Router();

complianceRouter.use(requireAuth);

complianceRouter.get("/consents", async (req, res, next) => {
  try {
    const patientId = typeof req.query.patientId === "string" ? req.query.patientId : undefined;
    const consents = await prisma.patientConsent.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      where: { patientId },
    });
    res.json({ consents });
  } catch (error) {
    next(error);
  }
});

complianceRouter.post("/consents", requireRole("DOCTOR"), async (req, res, next) => {
  try {
    const body = z
      .object({
        consentType: z.enum(["TREATMENT", "DATA_PROCESSING", "OCCUPATIONAL_HEALTH", "RESEARCH", "DATA_SHARING"]),
        expiresAt: z.string().datetime().optional(),
        granted: z.boolean().default(true),
        patientId: z.string().trim().min(1),
      })
      .parse(req.body);
    const patient = await prisma.patient.findUnique({ where: { id: body.patientId } });
    const consent = await prisma.patientConsent.create({
      data: {
        consentType: body.consentType,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
        granted: body.granted,
        organizationId: patient?.organizationId,
        patientId: body.patientId,
        userId: req.auth!.id,
      },
    });
    await prisma.auditLog.create({
      data: {
        action: "PATIENT_UPDATED",
        actorId: req.auth!.id,
        entityId: consent.id,
        entityType: "PatientConsent",
        message: "Patient consent recorded.",
        newValue: { consentType: consent.consentType, granted: consent.granted },
        patientId: body.patientId,
      },
    });
    res.status(201).json({ consent });
  } catch (error) {
    next(error);
  }
});

complianceRouter.get("/requests", requireRole("DOCTOR"), async (req, res, next) => {
  try {
    const patientId = typeof req.query.patientId === "string" ? req.query.patientId : undefined;
    const requests = await prisma.dataRequest.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      where: { patientId },
    });
    res.json({ requests });
  } catch (error) {
    next(error);
  }
});

complianceRouter.post("/requests", requireRole("DOCTOR"), async (req, res, next) => {
  try {
    const body = z
      .object({
        patientId: z.string().trim().min(1),
        reason: z.string().trim().optional(),
        requestType: z.enum(["EXPORT", "ERASURE", "ACCESS", "RECTIFICATION"]),
      })
      .parse(req.body);
    const patient = await prisma.patient.findUnique({ where: { id: body.patientId } });
    const dataRequest = await prisma.dataRequest.create({
      data: {
        organizationId: patient?.organizationId,
        patientId: body.patientId,
        reason: body.reason,
        requestType: body.requestType,
        userId: req.auth!.id,
      },
    });
    await prisma.auditLog.create({
      data: {
        action: "COMPLIANCE_REQUEST_CREATED",
        actorId: req.auth!.id,
        entityId: dataRequest.id,
        entityType: "DataRequest",
        message: `Compliance data request created: ${dataRequest.requestType}.`,
        patientId: body.patientId,
      },
    });
    res.status(201).json({ request: dataRequest });
  } catch (error) {
    next(error);
  }
});
