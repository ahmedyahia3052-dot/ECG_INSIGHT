import type { Prisma } from "@prisma/client";
import { Router } from "express";
import { prisma } from "../config/prisma";
import { requireAuth, requireRole } from "../middleware/auth";
import { AppError } from "../middleware/error";
import { validateBody } from "../middleware/validate";
import { fromApiGender, fromApiSmokingStatus, serializePatient } from "../utils/clinical";
import { assertResourceAccess, canAccessPatient } from "../utils/resource-access";
import { patientBodySchema, patientListSchema, patientUpdateSchema } from "./schemas";

export const patientsRouter = Router();

patientsRouter.use(requireAuth);

patientsRouter.get("/", async (req, res, next) => {
  try {
    const query = patientListSchema.parse(req.query);
    const where: Prisma.PatientWhereInput = {};

    if (query.archived === "false") where.archivedAt = null;
    if (query.archived === "true") where.archivedAt = { not: null };
    if (query.gender) where.gender = fromApiGender(query.gender);
    if (query.organizationId) where.organizationId = query.organizationId;
    if (query.contractorId) where.contractorId = query.contractorId;
    if (query.employeeId) where.employeeId = { contains: query.employeeId, mode: "insensitive" };
    if (query.nationalId) where.nationalId = { contains: query.nationalId, mode: "insensitive" };
    if (query.diagnosis) {
      where.cases = { some: { finalDiagnosis: { contains: query.diagnosis, mode: "insensitive" } } };
    }
    if (query.dateFrom || query.dateTo) {
      where.cases = {
        some: {
          ...((where.cases as Prisma.ECGCaseListRelationFilter | undefined)?.some ?? {}),
          uploadDate: {
            ...(query.dateFrom ? { gte: query.dateFrom } : {}),
            ...(query.dateTo ? { lte: query.dateTo } : {}),
          },
        },
      };
    }
    if (query.q) {
      where.OR = [
        { employeeId: { contains: query.q, mode: "insensitive" } },
        { firstName: { contains: query.q, mode: "insensitive" } },
        { lastName: { contains: query.q, mode: "insensitive" } },
        { medicalRecordNumber: { contains: query.q, mode: "insensitive" } },
        { nationalId: { contains: query.q, mode: "insensitive" } },
        { email: { contains: query.q, mode: "insensitive" } },
        { organization: { name: { contains: query.q, mode: "insensitive" } } },
        { contractor: { name: { contains: query.q, mode: "insensitive" } } },
      ];
    }
    if (req.auth!.role !== "SUPER_ADMIN" && req.auth!.role !== "ADMIN") {
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
        {
          OR: [
            { auditLogs: { some: { action: "PATIENT_CREATED", actorId: req.auth!.id } } },
            { cases: { some: { OR: [{ assignedDoctorId: req.auth!.id }, { uploadedById: req.auth!.id }] } } },
            { reports: { some: { authorId: req.auth!.id } } },
            { tasks: { some: { OR: [{ createdById: req.auth!.id }, { assignments: { some: { userId: req.auth!.id } } }] } } },
          ],
        },
      ];
    }

    const [total, patients] = await Promise.all([
      prisma.patient.count({ where }),
      prisma.patient.findMany({
        orderBy: [{ archivedAt: "asc" }, { updatedAt: "desc" }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        where,
      }),
    ]);

    res.json({
      page: query.page,
      pageSize: query.pageSize,
      patients: patients.map(serializePatient),
      total,
      totalPages: Math.ceil(total / query.pageSize),
    });
  } catch (error) {
    next(error);
  }
});

patientsRouter.post("/", requireRole("DOCTOR"), validateBody(patientBodySchema), async (req, res, next) => {
  try {
    const patient = await prisma.patient.create({
      data: {
        ...req.body,
        gender: fromApiGender(req.body.gender),
        smokingStatus: req.body.smokingStatus ? fromApiSmokingStatus(req.body.smokingStatus) : undefined,
      },
    });
    await prisma.auditLog.create({
      data: {
        action: "PATIENT_CREATED",
        actorId: req.auth!.id,
        message: `Patient ${patient.firstName} ${patient.lastName} created.`,
        patientId: patient.id,
      },
    });
    res.status(201).json({ patient: serializePatient(patient) });
  } catch (error) {
    next(error);
  }
});

patientsRouter.get("/:patientId", async (req, res, next) => {
  try {
    const patient = await prisma.patient.findUnique({
      where: { id: String(req.params.patientId) },
    });
    if (!patient || patient.archivedAt) {
      throw new AppError(404, "Patient not found.", "PATIENT_NOT_FOUND");
    }
    assertResourceAccess(await canAccessPatient(patient.id, req.auth!));
    res.json({ patient: serializePatient(patient) });
  } catch (error) {
    next(error);
  }
});

patientsRouter.patch(
  "/:patientId",
  requireRole("DOCTOR"),
  validateBody(patientUpdateSchema),
  async (req, res, next) => {
    try {
      const data = {
        ...req.body,
        ...(req.body.gender ? { gender: fromApiGender(req.body.gender) } : {}),
        ...(req.body.smokingStatus ? { smokingStatus: fromApiSmokingStatus(req.body.smokingStatus) } : {}),
      };
      assertResourceAccess(await canAccessPatient(String(req.params.patientId), req.auth!));
      const patient = await prisma.patient.update({
        data,
        where: { id: String(req.params.patientId) },
      });
      await prisma.auditLog.create({
        data: {
          action: "PATIENT_UPDATED",
          actorId: req.auth!.id,
          message: `Patient ${patient.firstName} ${patient.lastName} updated.`,
          patientId: patient.id,
        },
      });
      res.json({ patient: serializePatient(patient) });
    } catch (error) {
      next(error);
    }
  },
);

patientsRouter.delete("/:patientId", requireRole("DOCTOR"), async (req, res, next) => {
  try {
    assertResourceAccess(await canAccessPatient(String(req.params.patientId), req.auth!));
    const patient = await prisma.patient.update({
      data: { archivedAt: new Date() },
      where: { id: String(req.params.patientId) },
    });
    await prisma.auditLog.create({
      data: {
        action: "PATIENT_ARCHIVED",
        actorId: req.auth!.id,
        message: `Patient ${patient.firstName} ${patient.lastName} archived.`,
        patientId: patient.id,
      },
    });
    res.json({ patient: serializePatient(patient) });
  } catch (error) {
    next(error);
  }
});
