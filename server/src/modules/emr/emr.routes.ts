import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import multer from "multer";
import type { Prisma } from "@prisma/client";
import { Router } from "express";
import { prisma } from "../../config/prisma";
import { requireAuth, requireRole } from "../../middleware/auth";
import { AppError } from "../../middleware/error";
import { validateBody } from "../../middleware/validate";
import { fromApiSmokingStatus, serializePatient } from "../../utils/clinical";
import {
  cardiacHistorySchema,
  cardiacProcedureSchema,
  cardiacProcedureUpdateSchema,
  emrSearchSchema,
  hospitalizationSchema,
  imagingBodySchema,
  medicationSchema,
  medicationUpdateSchema,
} from "./emr.schemas";

const imagingRoot = path.resolve(process.cwd(), "uploads", "cardiac-imaging");
fs.mkdirSync(imagingRoot, { recursive: true });

const allowedImagingMimeTypes = new Set([
  "application/dicom",
  "application/octet-stream",
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
]);

const allowedImagingExtensions = new Set([".dcm", ".dicom", ".jpeg", ".jpg", ".pdf", ".png"]);

const procedureTypeMap = {
  ablation: "ABLATION",
  cabg: "CABG",
  cardiac_catheterization: "CARDIAC_CATHETERIZATION",
  coronary_angiography: "CORONARY_ANGIOGRAPHY",
  crt: "CRT",
  icd: "ICD",
  open_heart_surgery: "OPEN_HEART_SURGERY",
  pacemaker: "PACEMAKER",
  pci: "PCI",
  valve_replacement: "VALVE_REPLACEMENT",
} as const;
type ProcedureTypeInput = keyof typeof procedureTypeMap;

const imagingTypeMap = {
  angiography_images: "ANGIOGRAPHY_IMAGES",
  cardiac_ct: "CARDIAC_CT",
  cardiac_mri: "CARDIAC_MRI",
  chest_xray: "CHEST_XRAY",
  coronary_cta: "CORONARY_CTA",
  echocardiography: "ECHOCARDIOGRAPHY",
  holter_ecg: "HOLTER_ECG",
  stress_ecg: "STRESS_ECG",
} as const;
type ImagingTypeInput = keyof typeof imagingTypeMap;

const medicationCategoryMap = {
  ace_inhibitor: "ACE_INHIBITOR",
  antiarrhythmic: "ANTIARRHYTHMIC",
  anticoagulant: "ANTICOAGULANT",
  antiplatelet: "ANTIPLATELET",
  arb: "ARB",
  beta_blocker: "BETA_BLOCKER",
  calcium_channel_blocker: "CALCIUM_CHANNEL_BLOCKER",
  diuretic: "DIURETIC",
  nitrate: "NITRATE",
  other: "OTHER",
  sglt2_inhibitor: "SGLT2_INHIBITOR",
  statin: "STATIN",
} as const;
type MedicationCategoryInput = keyof typeof medicationCategoryMap;

const medicationLibrary = [
  { category: "antiplatelet", name: "Aspirin" },
  { category: "antiplatelet", name: "Clopidogrel" },
  { category: "anticoagulant", name: "Warfarin" },
  { category: "anticoagulant", name: "Apixaban" },
  { category: "beta_blocker", name: "Bisoprolol" },
  { category: "beta_blocker", name: "Metoprolol" },
  { category: "ace_inhibitor", name: "Ramipril" },
  { category: "arb", name: "Valsartan" },
  { category: "statin", name: "Atorvastatin" },
  { category: "statin", name: "Rosuvastatin" },
  { category: "nitrate", name: "Isosorbide Mononitrate" },
  { category: "antiarrhythmic", name: "Amiodarone" },
  { category: "diuretic", name: "Furosemide" },
  { category: "sglt2_inhibitor", name: "Empagliflozin" },
] as const;

export const emrRouter = Router();
emrRouter.use(requireAuth);

