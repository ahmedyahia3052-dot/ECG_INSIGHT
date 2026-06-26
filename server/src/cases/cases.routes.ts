import type { Prisma } from "@prisma/client";
import { Router } from "express";
import { prisma } from "../config/prisma";
import { requireAuth, requireRole } from "../middleware/auth";
import { AppError } from "../middleware/error";
import { emitRealtime } from "../realtime/realtime.service";
import { validateBody } from "../middleware/validate";
import {
  fromApiCaseStatus,
  fromApiPriority,
  serializeAuditLog,
  serializeCase,
} from "../utils/clinical";
import { createNotification } from "../utils/notifications";
import { assertResourceAccess, canAccessCase, canAccessPatient } from "../utils/resource-access";
import {
  assertCaseEditable,
  assertCaseStatusTransition,
  statusTimestampPatch,
} from "./state-machine";
import {
  assignDoctorSchema,
  caseCreateSchema,
  caseListSchema,
  caseUpdateSchema,
  rejectCaseSchema,
  reviewCaseSchema,
  updateStatusSchema,
} from "./schemas";

export const casesRouter = Router();

casesRouter.use(requireAuth);

const caseInclude = {
  analyses: { orderBy: { createdAt: "desc" }, take: 1 },
  assignedDoctor: { select: { email: true, id: true, name: true, role: true } },
  files: true,
  measurements: { orderBy: { createdAt: "desc" }, take: 1 },
  patient: true,
  reports: { orderBy: { createdAt: "desc" }, take: 3 },
  reviewedBy: { select: { email: true, id: true, name: true, role: true } },
  uploadedBy: { select: { email: true, id: true, name: true, role: true } },
} satisfies Prisma.ECGCaseInclude;

function nextCaseId() {
  return `ECG-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Date.now()
    .toString()
    .slice(-6)}`;
}

async function nextCaseNumber() {
  const total = await prisma.eCGCase.count();
  return `ECGCASE-${String(total + 1).padStart(6, "0")}`;
}

function severityFromApi(severity?: "abnormal" | "critical" | "normal") {
  if (severity === "critical") return "CRITICAL" as const;
  if (severity === "abnormal") return "ABNORMAL" as const;
  return "NORMAL" as const;
}

