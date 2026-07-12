import { Router } from "express";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { requireAuth, requireRole } from "../middleware/auth";
import { AppError } from "../middleware/error";
import { validateBody } from "../middleware/validate";
import { assertResourceAccess, canAccessPatient } from "../utils/resource-access";

export const visitsRouter = Router();

const createVisitSchema = z.object({
  patientId: z.string().min(1),
  organizationId: z.string().min(1).optional(),
  reason: z.string().max(2000).optional(),
  status: z.enum(["scheduled", "in_progress", "completed", "cancelled"]).optional(),
  startedAt: z.string().datetime().optional(),
});

const updateVisitSchema = z.object({
  reason: z.string().max(2000).optional(),
  status: z.enum(["scheduled", "in_progress", "completed", "cancelled"]).optional(),
  endedAt: z.string().datetime().optional().nullable(),
});

function toApiStatus(status: string) {
  return String(status).toLowerCase();
}

function fromApiStatus(status?: string) {
  if (!status) return undefined;
  return status.toUpperCase() as Prisma.EnumClinicalVisitStatusFilter["equals"];
}

function serializeVisit(visit: {
  id: string;
  visitNumber: string;
  patientId: string;
  organizationId: string | null;
  reason: string | null;
  status: string;
  startedAt: Date | null;
  endedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: visit.id,
    visitNumber: visit.visitNumber,
    patientId: visit.patientId,
    organizationId: visit.organizationId ?? undefined,
    reason: visit.reason ?? undefined,
    status: toApiStatus(visit.status),
    startedAt: visit.startedAt?.toISOString(),
    endedAt: visit.endedAt?.toISOString(),
    createdAt: visit.createdAt.toISOString(),
    updatedAt: visit.updatedAt.toISOString(),
  };
}

async function nextVisitNumber() {
  const count = await prisma.clinicalVisit.count();
  return `V-${String(count + 1).padStart(8, "0")}`;
}

visitsRouter.use(requireAuth);

visitsRouter.get("/", async (req, res, next) => {
  try {
    const patientId = typeof req.query.patientId === "string" ? req.query.patientId : undefined;
    if (!patientId) {
      throw new AppError(400, "patientId query parameter is required.", "PATIENT_ID_REQUIRED");
    }
    assertResourceAccess(await canAccessPatient(patientId, req.auth!), "You do not have access to this patient.");
    const visits = await prisma.clinicalVisit.findMany({
      where: { patientId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    res.json({ visits: visits.map(serializeVisit) });
  } catch (error) {
    next(error);
  }
});

visitsRouter.get("/:visitId", async (req, res, next) => {
  try {
    const visit = await prisma.clinicalVisit.findFirst({
      where: { id: String(req.params.visitId), deletedAt: null },
    });
    if (!visit) throw new AppError(404, "Visit not found.", "VISIT_NOT_FOUND");
    assertResourceAccess(await canAccessPatient(visit.patientId, req.auth!), "You do not have access to this visit.");
    res.json({ visit: serializeVisit(visit) });
  } catch (error) {
    next(error);
  }
});

visitsRouter.post(
  "/",
  requireRole("DOCTOR", "ADMIN", "SUPER_ADMIN"),
  validateBody(createVisitSchema),
  async (req, res, next) => {
    try {
      const body = req.body as z.infer<typeof createVisitSchema>;
      assertResourceAccess(await canAccessPatient(body.patientId, req.auth!), "You do not have access to this patient.");
      const patient = await prisma.patient.findUnique({ where: { id: body.patientId } });
      if (!patient || patient.deletedAt) {
        throw new AppError(404, "Patient not found.", "PATIENT_NOT_FOUND");
      }
      const visit = await prisma.clinicalVisit.create({
        data: {
          visitNumber: await nextVisitNumber(),
          patientId: body.patientId,
          organizationId: body.organizationId ?? patient.organizationId ?? undefined,
          reason: body.reason,
          status: (fromApiStatus(body.status) as never) ?? "IN_PROGRESS",
          startedAt: body.startedAt ? new Date(body.startedAt) : new Date(),
          createdById: req.auth!.id,
          updatedById: req.auth!.id,
        },
      });
      await prisma.auditLog.create({
        data: {
          action: "CLINICAL_VISIT_CREATED",
          actorId: req.auth!.id,
          patientId: body.patientId,
          message: `Clinical visit ${visit.visitNumber} created.`,
          metadata: { visitId: visit.id, reason: visit.reason },
        },
      });
      res.status(201).json({ visit: serializeVisit(visit) });
    } catch (error) {
      next(error);
    }
  },
);

visitsRouter.patch(
  "/:visitId",
  requireRole("DOCTOR", "ADMIN", "SUPER_ADMIN"),
  validateBody(updateVisitSchema),
  async (req, res, next) => {
    try {
      const existing = await prisma.clinicalVisit.findFirst({
        where: { id: String(req.params.visitId), deletedAt: null },
      });
      if (!existing) throw new AppError(404, "Visit not found.", "VISIT_NOT_FOUND");
      assertResourceAccess(await canAccessPatient(existing.patientId, req.auth!), "You do not have access to this visit.");
      const body = req.body as z.infer<typeof updateVisitSchema>;
      const visit = await prisma.clinicalVisit.update({
        where: { id: existing.id },
        data: {
          reason: body.reason,
          status: fromApiStatus(body.status) as never,
          endedAt: body.endedAt === null ? null : body.endedAt ? new Date(body.endedAt) : undefined,
          updatedById: req.auth!.id,
        },
      });
      res.json({ visit: serializeVisit(visit) });
    } catch (error) {
      next(error);
    }
  },
);

/** Nested under patients: GET/POST /patients/:patientId/visits */
export const patientVisitsRouter = Router({ mergeParams: true });
patientVisitsRouter.use(requireAuth);

patientVisitsRouter.get("/", async (req, res, next) => {
  try {
    const patientId = String(req.params.patientId);
    assertResourceAccess(await canAccessPatient(patientId, req.auth!), "You do not have access to this patient.");
    const visits = await prisma.clinicalVisit.findMany({
      where: { patientId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    res.json({ visits: visits.map(serializeVisit) });
  } catch (error) {
    next(error);
  }
});

patientVisitsRouter.post(
  "/",
  requireRole("DOCTOR", "ADMIN", "SUPER_ADMIN"),
  validateBody(createVisitSchema.omit({ patientId: true })),
  async (req, res, next) => {
    try {
      const patientId = String(req.params.patientId);
      assertResourceAccess(await canAccessPatient(patientId, req.auth!), "You do not have access to this patient.");
      const body = req.body as Omit<z.infer<typeof createVisitSchema>, "patientId">;
      const patient = await prisma.patient.findUnique({ where: { id: patientId } });
      if (!patient || patient.deletedAt) {
        throw new AppError(404, "Patient not found.", "PATIENT_NOT_FOUND");
      }
      const visit = await prisma.clinicalVisit.create({
        data: {
          visitNumber: await nextVisitNumber(),
          patientId,
          organizationId: body.organizationId ?? patient.organizationId ?? undefined,
          reason: body.reason,
          status: (fromApiStatus(body.status) as never) ?? "IN_PROGRESS",
          startedAt: body.startedAt ? new Date(body.startedAt) : new Date(),
          createdById: req.auth!.id,
          updatedById: req.auth!.id,
        },
      });
      res.status(201).json({ visit: serializeVisit(visit) });
    } catch (error) {
      next(error);
    }
  },
);