function safeStoredName(originalName: string) {
  const ext = path.extname(originalName).toLowerCase();
  if (!allowedImagingExtensions.has(ext)) {
    throw new AppError(400, "Unsupported cardiac imaging extension.", "INVALID_IMAGING_EXTENSION");
  }
  return `${Date.now()}-${randomUUID()}${ext}`;
}

const imagingStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, imagingRoot),
  filename: (_req, file, cb) => {
    try {
      cb(null, safeStoredName(file.originalname));
    } catch (error) {
      cb(error as Error, "");
    }
  },
});

const uploadImaging = multer({
  fileFilter: (_req, file, cb) => {
    if (!allowedImagingMimeTypes.has(file.mimetype)) {
      cb(new AppError(400, "Unsupported cardiac imaging file type.", "INVALID_IMAGING_TYPE"));
      return;
    }
    cb(null, true);
  },
  limits: { fileSize: 100 * 1024 * 1024 },
  storage: imagingStorage,
});

function serializeTimelineEvent(event: {
  createdAt: Date;
  id: string;
  metadata?: unknown;
  notes?: string | null;
  patientId: string;
  title: string;
  type: string;
}) {
  return {
    createdAt: event.createdAt.toISOString(),
    id: event.id,
    metadata: event.metadata,
    notes: event.notes ?? undefined,
    patientId: event.patientId,
    title: event.title,
    type: event.type.toLowerCase(),
  };
}

async function assertPatient(patientId: string) {
  const patient = await prisma.patient.findUnique({ where: { id: patientId } });
  if (!patient || patient.archivedAt) throw new AppError(404, "Patient not found.", "PATIENT_NOT_FOUND");
  return patient;
}

function procedureTimelineType(procedureType: string) {
  return ["CABG", "OPEN_HEART_SURGERY", "VALVE_REPLACEMENT"].includes(procedureType)
    ? "SURGERY_ADDED"
    : "CARDIAC_PROCEDURE_ADDED";
}

emrRouter.get("/medication-library", async (_req, res) => {
  res.json({ medications: medicationLibrary });
});

emrRouter.get("/patients/:patientId/cardiac-history", async (req, res, next) => {
  try {
    const cardiacHistory = await prisma.cardiacHistory.findUnique({
      where: { patientId: String(req.params.patientId) },
    });
    res.json({ cardiacHistory });
  } catch (error) {
    next(error);
  }
});

emrRouter.put(
  "/patients/:patientId/cardiac-history",
  requireRole("DOCTOR"),
  validateBody(cardiacHistorySchema),
  async (req, res, next) => {
    try {
      const patientId = String(req.params.patientId);
      await assertPatient(patientId);
      const data = {
        ...req.body,
        smokingStatus: fromApiSmokingStatus(req.body.smokingStatus),
      };
      const cardiacHistory = await prisma.cardiacHistory.upsert({
        create: { patientId, ...data },
        update: data,
        where: { patientId },
      });
      await prisma.auditLog.create({
        data: {
          action: "PATIENT_UPDATED",
          actorId: req.auth!.id,
          message: "Comprehensive cardiac history updated.",
          patientId,
        },
      });
      res.json({ cardiacHistory });
    } catch (error) {
      next(error);
    }
  },
);

emrRouter.get("/patients/:patientId/procedures", async (req, res, next) => {
  try {
    const procedures = await prisma.cardiacProcedure.findMany({
      orderBy: { procedureDate: "desc" },
      where: { patientId: String(req.params.patientId) },
    });
    res.json({ procedures });
  } catch (error) {
    next(error);
  }
});

