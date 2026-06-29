import type { Prisma } from "@prisma/client";
import { Router } from "express";
import { prisma } from "../../config/prisma";
import { requireAuth } from "../../middleware/auth";
import { serializePatient } from "../../utils/clinical";

export const searchRouter = Router();

searchRouter.use(requireAuth);

type GlobalSearchType = "case" | "doctor" | "employee" | "organization" | "patient" | "report";

type GlobalSearchResult = {
  id: string;
  meta?: string;
  subtitle?: string;
  title: string;
  type: GlobalSearchType;
  url: string;
};

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

searchRouter.get("/", async (req, res, next) => {
  try {
    const q = queryText(req.query["q"]);
    if (q.length < 2) {
      res.json({ query: q, results: [], total: 0 });
      return;
    }

    const [patients, cases, reports, organizations, doctors, employees] = await Promise.all([
      prisma.patient.findMany({
        orderBy: { updatedAt: "desc" },
        take: 8,
        where: patientWhere({ q }),
      }),
      prisma.eCGCase.findMany({
        include: { patient: true },
        orderBy: { updatedAt: "desc" },
        take: 8,
        where: {
          OR: [
            { caseId: { contains: q, mode: "insensitive" } },
            { caseNumber: { contains: q, mode: "insensitive" } },
            { aiDiagnosis: { contains: q, mode: "insensitive" } },
            { doctorDiagnosis: { contains: q, mode: "insensitive" } },
            { finalDiagnosis: { contains: q, mode: "insensitive" } },
            { patient: { OR: [{ firstName: { contains: q, mode: "insensitive" } }, { lastName: { contains: q, mode: "insensitive" } }, { medicalRecordNumber: { contains: q, mode: "insensitive" } }] } },
          ],
        },
      }),
      prisma.clinicalReport.findMany({
        include: { patient: true },
        orderBy: { updatedAt: "desc" },
        take: 8,
        where: {
          OR: [
            { reportNumber: { contains: q, mode: "insensitive" } },
            { physicianName: { contains: q, mode: "insensitive" } },
            { organizationName: { contains: q, mode: "insensitive" } },
            { finalPhysicianImpression: { contains: q, mode: "insensitive" } },
            { patient: { OR: [{ firstName: { contains: q, mode: "insensitive" } }, { lastName: { contains: q, mode: "insensitive" } }, { medicalRecordNumber: { contains: q, mode: "insensitive" } }] } },
          ],
        },
      }),
      prisma.organization.findMany({
        orderBy: { updatedAt: "desc" },
        take: 8,
        where: {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            { country: { contains: q, mode: "insensitive" } },
            { city: { contains: q, mode: "insensitive" } },
          ],
        },
      }),
      prisma.user.findMany({
        orderBy: { updatedAt: "desc" },
        take: 8,
        where: {
          isActive: true,
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            { specialization: { contains: q, mode: "insensitive" } },
            { institution: { contains: q, mode: "insensitive" } },
            { registrationRole: { contains: q, mode: "insensitive" } },
          ],
          role: { in: ["DOCTOR", "ADMIN", "SUPER_ADMIN"] },
        },
      }),
      prisma.user.findMany({
        orderBy: { updatedAt: "desc" },
        take: 8,
        where: {
          isActive: true,
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            { employeeId: { contains: q, mode: "insensitive" } },
            { department: { contains: q, mode: "insensitive" } },
            { positionTitle: { contains: q, mode: "insensitive" } },
            { institution: { contains: q, mode: "insensitive" } },
          ],
        },
      }),
    ]);

    const results: GlobalSearchResult[] = [
      ...patients.map((patient) => ({
        id: patient.id,
        meta: `MRN ${patient.medicalRecordNumber}`,
        subtitle: [patient.email, patient.phone, patient.employeeId].filter(Boolean).join(" • ") || "Patient record",
        title: `${patient.firstName} ${patient.lastName}`.trim(),
        type: "patient" as const,
        url: `/patients/${patient.id}`,
      })),
      ...cases.map((ecgCase) => ({
        id: ecgCase.id,
        meta: ecgCase.status.toLowerCase().replace(/_/g, " "),
        subtitle: `${ecgCase.patient.firstName} ${ecgCase.patient.lastName}`.trim(),
        title: ecgCase.caseNumber ?? ecgCase.caseId,
        type: "case" as const,
        url: `/ecg-cases/${ecgCase.id}`,
      })),
      ...reports.map((report) => ({
        id: report.id,
        meta: report.status.toLowerCase().replace(/_/g, " "),
        subtitle: `${report.patient.firstName} ${report.patient.lastName}`.trim() || report.physicianName,
        title: report.reportNumber,
        type: "report" as const,
        url: `/reports/${report.id}`,
      })),
      ...organizations.map((organization) => ({
        id: organization.id,
        meta: organization.type.toLowerCase().replace(/_/g, " "),
        subtitle: [organization.email, organization.city, organization.country].filter(Boolean).join(" • ") || "Organization",
        title: organization.name,
        type: "organization" as const,
        url: "/team-management",
      })),
      ...doctors.map((doctor) => ({
        id: doctor.id,
        meta: doctor.role.toLowerCase().replace(/_/g, " "),
        subtitle: [doctor.email, doctor.specialization, doctor.institution].filter(Boolean).join(" • ") || "Clinical user",
        title: doctor.name,
        type: "doctor" as const,
        url: "/team-management",
      })),
      ...employees.map((employee) => ({
        id: employee.id,
        meta: employee.employeeId ? `Employee ${employee.employeeId}` : employee.role.toLowerCase().replace(/_/g, " "),
        subtitle: [employee.email, employee.department, employee.positionTitle, employee.institution].filter(Boolean).join(" • ") || "Employee record",
        title: employee.name,
        type: "employee" as const,
        url: "/team-management",
      })),
    ];

    res.json({ query: q, results, total: results.length });
  } catch (error) {
    next(error);
  }
});

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
