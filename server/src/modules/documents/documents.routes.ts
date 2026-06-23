import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import multer from "multer";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/prisma";
import { requireAuth, requireRole } from "../../middleware/auth";
import { AppError } from "../../middleware/error";
import { extractAndIndexDocument, serializeExtraction } from "./document-intelligence.service";

const documentRoot = path.resolve(process.cwd(), "uploads", "documents");
fs.mkdirSync(documentRoot, { recursive: true });

const allowedMimeTypes = new Set([
  "application/pdf",
  "application/dicom",
  "application/octet-stream",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/tiff",
]);

const allowedExtensions = new Set([".dcm", ".dicom", ".docx", ".jpeg", ".jpg", ".pdf", ".png", ".tif", ".tiff"]);

const categorySchema = z.enum([
  "ecg",
  "echocardiography",
  "stress_ecg",
  "holter",
  "cardiac_ct",
  "cardiac_mri",
  "angiography",
  "cath_reports",
  "laboratory_results",
  "surgery_reports",
  "discharge_summary",
  "other",
]);

const uploadBodySchema = z.object({
  caseId: z.string().trim().optional(),
  category: categorySchema,
  patientId: z.string().trim().min(1),
  title: z.string().trim().min(1).max(160),
});

const categoryMap = {
  angiography: "ANGIOGRAPHY",
  cardiac_ct: "CARDIAC_CT",
  cardiac_mri: "CARDIAC_MRI",
  cath_reports: "CATH_REPORTS",
  discharge_summary: "DISCHARGE_SUMMARY",
  ecg: "ECG",
  echocardiography: "ECHOCARDIOGRAPHY",
  holter: "HOLTER",
  laboratory_results: "LABORATORY_RESULTS",
  other: "OTHER",
  stress_ecg: "STRESS_ECG",
  surgery_reports: "SURGERY_REPORTS",
} as const;

function safeStoredName(originalName: string) {
  const ext = path.extname(originalName).toLowerCase();
  if (!allowedExtensions.has(ext)) {
    throw new AppError(400, "Unsupported document extension.", "INVALID_DOCUMENT_EXTENSION");
  }
  return `${Date.now()}-${randomUUID()}${ext}`;
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, documentRoot),
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
    if (!allowedMimeTypes.has(file.mimetype)) {
      cb(new AppError(400, "Unsupported document type.", "INVALID_DOCUMENT_TYPE"));
      return;
    }
    cb(null, true);
  },
  limits: { fileSize: 20 * 1024 * 1024 },
  storage,
});

export const documentsRouter = Router();

documentsRouter.use(requireAuth);

function serializeDocument(document: {
  caseId: string | null;
  category: string;
  createdAt: Date;
  id: string;
  mimeType: string;
  originalName: string;
  patientId: string;
  sizeBytes: number;
  storedName: string;
  title: string;
}) {
  return {
    caseId: document.caseId ?? undefined,
    category: document.category.toLowerCase(),
    createdAt: document.createdAt.toISOString(),
    downloadUrl: `/api/documents/${document.storedName}`,
    id: document.id,
    mimeType: document.mimeType,
    originalName: document.originalName,
    patientId: document.patientId,
    sizeBytes: document.sizeBytes,
    title: document.title,
  };
}

documentsRouter.get("/", async (req, res, next) => {
  try {
    const patientId = typeof req.query.patientId === "string" ? req.query.patientId : undefined;
    const caseId = typeof req.query.caseId === "string" ? req.query.caseId : undefined;
    const documents = await prisma.clinicalDocument.findMany({
      orderBy: { createdAt: "desc" },
      where: { caseId, patientId },
    });
    res.json({ documents: documents.map(serializeDocument) });
  } catch (error) {
    next(error);
  }
});

documentsRouter.get("/list", async (req, res, next) => {
  try {
    const patientId = typeof req.query.patientId === "string" ? req.query.patientId : undefined;
    const caseId = typeof req.query.caseId === "string" ? req.query.caseId : undefined;
    const documents = await prisma.clinicalDocument.findMany({
      include: { extraction: true, searchIndex: true },
      orderBy: { createdAt: "desc" },
      where: { caseId, patientId },
    });
    res.json({ documents: documents.map(serializeDocument) });
  } catch (error) {
    next(error);
  }
});

documentsRouter.get("/search", async (req, res, next) => {
  try {
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const organizationId = typeof req.query.organizationId === "string" ? req.query.organizationId : undefined;
    const indexes = await prisma.documentSearchIndex.findMany({
      include: { document: true },
      orderBy: { indexedAt: "desc" },
      take: 100,
      where: {
        ...(organizationId ? { organizationId } : {}),
        ...(q ? { searchText: { contains: q, mode: "insensitive" } } : {}),
      },
    });
    res.json({
      results: indexes.map((index) => ({
        document: serializeDocument(index.document),
        documentType: index.documentType.toLowerCase(),
        id: index.id,
        indexedAt: index.indexedAt.toISOString(),
        snippet: index.searchText.slice(0, 280),
      })),
    });
  } catch (error) {
    next(error);
  }
});

documentsRouter.post("/extract", requireRole("DOCTOR"), async (req, res, next) => {
  try {
    const body = z.object({ documentId: z.string().trim().min(1) }).parse(req.body);
    const { extraction } = await extractAndIndexDocument(body.documentId, req.auth!.id);
    res.json({ extraction: serializeExtraction(extraction) });
  } catch (error) {
    next(error);
  }
});