emrRouter.post(
  "/patients/:patientId/procedures",
  requireRole("DOCTOR"),
  validateBody(cardiacProcedureSchema),
  async (req, res, next) => {
    try {
      const patientId = String(req.params.patientId);
      await assertPatient(patientId);
      const procedure = await prisma.cardiacProcedure.create({
        data: {
          documents: req.body.documents,
          findings: req.body.findings,
          hospital: req.body.hospital,
          images: req.body.images,
          notes: req.body.notes,
          operatorPhysician: req.body.operatorPhysician,
          patientId,
          procedureDate: req.body.procedureDate,
          procedureType: procedureTypeMap[req.body.procedureType as ProcedureTypeInput],
        },
      });
      await prisma.timelineEvent.create({
        data: {
          metadata: { procedureId: procedure.id, procedureType: procedure.procedureType },
          notes: procedure.notes,
          patientId,
          title: `Cardiac procedure: ${procedure.procedureType}`,
          type: procedureTimelineType(procedure.procedureType),
        },
      });
      await prisma.auditLog.create({
        data: {
          action: "CARDIAC_PROCEDURE_ADDED",
          actorId: req.auth!.id,
          message: `Cardiac procedure ${procedure.procedureType} added.`,
          patientId,
        },
      });
      res.status(201).json({ procedure });
    } catch (error) {
      next(error);
    }
  },
);

emrRouter.patch(
  "/procedures/:procedureId",
  requireRole("DOCTOR"),
  validateBody(cardiacProcedureUpdateSchema),
  async (req, res, next) => {
    try {
      const procedure = await prisma.cardiacProcedure.update({
        data: {
          documents: req.body.documents,
          findings: req.body.findings,
          hospital: req.body.hospital,
          images: req.body.images,
          notes: req.body.notes,
          operatorPhysician: req.body.operatorPhysician,
          procedureDate: req.body.procedureDate,
          procedureType: req.body.procedureType
            ? procedureTypeMap[req.body.procedureType as ProcedureTypeInput]
            : undefined,
        },
        where: { id: String(req.params.procedureId) },
      });
      res.json({ procedure });
    } catch (error) {
      next(error);
    }
  },
);

