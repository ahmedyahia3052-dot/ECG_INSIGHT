import type { Prisma } from "@prisma/client";
import { Router } from "express";
import { prisma } from "../../config/prisma";
import { requireAuth } from "../../middleware/auth";
import { serializePatient } from "../../utils/clinical";

export const searchRouter = Router();

searchRouter.use(requireAuth);

function queryText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function patientWhere(reqQuery: Record<string, unknown>): Prisma.PatientWhereInput {
  const q = queryText(reqQuery["q"]);
  const contractorId = queryText(reqQuery["contractorId"]);
  const organization = queryText(reqQuery["organization"]);
  const contractor = queryText(reqQuery["contractor"]);
  const diagnosis = queryText(reqQuery["diagnosis"]);
  return {
    archivedAt: null,
    ...(contractorId ? { contractorCompanyId: contractorId } : {}),
    ...(organization ? { organization: { name: { contains: organization, mode: "insensitive" } } } : {}),
    ...(contractor ? { contractorCompany: { name: { contains: contractor, mode: "insensitive" } } } : {}),
    ...(diagnosis ? { cases: { some: { finalDiagnosis: { contains: diagnosis, mode: "insensitive" } } } } : {}),
    ...(q
      ? {
          OR: [
            { firstName: { contains: q, mode: "insensitive" } },
            { lastName: { contains: q, mode: "insensitive" } },
            { employeeId: { contains: q, mode: "insensitive" } },
            { nationalId: { contains: q, mode: "insensitive" } },
            { medicalRecordNumber: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };
}

searchRouter.get("/patients", async (req, res, next) => {
  try {
    const efLt = Number(req.query["efLt"]);
    const procedure = queryText(req.query["procedure"]);
    const condition = queryText(req.query["condition"]).toLowerCase();
    const where: Prisma.PatientWhereInput = patientWhere(req.query);
    if (condition === "hypertension") where.cardiacHistory = { hypertension: true };
    if (condition === "arrhythmia") where.cardiacHistory = { arrhythmiaHistory: true };
    if (procedure) {
      where.cardiacProcedures = { some: { procedureType: procedure.toUpperCase() as Prisma.EnumCardiacProcedureTypeFilter["equals"] } };
    }
    const patients = await prisma.patient.findMany({
      include: { documentExtractions: true },
      orderBy: { updatedAt: "desc" },
      take: 100,
      where,
    });
    const filtered = Number.isFinite(efLt)
      ? patients.filter((patient) =>
          patient.documentExtractions.some((extraction) => JSON.stringify(extraction.extractedJson).includes("ejectionFraction")),
        )
      : patients;
    res.json({ patients: filtered.map(serializePatient) });
  } catch (error) {
    next(error);
  }
});

searchRouter.get("/documents", async (req, res, next) => {
  try {
    const q = queryText(req.query["q"]);
    const ischemia = queryText(req.query["ischemia"]) === "true";
    const stents = queryText(req.query["stents"]) === "true";
    const where: Prisma.DocumentSearchIndexWhereInput = {
      ...(q ? { searchText: { contains: q, mode: "insensitive" } } : {}),
      ...(ischemia ? { searchText: { contains: "ischemia", mode: "insensitive" } } : {}),
      ...(stents ? { searchText: { contains: "stent", mode: "insensitive" } } : {}),
    };
    const indexes = await prisma.documentSearchIndex.findMany({
      include: { document: true, patient: true },
      orderBy: { indexedAt: "desc" },
      take: 100,
      where,
    });
    res.json({
      documents: indexes.map((index) => ({
        documentId: index.documentId,
        documentType: index.documentType.toLowerCase(),
        patient: serializePatient(index.patient),
        snippet: index.searchText.slice(0, 320),
        title: index.document.title,
      })),
    });
  } catch (error) {
    next(error);
  }
});

searchRouter.get("/occupational", async (req, res, next) => {
  try {
    const unfit = queryText(req.query["unfit"]) === "true";
    const temporaryRestrictions = queryText(req.query["temporaryRestrictions"]) === "true";
    const organization = queryText(req.query["organization"]);
    const where: Prisma.EmployeeWhereInput = {
      ...(organization ? { organization: { name: { contains: organization, mode: "insensitive" } } } : {}),
      ...(unfit ? { medicalFitnessStatus: { in: ["TEMPORARILY_UNFIT", "PERMANENTLY_UNFIT", "REFER_TO_CARDIOLOGIST"] } } : {}),
      ...(temporaryRestrictions ? { workRestrictions: { some: { active: true, endsAt: { not: null } } } } : {}),
    };
    const employees = await prisma.employee.findMany({
      include: { contractorCompany: true, organization: true, workRestrictions: true },
      orderBy: { updatedAt: "desc" },
      take: 100,
      where,
    });
    res.json({ employees });
  } catch (error) {
    next(error);
  }
});

searchRouter.get("/global", async (req, res, next) => {
  try {
    const q = queryText(req.query["q"]);
    const [patients, documents, articles, employees] = await Promise.all([
      prisma.patient.findMany({ take: 20, where: patientWhere({ q }) }),
      prisma.documentSearchIndex.findMany({
        include: { document: true },
        take: 20,
        where: q ? { searchText: { contains: q, mode: "insensitive" } } : {},
      }),
      prisma.knowledgeArticle.findMany({
        take: 20,
        where: q
          ? { OR: [{ title: { contains: q, mode: "insensitive" } }, { body: { contains: q, mode: "insensitive" } }] }
          : {},
      }),
      prisma.employee.findMany({
        take: 20,
        where: q
          ? { OR: [{ fullName: { contains: q, mode: "insensitive" } }, { employeeId: { contains: q, mode: "insensitive" } }] }
          : {},
      }),
    ]);
    res.json({
      articles,
      documents: documents.map((index) => ({ documentId: index.documentId, title: index.document.title })),
      employees,
      patients: patients.map(serializePatient),
    });
  } catch (error) {
    next(error);
  }
});
