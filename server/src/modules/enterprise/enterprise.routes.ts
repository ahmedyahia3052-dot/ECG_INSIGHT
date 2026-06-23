import type { Prisma, TimelineEvent } from "@prisma/client";
import { Router } from "express";
import { prisma } from "../../config/prisma";
import { requireAuth, requireRole } from "../../middleware/auth";
import { AppError } from "../../middleware/error";
import { validateBody } from "../../middleware/validate";
import { serializePatient } from "../../utils/clinical";
import {
  cardiacHistorySchema,
  childUnitSchema,
  clinicalNoteSchema,
  enterpriseSearchSchema,
  fitnessDecisionSchema,
  organizationSchema,
  organizationUpdateSchema,
  procedureHistorySchema,
} from "./enterprise.schemas";

export const enterpriseRouter = Router();

enterpriseRouter.use(requireAuth);

const procedureTypeMap = {
  ablation: "ABLATION",
  cabg: "CABG",
  coronary_angiography: "CORONARY_ANGIOGRAPHY",
  icd: "ICD",
  open_heart_surgery: "OPEN_HEART_SURGERY",
  pacemaker: "PACEMAKER",
  pci_stents: "PCI_STENTS",
  valve_surgery: "VALVE_SURGERY",
} as const;
type ProcedureTypeInput = keyof typeof procedureTypeMap;

const fitnessDecisionMap = {
  fit: "FIT",
  fit_with_restrictions: "FIT_WITH_RESTRICTIONS",
  permanently_unfit: "PERMANENTLY_UNFIT",
  refer_to_cardiologist: "REFER_TO_CARDIOLOGIST",
  temporarily_unfit: "TEMPORARILY_UNFIT",
} as const;
type FitnessDecisionInput = keyof typeof fitnessDecisionMap;

function organizationType(value: string) {
  return value.toUpperCase() as Prisma.OrganizationCreateInput["type"];
}

function organizationStatus(value: string) {
  return value.toUpperCase() as Prisma.OrganizationCreateInput["status"];
}

function serializeOrganization(organization: Prisma.OrganizationGetPayload<{ include: { contractors: true; departments: true } }>) {
  return {
    address: organization.address ?? undefined,
    contractors: organization.contractors.map((contractor) => ({
      id: contractor.id,
      name: contractor.name,
      organizationId: contractor.organizationId,
    })),
    createdAt: organization.createdAt.toISOString(),
    departments: organization.departments.map((department) => ({
      id: department.id,
      name: department.name,
      organizationId: department.organizationId,
    })),
    email: organization.email ?? undefined,
    id: organization.id,
    logo: organization.logo ?? undefined,
    name: organization.name,
    phone: organization.phone ?? undefined,
    status: organization.status.toLowerCase(),
    type: organization.type.toLowerCase(),
  };
}

function serializeTimeline(event: TimelineEvent) {
  return {
    caseId: event.caseId ?? undefined,
    createdAt: event.createdAt.toISOString(),
    id: event.id,
    metadata: event.metadata,
    notes: event.notes ?? undefined,
    patientId: event.patientId,
    title: event.title,
    type: event.type.toLowerCase(),
  };
}

function patientWhereFromSearch(query: ReturnType<typeof enterpriseSearchSchema.parse>): Prisma.PatientWhereInput {
  const where: Prisma.PatientWhereInput = { archivedAt: null };
  if (query.organizationId) where.organizationId = query.organizationId;
  if (query.contractorId) where.contractorId = query.contractorId;
  if (query.employeeId) where.employeeId = { contains: query.employeeId, mode: "insensitive" };
  if (query.nationalId) where.nationalId = { contains: query.nationalId, mode: "insensitive" };
  if (query.diagnosis || query.dateFrom || query.dateTo) {
    where.cases = {
      some: {
        ...(query.diagnosis ? { finalDiagnosis: { contains: query.diagnosis, mode: "insensitive" } } : {}),
        ...(query.dateFrom || query.dateTo
          ? { uploadDate: { ...(query.dateFrom ? { gte: query.dateFrom } : {}), ...(query.dateTo ? { lte: query.dateTo } : {}) } }
          : {}),
      },
    };
  }
  if (query.q) {
    where.OR = [
      { firstName: { contains: query.q, mode: "insensitive" } },
      { lastName: { contains: query.q, mode: "insensitive" } },
      { employeeId: { contains: query.q, mode: "insensitive" } },
      { nationalId: { contains: query.q, mode: "insensitive" } },
      { medicalRecordNumber: { contains: query.q, mode: "insensitive" } },
      { organization: { name: { contains: query.q, mode: "insensitive" } } },
      { contractor: { name: { contains: query.q, mode: "insensitive" } } },
    ];
  }
  return where;
}