documentsRouter.get("/summary/:documentId", async (req, res, next) => {
  try {
    const extraction = await prisma.documentExtraction.findUnique({
      where: { documentId: String(req.params.documentId) },
    });
    res.json({ extraction: extraction ? serializeExtraction(extraction) : null });
  } catch (error) {
    next(error);
  }
});

documentsRouter.post("/index", requireRole("DOCTOR"), async (req, res, next) => {
  try {
    const body = z.object({ documentId: z.string().trim().min(1) }).parse(req.body);
    const { index } = await extractAndIndexDocument(body.documentId, req.auth!.id);
    res.json({ indexId: index.id, indexedAt: index.indexedAt.toISOString() });
  } catch (error) {
    next(error);
  }
});

documentsRouter.post("/", requireRole("DOCTOR"), upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) throw new AppError(400, "Clinical document file is required.", "FILE_REQUIRED");
    const body = uploadBodySchema.parse(req.body);
    const patient = await prisma.patient.findUnique({ where: { id: body.patientId } });
    if (!patient) {
      fs.rmSync(req.file.path, { force: true });
      throw new AppError(404, "Patient not found.", "PATIENT_NOT_FOUND");
    }
    if (body.caseId) {
      const ecgCase = await prisma.eCGCase.findUnique({ where: { id: body.caseId } });
      if (!ecgCase || ecgCase.patientId !== body.patientId) {
        fs.rmSync(req.file.path, { force: true });
        throw new AppError(404, "Linked ECG case not found for this patient.", "CASE_NOT_FOUND");
      }
    }

    const document = await prisma.clinicalDocument.create({
      data: {
        caseId: body.caseId,
        category: categoryMap[body.category],
        mimeType: req.file.mimetype,
        originalName: req.file.originalname,
        patientId: body.patientId,
        sizeBytes: req.file.size,
        storagePath: req.file.path,
        storedName: req.file.filename,
        title: body.title,
        uploadedById: req.auth!.id,
      },
    });
    const isEcho = document.category === "ECHOCARDIOGRAPHY";
    await prisma.timelineEvent.create({
      data: {
        caseId: document.caseId,
        metadata: { category: document.category, documentId: document.id },
        patientId: document.patientId,
        title: isEcho ? "Echo uploaded" : "Clinical document uploaded",
        type: isEcho ? "ECHO_UPLOADED" : "DOCUMENT_UPLOADED",
      },
    });
    await prisma.auditLog.create({
      data: {
        action: "DOCUMENT_UPLOADED",
        actorId: req.auth!.id,
        caseId: document.caseId,
        message: `Clinical document ${document.originalName} uploaded.`,
        metadata: { category: document.category, sizeBytes: document.sizeBytes },
        patientId: document.patientId,
      },
    });
    await extractAndIndexDocument(document.id, req.auth!.id).catch(() => null);
    res.status(201).json({ document: serializeDocument(document) });
  } catch (error) {
    next(error);
  }
});

documentsRouter.post("/upload", requireRole("DOCTOR"), upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) throw new AppError(400, "Clinical document file is required.", "FILE_REQUIRED");
    const body = uploadBodySchema.parse(req.body);
    const patient = await prisma.patient.findUnique({ where: { id: body.patientId } });
    if (!patient) {
      fs.rmSync(req.file.path, { force: true });
      throw new AppError(404, "Patient not found.", "PATIENT_NOT_FOUND");
    }
    const document = await prisma.clinicalDocument.create({
      data: {
        caseId: body.caseId,
        category: categoryMap[body.category],
        mimeType: req.file.mimetype,
        originalName: req.file.originalname,
        patientId: body.patientId,
        sizeBytes: req.file.size,
        storagePath: req.file.path,
        storedName: req.file.filename,
        title: body.title,
        uploadedById: req.auth!.id,
      },
    });
    const isEcho = document.category === "ECHOCARDIOGRAPHY";
    await prisma.timelineEvent.create({
      data: {
        caseId: document.caseId,
        metadata: { category: document.category, documentId: document.id },
        patientId: document.patientId,
        title: isEcho ? "Echo uploaded" : "Clinical document uploaded",
        type: isEcho ? "ECHO_UPLOADED" : "DOCUMENT_UPLOADED",
      },
    });
    await prisma.auditLog.create({
      data: {
        action: "DOCUMENT_UPLOADED",
        actorId: req.auth!.id,
        caseId: document.caseId,
        message: `Clinical document ${document.originalName} uploaded.`,
        metadata: { category: document.category, sizeBytes: document.sizeBytes },
        patientId: document.patientId,
      },
    });
    const { extraction } = await extractAndIndexDocument(document.id, req.auth!.id);
    res.status(201).json({ document: serializeDocument(document), extraction: serializeExtraction(extraction) });
  } catch (error) {
    next(error);
  }
});

documentsRouter.get("/:storedName", async (req, res, next) => {
  try {
    const storedName = path.basename(String(req.params.storedName));
    const document = await prisma.clinicalDocument.findFirst({ where: { storedName } });
    if (!document) throw new AppError(404, "Clinical document not found.", "DOCUMENT_NOT_FOUND");
    res.download(document.storagePath, document.originalName);
  } catch (error) {
    next(error);
  }
});
