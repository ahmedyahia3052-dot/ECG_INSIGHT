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

function fullNameFor(input: { firstName?: string; lastName?: string; middleName?: string }) {
  return [input.firstName, input.middleName, input.lastName].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
}

async function nextPatientCode() {
  const total = await prisma.patient.count();
  return `ECG-${String(total + 1).padStart(6, "0")}`;
}

function patientData(body: Record<string, unknown>, actorId: string, create = false): Prisma.PatientUncheckedCreateInput | Prisma.PatientUncheckedUpdateInput {
  const firstName = typeof body["firstName"] === "string" ? body["firstName"] : undefined;
  const middleName = typeof body["middleName"] === "string" ? body["middleName"] : undefined;
  const lastName = typeof body["lastName"] === "string" ? body["lastName"] : undefined;
  const heightCm = typeof body["heightCm"] === "number" ? body["heightCm"] : undefined;
  const weightKg = typeof body["weightKg"] === "number" ? body["weightKg"] : undefined;
  const bmi = typeof body["bmi"] === "number" ? body["bmi"] : heightCm && weightKg ? Number((weightKg / ((heightCm / 100) ** 2)).toFixed(1)) : undefined;
  const data = {
    ...body,
    ...(body["gender"] ? { gender: fromApiGender(body["gender"] as never) } : {}),
    ...(body["smokingStatus"] ? { smokingStatus: fromApiSmokingStatus(body["smokingStatus"] as never) } : {}),
    ...(body["status"] ? { status: String(body["status"]).toUpperCase() } : {}),
    bmi,
    fullName: typeof body["fullName"] === "string" && body["fullName"].trim() ? body["fullName"] : fullNameFor({ firstName, lastName, middleName }),
    knownAllergies: body["knownAllergies"] ?? body["allergies"],
    updatedById: actorId,
    ...(create ? { createdById: actorId } : {}),
  };
  return data as Prisma.PatientUncheckedCreateInput | Prisma.PatientUncheckedUpdateInput;
}

function csvEscape(value: unknown) {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function patientCsv(patients: ReturnType<typeof serializePatient>[]) {
  const columns = ["Patient ID", "Employee ID", "Full Name", "Age", "Gender", "Company", "Department", "Phone", "Status"];
  const rows = patients.map((patient) => [
    patient.patientCode,
    patient.employeeId,
    patient.fullName,
    patient.age,
    patient.gender,
    patient.company,
    patient.department,
    patient.phone,
    patient.status,
  ]);
  return [columns, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");
}

patientsRouter.get("/", async (req, res, next) => {
  try {
    const query = patientListSchema.parse(req.query);
    const where: Prisma.PatientWhereInput = {};

    if (query.archived === "false") where.archivedAt = null;
    if (query.archived === "true") where.archivedAt = { not: null };
    if (query.gender) where.gender = fromApiGender(query.gender);
    if (query.organizationId) where.organizationId = query.organizationId;
    if (query.status) where.status = query.status.toUpperCase() as never;
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
        orderBy: query.sortBy === "fullName"
          ? [{ archivedAt: "asc" }, { fullName: query.sortDir }]
          : query.sortBy === "employeeId"
          ? [{ archivedAt: "asc" }, { employeeId: query.sortDir }]
          : query.sortBy === "patientCode"
          ? [{ archivedAt: "asc" }, { patientCode: query.sortDir }]
          : query.sortBy === "status"
          ? [{ archivedAt: "asc" }, { status: query.sortDir }]
          : [{ archivedAt: "asc" }, { updatedAt: "desc" }],
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

patientsRouter.get("/export/:format", requireRole("ADMIN"), async (req, res, next) => {
  try {
    const format = String(req.params.format);
    if (format !== "csv" && format !== "excel") throw new AppError(400, "Unsupported export format.", "INVALID_EXPORT_FORMAT");
    const patients = await prisma.patient.findMany({ orderBy: { updatedAt: "desc" }, take: 5_000, where: { archivedAt: null } });
    const csv = patientCsv(patients.map(serializePatient));
    res.setHeader("content-type", format === "excel" ? "application/vnd.ms-excel" : "text/csv");
    res.setHeader("content-disposition", `attachment; filename="patients.${format === "excel" ? "xls" : "csv"}"`);
    res.send(csv);
  } catch (error) {
    next(error);
  }
});

patientsRouter.post("/", requireRole("DOCTOR"), validateBody(patientBodySchema), async (req, res, next) => {
  try {
    const patient = await prisma.patient.create({
      data: {
        ...(patientData(req.body, req.auth!.id, true) as Prisma.PatientUncheckedCreateInput),
        patientCode: await nextPatientCode(),
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
      include: {
        cases: { include: { analyses: { orderBy: { createdAt: "desc" }, take: 1 } }, orderBy: { uploadDate: "desc" }, take: 25 },
        documents: { orderBy: { createdAt: "desc" }, take: 25 },
        reports: { orderBy: { updatedAt: "desc" }, take: 25 },
        timelineEvents: { orderBy: { createdAt: "desc" }, take: 50 },
      },
      where: { id: String(req.params.patientId) },
    });
    if (!patient || patient.archivedAt) {
      throw new AppError(404, "Patient not found.", "PATIENT_NOT_FOUND");
    }
    assertResourceAccess(await canAccessPatient(patient.id, req.auth!));
    res.json({
      patient: serializePatient(patient),
      related: {
        cases: patient.cases.map((item) => ({
          aiDiagnosis: item.analyses[0]?.diagnosis,
          aiSeverity: item.analyses[0]?.severity?.toLowerCase(),
          caseId: item.caseId,
          finalDiagnosis: item.finalDiagnosis,
          id: item.id,
          priority: item.priority.toLowerCase(),
          status: item.status.toLowerCase(),
          uploadDate: item.uploadDate.toISOString(),
        })),
        documents: patient.documents.map((item) => ({
          category: item.category.toLowerCase(),
          createdAt: item.createdAt.toISOString(),
          downloadUrl: `/api/documents/${item.storedName}`,
          id: item.id,
          mimeType: item.mimeType,
          originalName: item.originalName,
          sizeBytes: item.sizeBytes,
          title: item.title,
          uploadedById: item.uploadedById,
        })),
        reports: patient.reports.map((item) => ({
          id: item.id,
          reportNumber: item.reportNumber,
          reportingDate: item.reportingDate.toISOString(),
          status: item.status.toLowerCase(),
        })),
        timeline: patient.timelineEvents.map((item) => ({
          createdAt: item.createdAt.toISOString(),
          id: item.id,
          metadata: item.metadata,
          notes: item.notes,
          title: item.title,
          type: item.type,
        })),
      },
    });
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
      assertResourceAccess(await canAccessPatient(String(req.params.patientId), req.auth!));
      const patient = await prisma.patient.update({
        data: patientData(req.body, req.auth!.id),
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