enterpriseRouter.get("/organizations", async (_req, res, next) => {
  try {
    const organizations = await prisma.organization.findMany({
      include: { contractors: true, departments: true },
      orderBy: { name: "asc" },
    });
    res.json({ organizations: organizations.map(serializeOrganization) });
  } catch (error) {
    next(error);
  }
});

enterpriseRouter.post("/organizations", requireRole("ADMIN"), validateBody(organizationSchema), async (req, res, next) => {
  try {
    const organization = await prisma.organization.create({
      data: {
        address: req.body.address,
        email: req.body.email,
        logo: req.body.logo,
        name: req.body.name,
        phone: req.body.phone,
        status: organizationStatus(req.body.status),
        type: organizationType(req.body.type),
      },
      include: { contractors: true, departments: true },
    });
    res.status(201).json({ organization: serializeOrganization(organization) });
  } catch (error) {
    next(error);
  }
});

enterpriseRouter.patch(
  "/organizations/:organizationId",
  requireRole("ADMIN"),
  validateBody(organizationUpdateSchema),
  async (req, res, next) => {
    try {
      const organization = await prisma.organization.update({
        data: {
          address: req.body.address,
          email: req.body.email,
          logo: req.body.logo,
          name: req.body.name,
          phone: req.body.phone,
          status: req.body.status ? organizationStatus(req.body.status) : undefined,
          type: req.body.type ? organizationType(req.body.type) : undefined,
        },
        include: { contractors: true, departments: true },
        where: { id: String(req.params.organizationId) },
      });
      res.json({ organization: serializeOrganization(organization) });
    } catch (error) {
      next(error);
    }
  },
);

enterpriseRouter.post(
  "/organizations/:organizationId/departments",
  requireRole("ADMIN"),
  validateBody(childUnitSchema),
  async (req, res, next) => {
    try {
      const department = await prisma.department.create({
        data: { name: req.body.name, organizationId: String(req.params.organizationId) },
      });
      res.status(201).json({ department });
    } catch (error) {
      next(error);
    }
  },
);

enterpriseRouter.post(
  "/organizations/:organizationId/contractors",
  requireRole("ADMIN"),
  validateBody(childUnitSchema),
  async (req, res, next) => {
    try {
      const contractor = await prisma.contractor.create({
        data: { name: req.body.name, organizationId: String(req.params.organizationId) },
      });
      res.status(201).json({ contractor });
    } catch (error) {
      next(error);
    }
  },
);

