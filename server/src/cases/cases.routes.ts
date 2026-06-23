import type { Prisma } from "@prisma/client";
import { Router } from "express";
import { prisma } from "../config/prisma";
import { requireAuth, requireRole } from "../middleware/auth";
import { AppError } from "../middleware/error";
import { validateBody } from "../middleware/validate";
import {
  fromApiCaseStatus,
  fromApiPriority,
  serializeAuditLog,
  serializeCase,
} from "../utils/clinical";
import { createNotification } from "../utils/notifications";
import {
  assignDoctorSchema,
  caseCreateSchema,
  caseListSchema,
  caseUpdateSchema,
  updateStatusSchema,
} from "./schemas";

export const casesRouter = Router();

casesRouter.use(requireAuth);

const caseInclude = {
  assignedDoctor: { select: { email: true, id: true, name: true, role: true } },
  files: true,
  patient: true,
  uploadedBy: { select: { email: true, id: true, name: true, role: true } },
} satisfies Prisma.ECGCaseInclude;

function nextCaseId() {
  return `ECG-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Date.now()
    .toString()
    .slice(-6)}`;
}

async function audit(input: {
  action: Prisma.AuditLogCreateInput["action"];
  actorId: string;
  caseId?: string;
  message: string;
  metadata?: Prisma.InputJsonValue;
  patientId?: string;
}) {
  await prisma.auditLog.create({
    data: {
      action: input.action,
      actor: { connect: { id: input.actorId } },
      case: input.caseId ? { connect: { id: input.caseId } } : undefined,
      message: input.message,
      metadata: input.metadata,
      patient: input.patientId ? { connect: { id: input.patientId } } : undefined,
    },
  });
}

