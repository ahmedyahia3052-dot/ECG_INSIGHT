import { Router } from "express";
import { Prisma } from "@prisma/client";
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

complianceRouter.post("/requests/:id/complete", requireRole("ADMIN"), async (req, res, next) => {
  try {
    const body = z.object({ responseJson: z.record(z.string(), z.unknown()).optional() }).parse(req.body);
    const existing = await prisma.dataRequest.findUnique({ where: { id: String(req.params.id) } });
    if (!existing) {
      res.status(404).json({ message: "Compliance request not found." });
      return;
    }
    const dataRequest = await prisma.dataRequest.update({
      data: { completedAt: new Date(), responseJson: body.responseJson as Prisma.InputJsonObject | undefined, status: "COMPLETED" },
      where: { id: existing.id },
    });
    await prisma.auditLog.create({
      data: {
        action: dataRequest.requestType === "ERASURE" ? "DATA_DELETED" : "DATA_EXPORTED",
        actorId: req.auth!.id,
        entityId: dataRequest.id,
        entityType: "DataRequest",
        ipAddress: req.ip,
        message: `Compliance request completed: ${dataRequest.requestType}.`,
        metadata: { requestType: dataRequest.requestType },
        patientId: dataRequest.patientId,
        userAgent: req.get("user-agent"),
      },
    });
    res.json({ request: dataRequest });
  } catch (error) {
    next(error);
  }
});

complianceRouter.get("/patients/:patientId/export", requireRole("DOCTOR"), async (req, res, next) => {
  try {
    const patient = await prisma.patient.findUnique({ where: { id: String(req.params.patientId) } });
    if (!patient) {
      res.status(404).json({ message: "Patient not found." });
      return;
    }
    const [cases, consents, requests, auditLogs] = await Promise.all([
      prisma.eCGCase.findMany({ take: 100, where: { patientId: patient.id } }),
      prisma.patientConsent.findMany({ where: { patientId: patient.id } }),
      prisma.dataRequest.findMany({ where: { patientId: patient.id } }),
      prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 100, where: { patientId: patient.id } }),
    ]);
    await prisma.auditLog.create({
      data: {
        action: "DATA_EXPORTED",
        actorId: req.auth!.id,
        entityId: patient.id,
        entityType: "Patient",
        ipAddress: req.ip,
        message: "Patient GDPR export generated.",
        patientId: patient.id,
        userAgent: req.get("user-agent"),
      },
    });
    res.json({ export: { auditLogs, cases, consents, patient, requests } });
  } catch (error) {
    next(error);
  }
});

complianceRouter.get("/retention-policies", requireRole("ADMIN"), async (_req, res, next) => {
  try {
    const policies = await prisma.securityPolicy.findMany({
      orderBy: { updatedAt: "desc" },
      where: { policyType: "DATA_RETENTION" },
    });
    res.json({ policies });
  } catch (error) {
    next(error);
  }
});
