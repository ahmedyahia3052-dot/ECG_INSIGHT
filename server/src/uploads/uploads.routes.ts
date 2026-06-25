import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import multer from "multer";
import { Router } from "express";
import { prisma } from "../config/prisma";
import { buildPreprocessingArtifact, isSupportedImageOrPdfIngestionFile, mergeEcgMetadata, toJsonObject } from "../ai/preprocessing.pipeline";
import { queueAnalysis } from "../ai/ai.service";
import { assertCaseCanAcceptAnalysis } from "../cases/state-machine";
import { requireAuth, requireRole } from "../middleware/auth";
import { AppError } from "../middleware/error";
import { serializeFile } from "../utils/clinical";
import { createNotification } from "../utils/notifications";

const uploadRoot = path.resolve(process.cwd(), "uploads", "ecg");
fs.mkdirSync(uploadRoot, { recursive: true });

const allowedMimeTypes = new Set([
  "application/pdf",
  "application/json",
  "text/csv",
  "text/plain",
  "image/jpeg",
  "image/jpg",
  "image/png",
]);

const allowedExtensions = new Set([".csv", ".jpeg", ".jpg", ".json", ".pdf", ".png", ".txt"]);

function safeStoredName(originalName: string) {
  const ext = path.extname(originalName).toLowerCase();
  if (!allowedExtensions.has(ext)) {
    throw new AppError(400, "Unsupported ECG file extension.", "INVALID_FILE_EXTENSION");
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
    if (!allowedMimeTypes.has(file.mimetype)) {
      cb(new AppError(400, "Unsupported ECG file type.", "INVALID_FILE_TYPE"));
      return;
    }
    cb(null, true);
  },
  limits: { fileSize: 20 * 1024 * 1024 },
  storage,
});

export const uploadsRouter = Router();

uploadsRouter.post(
  "/ecg/:caseId",
  requireAuth,
  requireRole("DOCTOR"),
  upload.single("file"),
  async (req, res, next) => {
    try {
      if (!req.file) {
        throw new AppError(400, "ECG file is required.", "FILE_REQUIRED");
      }

      const ecgCase = await prisma.eCGCase.findUnique({
        where: { id: String(req.params.caseId) },
      });
      if (!ecgCase) {
        fs.rmSync(req.file.path, { force: true });
        throw new AppError(404, "ECG case not found.", "CASE_NOT_FOUND");
      }
      try {
        assertCaseCanAcceptAnalysis(ecgCase);
      } catch (error) {
        fs.rmSync(req.file.path, { force: true });
        throw error;
      }

      const preprocessing = isSupportedImageOrPdfIngestionFile(req.file.originalname)
        ? buildPreprocessingArtifact(req.file.originalname, req.file.size, String(req.body?.source ?? "upload"))
        : null;
      const file = await prisma.eCGFile.create({
        data: {
          caseId: ecgCase.id,
          fileType: preprocessing ? (req.file.mimetype === "application/pdf" ? "PDF_REPORT" : "IMAGE") : "UNKNOWN",
          metadataJson: preprocessing ? mergeEcgMetadata(null, preprocessing) : undefined,
          mimeType: req.file.mimetype,
          originalName: req.file.originalname,
          sizeBytes: req.file.size,
          storagePath: req.file.path,
          storedName: req.file.filename,
          uploadedById: req.auth!.id,
        },
      });

      await prisma.auditLog.create({
        data: {
          action: "ECG_UPLOADED",
          actorId: req.auth!.id,
          caseId: ecgCase.id,
          message: `ECG file ${file.originalName} uploaded to case ${ecgCase.caseId}.`,
          metadata: {
            mimeType: file.mimeType,
            preprocessing: preprocessing ? toJsonObject(preprocessing) : null,
            sizeBytes: file.sizeBytes,
            storedName: file.storedName,
          },
          patientId: ecgCase.patientId,
        },
      });
      await prisma.timelineEvent.create({
        data: {
          caseId: ecgCase.id,
          metadata: { fileId: file.id, storedName: file.storedName },
          patientId: ecgCase.patientId,
          title: "ECG uploaded",
          type: "ECG_UPLOADED",
        },
      });

      await createNotification({
        caseId: ecgCase.id,
        message: `A new ECG file was uploaded for case ${ecgCase.caseId}.`,
        targetRole: "DOCTOR",
        title: "ECG Upload Complete",
        type: ecgCase.priority === "CRITICAL" ? "CRITICAL" : "SUCCESS",
      });
      await queueAnalysis(ecgCase.id, req.auth!.id);

      res.status(201).json({ file: serializeFile(file) });
    } catch (error) {
      next(error);
    }
  },
);

uploadsRouter.get("/ecg/:storedName", requireAuth, async (req, res, next) => {
  try {
    const storedName = path.basename(String(req.params.storedName));
    const file = await prisma.eCGFile.findFirst({ where: { storedName } });
    if (!file) {
      throw new AppError(404, "ECG file not found.", "FILE_NOT_FOUND");
    }
    res.download(file.storagePath, file.originalName);
  } catch (error) {
    next(error);
  }
});
