import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import multer from "multer";
import { Router } from "express";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../../config/prisma";
import { requireAuth, requireRole } from "../../middleware/auth";
import { AppError } from "../../middleware/error";
import { assertResourceAccess, canAccessCase, canAccessPatient } from "../../utils/resource-access";
import {
  compareEcgFile,
  measureEcgFile,
  parseAndPersistEcgFile,
  serializeEcgFile,
} from "./ecg-clinical.service";

const uploadRoot = path.resolve(process.cwd(), "uploads", "clinical-ecg");
fs.mkdirSync(uploadRoot, { recursive: true });

const allowedMimeTypes = new Set([
  "application/dicom",
  "application/edf",
  "application/hl7-v2",
  "application/json",
  "application/octet-stream",
  "application/pdf",
  "application/xml",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "text/csv",
  "text/plain",
  "text/xml",
]);
const allowedExtensions = new Set([
  ".csv",
  ".dcm",
  ".dicom",
  ".edf",
  ".hl7",
  ".jpeg",
  ".jpg",
  ".json",
  ".pdf",
  ".png",
  ".scp",
  ".txt",
  ".xml",
]);

const uploadSchema = z.object({
  caseId: z.string().trim().optional(),
  patientId: z.string().trim().min(1),
});

function safeStoredName(originalName: string) {
  const ext = path.extname(originalName).toLowerCase();
  if (!allowedExtensions.has(ext)) {
    throw new AppError(400, "Unsupported ECG clinical file extension.", "INVALID_ECG_FILE_EXTENSION");
  }
  return `${Date.now()}-${randomUUID()}${ext}`;
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadRoot),
  filename: (_req, file, cb) => {
    try {
      cb(null, safeStoredName(file.originalname));
    } catch (error) {
      cb(error as Error, "");
    }
  },
});

const upload = multer({
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowedMimeTypes.has(file.mimetype) && !allowedExtensions.has(ext)) {
      cb(new AppError(400, "Unsupported ECG clinical file type.", "INVALID_ECG_FILE_TYPE"));
      return;
    }
    cb(null, true);
  },
  limits: { fileSize: 50 * 1024 * 1024 },
  storage,
});

export const ecgFilesRouter = Router();

ecgFilesRouter.use(requireAuth);

async function assertEcgFileAccess(ecgFileId: string, auth: Express.AuthUser) {
  const file = await prisma.eCGFile.findUnique({ where: { id: ecgFileId } });
  if (!file) throw new AppError(404, "ECG file not found.", "ECG_FILE_NOT_FOUND");
  assertResourceAccess(
    file.uploadedById === auth.id ||
      (await canAccessPatient(file.patientId, auth)) ||
      (file.caseId ? await canAccessCase(file.caseId, auth) : false),
  );
  return file;
}

ecgFilesRouter.post("/files/upload", requireRole("DOCTOR"), upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) throw new AppError(400, "ECG file is required.", "FILE_REQUIRED");
    const body = uploadSchema.parse(req.body);
    const patient = await prisma.patient.findUnique({ where: { id: body.patientId } });
    if (!patient) {
      fs.rmSync(req.file.path, { force: true });
      throw new AppError(404, "Patient not found.", "PATIENT_NOT_FOUND");
    }
    assertResourceAccess(await canAccessPatient(patient.id, req.auth!));
    if (body.caseId) {
      const ecgCase = await prisma.eCGCase.findUnique({ where: { id: body.caseId } });
      if (!ecgCase || ecgCase.patientId !== patient.id) {
        fs.rmSync(req.file.path, { force: true });
        throw new AppError(404, "Linked ECG case not found for this patient.", "CASE_NOT_FOUND");
      }
      assertResourceAccess(await canAccessCase(ecgCase.id, req.auth!));
    }
    const file = await prisma.eCGFile.create({
      data: {
        caseId: body.caseId,
        fileName: req.file.originalname,
        mimeType: req.file.mimetype,
        organizationId: patient.organizationId,
        originalName: req.file.originalname,
        patientId: patient.id,
        sizeBytes: req.file.size,
        storagePath: req.file.path,
        storedName: req.file.filename,
        storedPath: req.file.path,
        uploadedById: req.auth!.id,
      },
    });
    await prisma.timelineEvent.create({
      data: {
        caseId: body.caseId,
        metadata: { ecgFileId: file.id, originalName: file.originalName },
        patientId: patient.id,
        title: "Clinical ECG file uploaded",
        type: "ECG_UPLOADED",
      },
    });
    await prisma.auditLog.create({
      data: {
        action: "ECG_UPLOADED",
        actorId: req.auth!.id,
        caseId: body.caseId,
        message: `Clinical ECG file ${file.originalName} uploaded.`,
        metadata: { ecgFileId: file.id, sizeBytes: file.sizeBytes },
        patientId: patient.id,
      },
    });
    res.status(201).json({ file: serializeEcgFile(file) });
  } catch (error) {
    next(error);
  }
});