enterpriseRouter.get("/patients/search", async (req, res, next) => {
  try {
    const query = enterpriseSearchSchema.parse(req.query);
    const where = patientWhereFromSearch(query);
    const [total, patients] = await Promise.all([
      prisma.patient.count({ where }),
      prisma.patient.findMany({
        orderBy: [{ updatedAt: "desc" }],
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

enterpriseRouter.get("/patients/:patientId/cardiac-history", async (req, res, next) => {
  try {
    const cardiacHistory = await prisma.cardiacHistory.findUnique({
      where: { patientId: String(req.params.patientId) },
    });
    res.json({ cardiacHistory });
  } catch (error) {
    next(error);
  }
});

enterpriseRouter.put(
  "/patients/:patientId/cardiac-history",
  requireRole("DOCTOR"),
  validateBody(cardiacHistorySchema),
  async (req, res, next) => {
    try {
      const cardiacHistory = await prisma.cardiacHistory.upsert({
        create: { patientId: String(req.params.patientId), ...req.body },
        update: req.body,
        where: { patientId: String(req.params.patientId) },
      });
      res.json({ cardiacHistory });
    } catch (error) {
      next(error);
    }
  },
);

enterpriseRouter.get("/patients/:patientId/procedures", async (req, res, next) => {
  try {
    const procedures = await prisma.procedureHistory.findMany({
      orderBy: { procedureDate: "desc" },
      where: { patientId: String(req.params.patientId) },
    });
    res.json({ procedures });
  } catch (error) {
    next(error);
  }
});

enterpriseRouter.post(
  "/patients/:patientId/procedures",
  requireRole("DOCTOR"),
  validateBody(procedureHistorySchema),
  async (req, res, next) => {
    try {
      const patientId = String(req.params.patientId);
      const patient = await prisma.patient.findUnique({ where: { id: patientId } });
      if (!patient) throw new AppError(404, "Patient not found.", "PATIENT_NOT_FOUND");
      const procedure = await prisma.procedureHistory.create({
        data: {
          attachments: req.body.attachments,
          hospital: req.body.hospital,
          notes: req.body.notes,
          patientId,
          procedureDate: req.body.procedureDate,
          procedureType: procedureTypeMap[req.body.procedureType as ProcedureTypeInput],
        },
      });
      const isSurgery = ["CABG", "VALVE_SURGERY", "OPEN_HEART_SURGERY"].includes(procedure.procedureType);
      await prisma.timelineEvent.create({
        data: {
          patientId,
          title: isSurgery ? "Surgery added" : "Procedure added",
          type: isSurgery ? "SURGERY_ADDED" : "PROCEDURE_ADDED",
          metadata: { procedureId: procedure.id, procedureType: procedure.procedureType },
          notes: procedure.notes,
        },
      });
      await prisma.auditLog.create({
        data: {
          action: "PROCEDURE_ADDED",
          actorId: req.auth!.id,
          message: `Procedure history added for ${patient.firstName} ${patient.lastName}.`,
          patientId,
        },
      });
      res.status(201).json({ procedure });
    } catch (error) {
      next(error);
    }
  },
);

enterpriseRouter.get("/patients/:patientId/fitness-decisions", async (req, res, next) => {
  try {
    const fitnessDecisions = await prisma.fitnessDecision.findMany({
      orderBy: { createdAt: "desc" },
      where: { patientId: String(req.params.patientId) },
    });
    res.json({ fitnessDecisions });
  } catch (error) {
    next(error);
  }
});

enterpriseRouter.post(
  "/patients/:patientId/fitness-decisions",
  requireRole("DOCTOR"),
  validateBody(fitnessDecisionSchema),
  async (req, res, next) => {
    try {
      const patientId = String(req.params.patientId);
      const fitnessDecision = await prisma.fitnessDecision.create({
        data: {
          decidedById: req.auth!.id,
          decision: fitnessDecisionMap[req.body.decision as FitnessDecisionInput],
          notes: req.body.notes,
          patientId,
          restrictions: req.body.restrictions,
          validUntil: req.body.validUntil,
        },
      });
      await prisma.timelineEvent.create({
        data: {
          metadata: { decision: fitnessDecision.decision, fitnessDecisionId: fitnessDecision.id },
          patientId,
          title: "Fitness decision added",
          type: "FITNESS_DECISION_ADDED",
        },
      });
      await prisma.auditLog.create({
        data: {
          action: "FITNESS_DECISION_ADDED",
          actorId: req.auth!.id,
          message: `Fitness decision ${fitnessDecision.decision} added.`,
          patientId,
        },
      });
      res.status(201).json({ fitnessDecision });
    } catch (error) {
      next(error);
    }
  },
);

enterpriseRouter.post(
  "/patients/:patientId/clinical-notes",
  requireRole("DOCTOR"),
  validateBody(clinicalNoteSchema),
  async (req, res, next) => {
    try {
      const event = await prisma.timelineEvent.create({
        data: {
          caseId: req.body.caseId,
          notes: req.body.notes,
          patientId: String(req.params.patientId),
          title: req.body.title,
          type: "CLINICAL_NOTE_ADDED",
        },
      });
      res.status(201).json({ event: serializeTimeline(event) });
    } catch (error) {
      next(error);
    }
  },
);

enterpriseRouter.get("/patients/:patientId/timeline", async (req, res, next) => {
  try {
    const timeline = await prisma.timelineEvent.findMany({
      orderBy: { createdAt: "asc" },
      where: { patientId: String(req.params.patientId) },
    });
    res.json({ timeline: timeline.map(serializeTimeline) });
  } catch (error) {
    next(error);
  }
});

enterpriseRouter.get("/organizations/:organizationId/analytics", requireRole("ADMIN"), async (req, res, next) => {
  try {
    const organizationId = String(req.params.organizationId);
    const [totalEmployees, totalEcgs, abnormalEcgs, criticalEcgs, diseaseRows] = await Promise.all([
      prisma.patient.count({ where: { archivedAt: null, organizationId } }),
      prisma.eCGCase.count({ where: { patient: { organizationId } } }),
      prisma.eCGCase.count({ where: { finalDiagnosis: { not: null }, patient: { organizationId } } }),
      prisma.eCGCase.count({ where: { priority: "CRITICAL", patient: { organizationId } } }),
      prisma.eCGCase.groupBy({
        by: ["finalDiagnosis"],
        _count: { _all: true },
        where: { finalDiagnosis: { not: null }, patient: { organizationId } },
      }),
    ]);
    const monthlyRows = await prisma.eCGCase.findMany({
      select: { uploadDate: true },
      where: { patient: { organizationId } },
    });
    const monthlyTrends = monthlyRows.reduce<Record<string, number>>((acc, row) => {
      const key = row.uploadDate.toISOString().slice(0, 7);
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});
    res.json({
      analytics: {
        abnormalEcgPercentage: totalEcgs ? Math.round((abnormalEcgs / totalEcgs) * 100) : 0,
        criticalEcgPercentage: totalEcgs ? Math.round((criticalEcgs / totalEcgs) * 100) : 0,
        diseasePrevalence: Object.fromEntries(diseaseRows.map((row) => [row.finalDiagnosis ?? "Unspecified", row._count._all])),
        monthlyTrends,
        totalEcgs,
        totalEmployees,
      },
    });
  } catch (error) {
    next(error);
  }
});