casesRouter.get("/", async (req, res, next) => {
  try {
    const query = caseListSchema.parse(req.query);
    const where: Prisma.ECGCaseWhereInput = {};
    if (query.patientId) where.patientId = query.patientId;
    if (query.assignedDoctorId) where.assignedDoctorId = query.assignedDoctorId;
    if (query.status) where.status = fromApiCaseStatus(query.status);
    if (query.priority) where.priority = fromApiPriority(query.priority);
    if (query.q) {
      where.OR = [
        { caseId: { contains: query.q, mode: "insensitive" } },
        { finalDiagnosis: { contains: query.q, mode: "insensitive" } },
        { patient: { firstName: { contains: query.q, mode: "insensitive" } } },
        { patient: { lastName: { contains: query.q, mode: "insensitive" } } },
        { patient: { medicalRecordNumber: { contains: query.q, mode: "insensitive" } } },
      ];
    }

    const [total, cases] = await Promise.all([
      prisma.eCGCase.count({ where }),
      prisma.eCGCase.findMany({
        include: caseInclude,
        orderBy: [{ priority: "desc" }, { updatedAt: "desc" }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        where,
      }),
    ]);

    res.json({
      cases: cases.map(serializeCase),
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.ceil(total / query.pageSize),
    });
  } catch (error) {
    next(error);
  }
});

casesRouter.post("/", requireRole("DOCTOR"), validateBody(caseCreateSchema), async (req, res, next) => {
  try {
    const patient = await prisma.patient.findUnique({ where: { id: req.body.patientId } });
    if (!patient || patient.archivedAt) {
      throw new AppError(404, "Patient not found.", "PATIENT_NOT_FOUND");
    }

    const ecgCase = await prisma.eCGCase.create({
      data: {
        assignedDoctorId: req.body.assignedDoctorId,
        caseId: nextCaseId(),
        clinicalNotes: req.body.clinicalNotes,
        ecgType: req.body.ecgType,
        finalDiagnosis: req.body.finalDiagnosis,
        patientId: req.body.patientId,
        priority: fromApiPriority(req.body.priority),
        status: fromApiCaseStatus(req.body.status),
        uploadedById: req.auth!.id,
      },
      include: caseInclude,
    });

    await audit({
      action: "CASE_CREATED",
      actorId: req.auth!.id,
      caseId: ecgCase.id,
      message: `ECG case ${ecgCase.caseId} created.`,
      patientId: ecgCase.patientId,
    });

    if (ecgCase.assignedDoctorId) {
      await createNotification({
        caseId: ecgCase.id,
        message: `You have been assigned ECG case ${ecgCase.caseId}.`,
        title: "New ECG Case Assigned",
        type: "INFO",
        userId: ecgCase.assignedDoctorId,
      });
    }
    if (ecgCase.priority === "CRITICAL") {
      await createNotification({
        caseId: ecgCase.id,
        message: `Critical ECG case ${ecgCase.caseId} requires immediate review.`,
        targetRole: "DOCTOR",
        title: "Critical ECG Alert",
        type: "CRITICAL",
      });
    }

    res.status(201).json({ case: serializeCase(ecgCase) });
  } catch (error) {
    next(error);
  }
});

casesRouter.get("/:caseId", async (req, res, next) => {
  try {
    const ecgCase = await prisma.eCGCase.findUnique({
      include: caseInclude,
      where: { id: String(req.params.caseId) },
    });
    if (!ecgCase) {
      throw new AppError(404, "ECG case not found.", "CASE_NOT_FOUND");
    }
    res.json({ case: serializeCase(ecgCase) });
  } catch (error) {
    next(error);
  }
});

casesRouter.patch("/:caseId", requireRole("DOCTOR"), validateBody(caseUpdateSchema), async (req, res, next) => {
  try {
    const caseId = String(req.params.caseId);
    const previous = await prisma.eCGCase.findUnique({ where: { id: caseId } });
    if (!previous) throw new AppError(404, "ECG case not found.", "CASE_NOT_FOUND");

    const ecgCase = await prisma.eCGCase.update({
      data: {
        assignedDoctorId: req.body.assignedDoctorId,
        clinicalNotes: req.body.clinicalNotes,
        ecgType: req.body.ecgType,
        finalDiagnosis: req.body.finalDiagnosis,
        priority: req.body.priority ? fromApiPriority(req.body.priority) : undefined,
        status: req.body.status ? fromApiCaseStatus(req.body.status) : undefined,
      },
      include: caseInclude,
      where: { id: caseId },
    });

    await audit({
      action: previous.finalDiagnosis !== ecgCase.finalDiagnosis ? "DIAGNOSIS_CHANGED" : "CASE_UPDATED",
      actorId: req.auth!.id,
      caseId: ecgCase.id,
      message: `ECG case ${ecgCase.caseId} updated.`,
      metadata: { previousStatus: previous.status, status: ecgCase.status },
      patientId: ecgCase.patientId,
    });

    res.json({ case: serializeCase(ecgCase) });
  } catch (error) {
    next(error);
  }
});

casesRouter.post(
  "/:caseId/assign",
  requireRole("DOCTOR"),
  validateBody(assignDoctorSchema),
  async (req, res, next) => {
    try {
      const ecgCase = await prisma.eCGCase.update({
        data: { assignedDoctorId: req.body.assignedDoctorId },
        include: caseInclude,
        where: { id: String(req.params.caseId) },
      });
      await audit({
        action: "CASE_ASSIGNED",
        actorId: req.auth!.id,
        caseId: ecgCase.id,
        message: `ECG case ${ecgCase.caseId} assigned.`,
        patientId: ecgCase.patientId,
      });
      await createNotification({
        caseId: ecgCase.id,
        message: `You have been assigned ECG case ${ecgCase.caseId}.`,
        title: "ECG Case Assigned",
        type: "INFO",
        userId: req.body.assignedDoctorId,
      });
      res.json({ case: serializeCase(ecgCase) });
    } catch (error) {
      next(error);
    }
  },
);

casesRouter.post(
  "/:caseId/status",
  requireRole("DOCTOR"),
  validateBody(updateStatusSchema),
  async (req, res, next) => {
    try {
      const ecgCase = await prisma.eCGCase.update({
        data: { status: fromApiCaseStatus(req.body.status) },
        include: caseInclude,
        where: { id: String(req.params.caseId) },
      });
      await audit({
        action: "CASE_STATUS_CHANGED",
        actorId: req.auth!.id,
        caseId: ecgCase.id,
        message: `ECG case ${ecgCase.caseId} status changed to ${ecgCase.status}.`,
        patientId: ecgCase.patientId,
      });
      if (ecgCase.status === "REVIEWED" || ecgCase.status === "FINALIZED") {
        await createNotification({
          caseId: ecgCase.id,
          message: `Review completed for ECG case ${ecgCase.caseId}.`,
          title: "ECG Review Completed",
          type: "SUCCESS",
          userId: ecgCase.uploadedById,
        });
      }
      res.json({ case: serializeCase(ecgCase) });
    } catch (error) {
      next(error);
    }
  },
);

casesRouter.get("/:caseId/timeline", async (req, res, next) => {
  try {
    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: "asc" },
      where: { caseId: String(req.params.caseId) },
    });
    res.json({ timeline: logs.map(serializeAuditLog) });
  } catch (error) {
    next(error);
  }
});