emrRouter.delete("/procedures/:procedureId", requireRole("DOCTOR"), async (req, res, next) => {
  try {
    await prisma.cardiacProcedure.delete({ where: { id: String(req.params.procedureId) } });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

emrRouter.get("/patients/:patientId/imaging", async (req, res, next) => {
  try {
    const imaging = await prisma.cardiacImaging.findMany({
      orderBy: { createdAt: "desc" },
      where: { patientId: String(req.params.patientId) },
    });
    res.json({ imaging: imaging.map((item) => ({ ...item, downloadUrl: `/api/emr/imaging/${item.storedName}` })) });
  } catch (error) {
    next(error);
  }
});

emrRouter.post("/patients/:patientId/imaging", requireRole("DOCTOR"), uploadImaging.single("file"), async (req, res, next) => {
  try {
    if (!req.file) throw new AppError(400, "Cardiac imaging file is required.", "FILE_REQUIRED");
    const patientId = String(req.params.patientId);
    await assertPatient(patientId);
    const body = imagingBodySchema.parse(req.body);
    const imaging = await prisma.cardiacImaging.create({
      data: {
        findings: body.findings,
        imagingType: imagingTypeMap[body.imagingType as ImagingTypeInput],
        mimeType: req.file.mimetype,
        notes: body.notes,
        originalName: req.file.originalname,
        patientId,
        performedAt: body.performedAt,
        sizeBytes: req.file.size,
        storagePath: req.file.path,
        storedName: req.file.filename,
        title: body.title,
        uploadedById: req.auth!.id,
      },
    });
    await prisma.timelineEvent.create({
      data: {
        metadata: { imagingId: imaging.id, imagingType: imaging.imagingType },
        notes: imaging.notes,
        patientId,
        title: `Cardiac imaging uploaded: ${imaging.imagingType}`,
        type: "CARDIAC_IMAGING_UPLOADED",
      },
    });
    await prisma.auditLog.create({
      data: {
        action: "CARDIAC_IMAGING_UPLOADED",
        actorId: req.auth!.id,
        message: `Cardiac imaging ${imaging.originalName} uploaded.`,
        patientId,
      },
    });
    res.status(201).json({ imaging: { ...imaging, downloadUrl: `/api/emr/imaging/${imaging.storedName}` } });
  } catch (error) {
    if (req.file) fs.rmSync(req.file.path, { force: true });
    next(error);
  }
});

emrRouter.get("/imaging/:storedName", async (req, res, next) => {
  try {
    const storedName = path.basename(String(req.params.storedName));
    const imaging = await prisma.cardiacImaging.findFirst({ where: { storedName } });
    if (!imaging) throw new AppError(404, "Cardiac imaging file not found.", "IMAGING_NOT_FOUND");
    res.download(imaging.storagePath, imaging.originalName);
  } catch (error) {
    next(error);
  }
});

emrRouter.get("/patients/:patientId/medications", async (req, res, next) => {
  try {
    const medications = await prisma.medicationHistory.findMany({
      orderBy: [{ active: "desc" }, { startDate: "desc" }],
      where: { patientId: String(req.params.patientId) },
    });
    res.json({ medications });
  } catch (error) {
    next(error);
  }
});

emrRouter.post("/patients/:patientId/medications", requireRole("DOCTOR"), validateBody(medicationSchema), async (req, res, next) => {
  try {
    const patientId = String(req.params.patientId);
    await assertPatient(patientId);
    const medication = await prisma.medicationHistory.create({
      data: {
        active: req.body.active,
        category: medicationCategoryMap[req.body.category as MedicationCategoryInput],
        dose: req.body.dose,
        drugName: req.body.drugName,
        frequency: req.body.frequency,
        notes: req.body.notes,
        patientId,
        startDate: req.body.startDate,
        stopDate: req.body.stopDate,
      },
    });
    await prisma.timelineEvent.create({
      data: {
        metadata: { medicationId: medication.id },
        notes: `${medication.dose} ${medication.frequency}`,
        patientId,
        title: `Medication added: ${medication.drugName}`,
        type: "MEDICATION_ADDED",
      },
    });
    await prisma.auditLog.create({
      data: {
        action: "MEDICATION_ADDED",
        actorId: req.auth!.id,
        message: `Medication ${medication.drugName} added.`,
        patientId,
      },
    });
    res.status(201).json({ medication });
  } catch (error) {
    next(error);
  }
});

emrRouter.patch("/medications/:medicationId", requireRole("DOCTOR"), validateBody(medicationUpdateSchema), async (req, res, next) => {
  try {
    const medication = await prisma.medicationHistory.update({
      data: {
        active: req.body.active,
        category: req.body.category ? medicationCategoryMap[req.body.category as MedicationCategoryInput] : undefined,
        dose: req.body.dose,
        drugName: req.body.drugName,
        frequency: req.body.frequency,
        notes: req.body.notes,
        startDate: req.body.startDate,
        stopDate: req.body.stopDate,
      },
      where: { id: String(req.params.medicationId) },
    });
    await prisma.timelineEvent.create({
      data: {
        metadata: { medicationId: medication.id },
        patientId: medication.patientId,
        title: `Medication updated: ${medication.drugName}`,
        type: "MEDICATION_UPDATED",
      },
    });
    res.json({ medication });
  } catch (error) {
    next(error);
  }
});

emrRouter.delete("/medications/:medicationId", requireRole("DOCTOR"), async (req, res, next) => {
  try {
    const medication = await prisma.medicationHistory.update({
      data: { active: false, stopDate: new Date() },
      where: { id: String(req.params.medicationId) },
    });
    res.json({ medication });
  } catch (error) {
    next(error);
  }
});

emrRouter.post(
  "/patients/:patientId/hospitalizations",
  requireRole("DOCTOR"),
  validateBody(hospitalizationSchema),
  async (req, res, next) => {
    try {
      const patientId = String(req.params.patientId);
      await assertPatient(patientId);
      const event = await prisma.timelineEvent.create({
        data: {
          metadata: {
            admittedAt: req.body.admittedAt,
            dischargedAt: req.body.dischargedAt,
            hospital: req.body.hospital,
            reason: req.body.reason,
          },
          notes: req.body.notes,
          patientId,
          title: `Hospitalization: ${req.body.reason}`,
          type: "HOSPITALIZATION_ADDED",
        },
      });
      res.status(201).json({ event: serializeTimelineEvent(event) });
    } catch (error) {
      next(error);
    }
  },
);

emrRouter.get("/patients/:patientId/timeline", async (req, res, next) => {
  try {
    const patientId = String(req.params.patientId);
    const [events, reports, procedures, medications, documents, imaging] = await Promise.all([
      prisma.timelineEvent.findMany({ where: { patientId } }),
      prisma.clinicalReport.findMany({ select: { createdAt: true, id: true, reportNumber: true, status: true }, where: { patientId } }),
      prisma.cardiacProcedure.findMany({ where: { patientId } }),
      prisma.medicationHistory.findMany({ where: { patientId } }),
      prisma.clinicalDocument.findMany({ where: { patientId } }),
      prisma.cardiacImaging.findMany({ where: { patientId } }),
    ]);
    const timeline = [
      ...events.map(serializeTimelineEvent),
      ...reports.map((report) => serializeTimelineEvent({
        createdAt: report.createdAt,
        id: `report-${report.id}`,
        metadata: { reportId: report.id, status: report.status },
        patientId,
        title: `Clinical report ${report.reportNumber}`,
        type: "report",
      })),
      ...procedures.map((procedure) => serializeTimelineEvent({
        createdAt: procedure.procedureDate,
        id: `procedure-${procedure.id}`,
        metadata: { procedureId: procedure.id, procedureType: procedure.procedureType },
        notes: procedure.notes,
        patientId,
        title: `Procedure: ${procedure.procedureType}`,
        type: "procedure",
      })),
      ...medications.map((medication) => serializeTimelineEvent({
        createdAt: medication.startDate,
        id: `medication-${medication.id}`,
        metadata: { medicationId: medication.id, active: medication.active },
        notes: `${medication.dose} ${medication.frequency}`,
        patientId,
        title: `Medication: ${medication.drugName}`,
        type: "medication",
      })),
      ...documents.map((document) => serializeTimelineEvent({
        createdAt: document.createdAt,
        id: `document-${document.id}`,
        metadata: { category: document.category, documentId: document.id },
        patientId,
        title: `Document: ${document.title}`,
        type: "document",
      })),
      ...imaging.map((item) => serializeTimelineEvent({
        createdAt: item.performedAt ?? item.createdAt,
        id: `imaging-${item.id}`,
        metadata: { imagingId: item.id, imagingType: item.imagingType },
        notes: item.notes,
        patientId,
        title: `Imaging: ${item.title}`,
        type: "imaging",
      })),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json({ timeline });
  } catch (error) {
    next(error);
  }
});

emrRouter.get("/search", async (req, res, next) => {
  try {
    const query = emrSearchSchema.parse(req.query);
    const where: Prisma.PatientWhereInput = { archivedAt: null };
    if (query.patient) {
      where.OR = [
        { firstName: { contains: query.patient, mode: "insensitive" } },
        { lastName: { contains: query.patient, mode: "insensitive" } },
        { medicalRecordNumber: { contains: query.patient, mode: "insensitive" } },
      ];
    }
    if (query.nationalId) where.nationalId = { contains: query.nationalId, mode: "insensitive" };
    if (query.organizationId) where.organizationId = query.organizationId;
    if (query.contractorId) where.contractorId = query.contractorId;
    if (query.company) where.organization = { name: { contains: query.company, mode: "insensitive" } };
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
    if (query.procedure) {
      where.cardiacProcedures = {
        some: { procedureType: procedureTypeMap[query.procedure as ProcedureTypeInput] ?? undefined },
      };
    }
    const [total, patients] = await Promise.all([
      prisma.patient.count({ where }),
      prisma.patient.findMany({
        orderBy: { updatedAt: "desc" },
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