ecgFilesRouter.get("/files/list", async (req, res, next) => {
  try {
    const query = z
      .object({
        caseId: z.string().trim().optional(),
        fileType: z
          .enum(["DICOM_ECG", "SCP_ECG", "EDF", "XML_ECG", "HL7_ECG", "PHILIPS_XML", "GE_MUSE_XML", "IMAGE", "PDF_REPORT", "WAVEFORM", "UNKNOWN"])
          .optional(),
        page: z.coerce.number().int().min(1).default(1),
        pageSize: z.coerce.number().int().min(1).max(100).default(50),
        patientId: z.string().trim().optional(),
        q: z.string().trim().optional(),
      })
      .parse(req.query);
    if (query.patientId) assertResourceAccess(await canAccessPatient(query.patientId, req.auth!));
    if (query.caseId) assertResourceAccess(await canAccessCase(query.caseId, req.auth!));
    const where: Prisma.ECGFileWhereInput = {
      caseId: query.caseId,
      fileType: query.fileType,
      patientId: query.patientId,
      AND: [
        ...(query.q
          ? [
              {
                OR: [
                  { originalName: { contains: query.q } },
                  { fileName: { contains: query.q } },
                  { patientId: query.q },
                  { caseId: query.q },
                ],
              },
            ]
          : []),
        ...(req.auth!.role === "SUPER_ADMIN" || req.auth!.role === "ADMIN"
          ? []
          : [
              {
                OR: [
                  { uploadedById: req.auth!.id },
                  { case: { OR: [{ assignedDoctorId: req.auth!.id }, { uploadedById: req.auth!.id }] } },
                  { patient: { auditLogs: { some: { action: "PATIENT_CREATED" as const, actorId: req.auth!.id } } } },
                ],
              },
            ]),
      ],
    };
    const [total, files] = await Promise.all([
      prisma.eCGFile.count({ where }),
      prisma.eCGFile.findMany({
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        where,
      }),
    ]);
    res.json({ files: files.map(serializeEcgFile), page: query.page, pageSize: query.pageSize, total, totalPages: Math.ceil(total / query.pageSize) });
  } catch (error) {
    next(error);
  }
});

ecgFilesRouter.get("/files/:ecgFileId/download", async (req, res, next) => {
  try {
    const file = await assertEcgFileAccess(String(req.params.ecgFileId), req.auth!);
    res.download(file.storagePath, file.originalName);
  } catch (error) {
    next(error);
  }
});

ecgFilesRouter.post("/files/parse", requireRole("DOCTOR"), async (req, res, next) => {
  try {
    const body = z.object({ ecgFileId: z.string().trim().min(1) }).parse(req.body);
    await assertEcgFileAccess(body.ecgFileId, req.auth!);
    const parsed = await parseAndPersistEcgFile(body.ecgFileId, req.auth!.id);
    res.json({ parsed: { duration: parsed.duration, metadata: parsed.metadata, numberOfLeads: parsed.leads.length } });
  } catch (error) {
    next(error);
  }
});

ecgFilesRouter.post("/files/measure", requireRole("DOCTOR"), async (req, res, next) => {
  try {
    const body = z.object({ ecgFileId: z.string().trim().min(1) }).parse(req.body);
    await assertEcgFileAccess(body.ecgFileId, req.auth!);
    const result = await measureEcgFile(body.ecgFileId, req.auth!.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

ecgFilesRouter.post("/files/compare", requireRole("DOCTOR"), async (req, res, next) => {
  try {
    const body = z.object({ ecgFileId: z.string().trim().min(1) }).parse(req.body);
    await assertEcgFileAccess(body.ecgFileId, req.auth!);
    const comparison = await compareEcgFile(body.ecgFileId, req.auth!.id);
    res.json({ comparison });
  } catch (error) {
    next(error);
  }
});

ecgFilesRouter.delete("/files/:ecgFileId", requireRole("DOCTOR"), async (req, res, next) => {
  try {
    const file = await assertEcgFileAccess(String(req.params.ecgFileId), req.auth!);
    await prisma.eCGFile.delete({ where: { id: file.id } });
    fs.rmSync(file.storagePath, { force: true });
    await prisma.auditLog.create({
      data: {
        action: "ECG_FILE_DELETED",
        actorId: req.auth!.id,
        caseId: file.caseId,
        entityId: file.id,
        entityType: "ECGFile",
        message: `Clinical ECG file ${file.originalName} deleted.`,
        metadata: { sizeBytes: file.sizeBytes },
        patientId: file.patientId,
      },
    });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