async function findCaseForRoute(caseId: string) {
  return prisma.eCGCase.findFirst({
    include: caseInclude,
    where: { OR: [{ id: caseId }, { caseId }, { caseNumber: caseId }] },
  });
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

async function collaborationActivity(input: {
  actorId: string;
  caseId: string;
  message?: string;
  metadata?: Prisma.InputJsonValue;
  title: string;
  type: Prisma.CaseActivityCreateInput["type"];
}) {
  try {
    const activity = await prisma.caseActivity.create({
      data: {
        actorId: input.actorId,
        caseId: input.caseId,
        message: input.message,
        metadata: input.metadata,
        title: input.title,
        type: input.type,
      },
    });
    emitRealtime("case.activity.created", activity, [`case:${input.caseId}`]);
  } catch {
    // Existing case workflows must keep running on test/staging databases before the Sprint 33 migration is applied.
  }
}

casesRouter.get("/", async (req, res, next) => {
  try {
    const query = caseListSchema.parse(req.query);
    const where: Prisma.ECGCaseWhereInput = {};
    if (query.patientId) where.patientId = query.patientId;
    if (query.assignedDoctorId) where.assignedDoctorId = query.assignedDoctorId;
    if (query.status) where.status = fromApiCaseStatus(query.status);
    if (query.priority) where.priority = fromApiPriority(query.priority);
    if (query.severity) where.severity = severityFromApi(query.severity);
    if (query.q) {
      where.OR = [
        { caseId: { contains: query.q, mode: "insensitive" } },
        { caseNumber: { contains: query.q, mode: "insensitive" } },
        { aiDiagnosis: { contains: query.q, mode: "insensitive" } },
        { doctorDiagnosis: { contains: query.q, mode: "insensitive" } },
        { finalDiagnosis: { contains: query.q, mode: "insensitive" } },
        { patient: { firstName: { contains: query.q, mode: "insensitive" } } },
        { patient: { lastName: { contains: query.q, mode: "insensitive" } } },
        { patient: { medicalRecordNumber: { contains: query.q, mode: "insensitive" } } },
      ];
    }
    if (req.auth!.role !== "SUPER_ADMIN" && req.auth!.role !== "ADMIN") {
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
        {
          OR: [
            { assignedDoctorId: req.auth!.id },
            { uploadedById: req.auth!.id },
            { reports: { some: { authorId: req.auth!.id } } },
          ],
        },
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
    assertResourceAccess(await canAccessPatient(patient.id, req.auth!));

    const ecgCase = await prisma.eCGCase.create({
      data: {
        assignedDoctorId: req.body.assignedDoctorId,
        acquisitionDate: req.body.acquisitionDate,
        aiDiagnosis: req.body.diagnosis,
        aiModelVersion: req.body.aiModelVersion,
        caseId: nextCaseId(),
        caseNumber: await nextCaseNumber(),
        clinicalComments: req.body.interpretation,
        clinicalNotes: req.body.clinicalNotes ?? req.body.interpretation,
        confidenceScore: req.body.confidenceScore ?? req.body.confidence,
        doctorDiagnosis: req.body.doctorDiagnosis,
        ecgType: req.body.ecgType,
        explainabilityData: req.body.explainabilityData as Prisma.InputJsonValue | undefined,
        finalDiagnosis: req.body.finalDiagnosis ?? req.body.diagnosis,
        heartRate: req.body.heartRate,
        imagePath: req.body.ecgImage,
        patientId: req.body.patientId,
        prInterval: req.body.prInterval,
        priority: fromApiPriority(req.body.priority),
        qrsDuration: req.body.qrsDuration,
        qtInterval: req.body.qtInterval,
        qtcInterval: req.body.qtcInterval,
        recommendations: req.body.recommendations,
        rhythm: req.body.rhythm,
        severity: severityFromApi(req.body.severity),
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
    await collaborationActivity({
      actorId: req.auth!.id,
      caseId: ecgCase.id,
      title: "ECG uploaded",
      type: "ECG_UPLOADED",
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
    }) ?? await findCaseForRoute(String(req.params.caseId));
    if (!ecgCase) {
      throw new AppError(404, "ECG case not found.", "CASE_NOT_FOUND");
    }
    assertResourceAccess(await canAccessCase(ecgCase.id, req.auth!));
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
    assertResourceAccess(await canAccessCase(previous.id, req.auth!));
    assertCaseEditable(previous);
    const nextStatus = req.body.status ? fromApiCaseStatus(req.body.status) : undefined;
    if (nextStatus) assertCaseStatusTransition(previous.status, nextStatus);

    const ecgCase = await prisma.eCGCase.update({
      data: {
        acquisitionDate: req.body.acquisitionDate,
        assignedDoctorId: req.body.assignedDoctorId,
        aiDiagnosis: req.body.diagnosis ?? undefined,
        aiModelVersion: req.body.aiModelVersion,
        clinicalComments: req.body.clinicalComments ?? req.body.interpretation,
        clinicalNotes: req.body.clinicalNotes ?? req.body.interpretation,
        confidenceScore: req.body.confidenceScore ?? req.body.confidence,
        doctorDiagnosis: req.body.doctorDiagnosis,
        ecgType: req.body.ecgType,
        explainabilityData: req.body.explainabilityData as Prisma.InputJsonValue | undefined,
        finalDiagnosis: req.body.finalDiagnosis ?? req.body.diagnosis,
        heartRate: req.body.heartRate,
        imagePath: req.body.ecgImage,
        prInterval: req.body.prInterval,
        priority: req.body.priority ? fromApiPriority(req.body.priority) : undefined,
        qrsDuration: req.body.qrsDuration,
        qtInterval: req.body.qtInterval,
        qtcInterval: req.body.qtcInterval,
        recommendations: req.body.recommendations,
        rhythm: req.body.rhythm,
        severity: req.body.severity ? severityFromApi(req.body.severity) : undefined,
        status: nextStatus,
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
      const current = await prisma.eCGCase.findUnique({ where: { id: String(req.params.caseId) } });
      if (!current) throw new AppError(404, "ECG case not found.", "CASE_NOT_FOUND");
      assertResourceAccess(await canAccessCase(current.id, req.auth!));
      assertCaseEditable(current);
      const ecgCase = await prisma.eCGCase.update({
        data: { assignedDoctorId: req.body.assignedDoctorId },
        include: caseInclude,
        where: { id: current.id },
      });
      await audit({
        action: "CASE_ASSIGNED",
        actorId: req.auth!.id,
        caseId: ecgCase.id,
        message: `ECG case ${ecgCase.caseId} assigned.`,
        patientId: ecgCase.patientId,
      });
      await collaborationActivity({
        actorId: req.auth!.id,
        caseId: ecgCase.id,
        metadata: { assignedDoctorId: req.body.assignedDoctorId },
        title: "Case reassigned",
        type: "CASE_REASSIGNED",
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
      let current = await prisma.eCGCase.findUnique({ where: { id: String(req.params.caseId) } });
      if (!current) throw new AppError(404, "ECG case not found.", "CASE_NOT_FOUND");
      assertResourceAccess(await canAccessCase(current.id, req.auth!));
      const nextStatus = fromApiCaseStatus(req.body.status);
      if (current.status === "AI_COMPLETED" && (nextStatus === "APPROVED" || nextStatus === "REJECTED")) {
        const reviewed = await prisma.eCGCase.update({
          data: {
            ...statusTimestampPatch("UNDER_REVIEW", req.auth!.id),
            status: "UNDER_REVIEW",
          },
          where: { id: current.id },
        });
        await audit({
          action: "CASE_STATUS_CHANGED",
          actorId: req.auth!.id,
          caseId: reviewed.id,
          message: `ECG case ${reviewed.caseNumber ?? reviewed.caseId} status changed to UNDER_REVIEW.`,
          metadata: { previousStatus: current.status, status: reviewed.status },
          patientId: reviewed.patientId,
        });
        await collaborationActivity({
          actorId: req.auth!.id,
          caseId: reviewed.id,
          metadata: { previousStatus: current.status, status: reviewed.status },
          title: "Case status changed",
          type: "STATUS_CHANGED",
        });
        current = reviewed;
      }
      assertCaseStatusTransition(current.status, nextStatus);
      const ecgCase = await prisma.eCGCase.update({
        data: {
          ...statusTimestampPatch(nextStatus, req.auth!.id),
          status: nextStatus,
        },
        include: caseInclude,
        where: { id: current.id },
      });
      await audit({
        action: "CASE_STATUS_CHANGED",
        actorId: req.auth!.id,
        caseId: ecgCase.id,
        message: `ECG case ${ecgCase.caseId} status changed to ${ecgCase.status}.`,
        patientId: ecgCase.patientId,
      });
      await collaborationActivity({
        actorId: req.auth!.id,
        caseId: ecgCase.id,
        metadata: { status: ecgCase.status },
        title: ecgCase.status === "APPROVED" ? "Final approval recorded" : "Case status changed",
        type: ecgCase.status === "APPROVED" ? "FINAL_APPROVAL" : "STATUS_CHANGED",
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

casesRouter.post("/:caseId/revisions", requireRole("DOCTOR"), async (req, res, next) => {
  try {
    const source = await findCaseForRoute(String(req.params.caseId));
    if (!source) throw new AppError(404, "ECG case not found.", "CASE_NOT_FOUND");
    assertResourceAccess(await canAccessCase(source.id, req.auth!));
    const revision = await prisma.eCGCase.create({
      data: {
        acquisitionDate: new Date(),
        assignedDoctorId: source.assignedDoctorId,
        caseId: nextCaseId(),
        caseNumber: await nextCaseNumber(),
        clinicalNotes: `Revision created from ${source.caseNumber ?? source.caseId}.`,
        ecgType: source.ecgType,
        patientId: source.patientId,
        priority: source.priority,
        severity: "NORMAL",
        status: "UPLOADED",
        uploadedById: req.auth!.id,
      },
      include: caseInclude,
    });
    await audit({
      action: "CASE_CREATED",
      actorId: req.auth!.id,
      caseId: revision.id,
      message: `New ECG revision ${revision.caseNumber ?? revision.caseId} created from ${source.caseNumber ?? source.caseId}.`,
      metadata: { revisionOf: source.id, sourceStatus: source.status },
      patientId: revision.patientId,
    });
    res.status(201).json({ case: serializeCase(revision) });
  } catch (error) {
    next(error);
  }
});

casesRouter.post("/:caseId/review", requireRole("DOCTOR"), validateBody(reviewCaseSchema), async (req, res, next) => {
  try {
    const current = await findCaseForRoute(String(req.params.caseId));
    if (!current) throw new AppError(404, "ECG case not found.", "CASE_NOT_FOUND");
    assertResourceAccess(await canAccessCase(current.id, req.auth!));
    assertCaseStatusTransition(current.status, "UNDER_REVIEW");
    const ecgCase = await prisma.eCGCase.update({
      data: {
        clinicalComments: req.body.clinicalComments,
        clinicalNotes: req.body.clinicalComments,
        doctorDiagnosis: req.body.doctorDiagnosis,
        finalDiagnosis: req.body.doctorDiagnosis,
        recommendations: req.body.recommendations,
        reviewedAt: new Date(),
        reviewedById: req.auth!.id,
        severity: req.body.severity ? severityFromApi(req.body.severity) : undefined,
        status: "UNDER_REVIEW",
      },
      include: caseInclude,
      where: { id: current.id },
    });
    await audit({
      action: "CASE_STATUS_CHANGED",
      actorId: req.auth!.id,
      caseId: ecgCase.id,
      message: `ECG case ${ecgCase.caseNumber ?? ecgCase.caseId} moved to under review.`,
      metadata: { previousStatus: current.status, status: ecgCase.status },
      patientId: ecgCase.patientId,
    });
    await prisma.timelineEvent.create({
      data: {
        caseId: ecgCase.id,
        metadata: { diagnosis: ecgCase.doctorDiagnosis, severity: ecgCase.severity },
        patientId: ecgCase.patientId,
        title: "Doctor review completed",
        type: "CLINICAL_NOTE_ADDED",
      },
    });
    await collaborationActivity({
      actorId: req.auth!.id,
      caseId: ecgCase.id,
      metadata: { diagnosis: ecgCase.doctorDiagnosis, severity: ecgCase.severity },
      title: "Clinical note added",
      type: "NOTE_ADDED",
    });
    res.json({ case: serializeCase(ecgCase) });
  } catch (error) {
    next(error);
  }
});

casesRouter.post("/:caseId/approve", requireRole("DOCTOR"), async (req, res, next) => {
  try {
    const current = await findCaseForRoute(String(req.params.caseId));
    if (!current) throw new AppError(404, "ECG case not found.", "CASE_NOT_FOUND");
    assertResourceAccess(await canAccessCase(current.id, req.auth!));
    assertCaseStatusTransition(current.status, "APPROVED");
    const ecgCase = await prisma.eCGCase.update({
      data: {
        ...statusTimestampPatch("APPROVED", req.auth!.id),
        status: "APPROVED",
      },
      include: caseInclude,
      where: { id: current.id },
    });
    await audit({
      action: "CASE_STATUS_CHANGED",
      actorId: req.auth!.id,
      caseId: ecgCase.id,
      message: `ECG case ${ecgCase.caseNumber ?? ecgCase.caseId} approved.`,
      metadata: { status: ecgCase.status },
      patientId: ecgCase.patientId,
    });
    await collaborationActivity({
      actorId: req.auth!.id,
      caseId: ecgCase.id,
      metadata: { status: ecgCase.status },
      title: "Final approval recorded",
      type: "FINAL_APPROVAL",
    });
    res.json({ case: serializeCase(ecgCase) });
  } catch (error) {
    next(error);
  }
});

casesRouter.post("/:caseId/reject", requireRole("DOCTOR"), validateBody(rejectCaseSchema), async (req, res, next) => {
  try {
    const current = await findCaseForRoute(String(req.params.caseId));
    if (!current) throw new AppError(404, "ECG case not found.", "CASE_NOT_FOUND");
    assertResourceAccess(await canAccessCase(current.id, req.auth!));
    assertCaseStatusTransition(current.status, "REJECTED");
    const comments = req.body.clinicalComments ?? req.body.reason ?? current.clinicalComments;
    const ecgCase = await prisma.eCGCase.update({
      data: {
        clinicalComments: comments,
        ...statusTimestampPatch("REJECTED", req.auth!.id),
        status: "REJECTED",
      },
      include: caseInclude,
      where: { id: current.id },
    });
    await audit({
      action: "CASE_STATUS_CHANGED",
      actorId: req.auth!.id,
      caseId: ecgCase.id,
      message: `ECG case ${ecgCase.caseNumber ?? ecgCase.caseId} rejected.`,
      metadata: { reason: comments, status: ecgCase.status },
      patientId: ecgCase.patientId,
    });
    res.json({ case: serializeCase(ecgCase) });
  } catch (error) {
    next(error);
  }
});

casesRouter.delete("/:caseId", requireRole("DOCTOR"), async (req, res, next) => {
  try {
    const ecgCase = await prisma.eCGCase.findUnique({ where: { id: String(req.params.caseId) } });
    if (!ecgCase) throw new AppError(404, "ECG case not found.", "CASE_NOT_FOUND");
    assertResourceAccess(await canAccessCase(ecgCase.id, req.auth!));
    assertCaseEditable(ecgCase);
    await prisma.eCGCase.delete({ where: { id: ecgCase.id } });
    await audit({
      action: "CASE_DELETED",
      actorId: req.auth!.id,
      caseId: undefined,
      message: `ECG case ${ecgCase.caseId} deleted.`,
      metadata: { deletedCaseId: ecgCase.id, publicCaseId: ecgCase.caseId },
      patientId: ecgCase.patientId,
    });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

casesRouter.get("/:caseId/timeline", async (req, res, next) => {
  try {
    assertResourceAccess(await canAccessCase(String(req.params.caseId), req.auth!));
    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: "asc" },
      where: { caseId: String(req.params.caseId) },
    });
    res.json({ timeline: logs.map(serializeAuditLog) });
  } catch (error) {
    next(error);
  }
});
