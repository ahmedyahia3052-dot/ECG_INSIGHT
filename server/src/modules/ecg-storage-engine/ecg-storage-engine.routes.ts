import fs from "node:fs";
import path from "node:path";
import multer from "multer";
import os from "node:os";
import { Router } from "express";
import { env } from "../../config/env";
import { requireAuth, requireRole } from "../../middleware/auth";
import { AppError } from "../../middleware/error";
import {
  assertPatientAccess,
  createEcgFileSignedUrl,
  createEcgFileVersion,
  deleteEcgFile,
  getEcgFileMetadata,
  getEcgStorageEngineStatus,
  resolveEcgFileDownloadPath,
  resolveSignedDownloadPath,
  uploadEcgFile,
  verifyEcgFileChecksum,
} from "./ecg-storage-engine.service";
import {
  assertSupportedEcgStorageFormat,
  SUPPORTED_ECG_STORAGE_EXTENSIONS,
  SUPPORTED_ECG_STORAGE_MIME_TYPES,
} from "./formats";
import {
  createVersionBodySchema,
  ecgFileIdParamsSchema,
  signedDownloadQuerySchema,
  signedUrlBodySchema,
  uploadEcgStorageBodySchema,
  versionQuerySchema,
} from "./schemas";

const tempRoot = path.join(os.tmpdir(), "ecg-storage-uploads");
fs.mkdirSync(tempRoot, { recursive: true });

const upload = multer({
  dest: tempRoot,
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!SUPPORTED_ECG_STORAGE_MIME_TYPES.has(file.mimetype) && !SUPPORTED_ECG_STORAGE_EXTENSIONS.has(ext)) {
      cb(new AppError(400, "Unsupported ECG storage format.", "UNSUPPORTED_ECG_FORMAT"));
      return;
    }
    cb(null, true);
  },
  limits: { fileSize: env.ECG_STORAGE_MAX_BYTES },
});

export const ecgStorageEngineRouter = Router();

ecgStorageEngineRouter.get("/health", (_req, res) => {
  res.json(getEcgStorageEngineStatus());
});

ecgStorageEngineRouter.get("/download", async (req, res, next) => {
  try {
    const query = signedDownloadQuerySchema.parse(req.query);
    const downloadPath = resolveSignedDownloadPath(query.token);
    const fileName = path.basename(downloadPath);
    res.download(downloadPath, fileName);
  } catch (error) {
    next(error);
  }
});

ecgStorageEngineRouter.use(requireAuth);

ecgStorageEngineRouter.post(
  "/upload",
  requireRole("DOCTOR"),
  upload.single("file"),
  async (req, res, next) => {
    try {
      if (!req.file) throw new AppError(400, "ECG file is required.", "FILE_REQUIRED");
      const body = uploadEcgStorageBodySchema.parse(req.body);
      await assertPatientAccess(body.patientId, req.auth!);
      assertSupportedEcgStorageFormat(req.file.originalname, req.file.mimetype);

      const result = await uploadEcgFile({
        actorId: req.auth!.id,
        caseId: body.caseId,
        originalName: req.file.originalname,
        patientId: body.patientId,
        sizeBytes: req.file.size,
        sourcePath: req.file.path,
        mimeType: req.file.mimetype,
      });

      fs.rmSync(req.file.path, { force: true });
      res.status(result.deduplicated ? 200 : 201).json(result);
    } catch (error) {
      if (req.file?.path) fs.rmSync(req.file.path, { force: true });
      next(error);
    }
  },
);

ecgStorageEngineRouter.get("/files/:ecgFileId/metadata", async (req, res, next) => {
  try {
    const params = ecgFileIdParamsSchema.parse(req.params);
    const metadata = await getEcgFileMetadata(params.ecgFileId, req.auth!);
    res.json(metadata);
  } catch (error) {
    next(error);
  }
});

ecgStorageEngineRouter.get("/files/:ecgFileId/download", async (req, res, next) => {
  try {
    const params = ecgFileIdParamsSchema.parse(req.params);
    const query = versionQuerySchema.parse(req.query);
    const file = await getEcgFileMetadata(params.ecgFileId, req.auth!);
    const downloadPath = await resolveEcgFileDownloadPath(params.ecgFileId, req.auth!, query.version);
    res.download(downloadPath, file.file.originalName);
  } catch (error) {
    next(error);
  }
});

ecgStorageEngineRouter.post("/files/:ecgFileId/signed-url", async (req, res, next) => {
  try {
    const params = ecgFileIdParamsSchema.parse(req.params);
    const body = signedUrlBodySchema.parse({ ...req.body, ecgFileId: params.ecgFileId });
    const signed = await createEcgFileSignedUrl(params.ecgFileId, req.auth!, body.expiresInSeconds);
    res.json(signed);
  } catch (error) {
    next(error);
  }
});

ecgStorageEngineRouter.post(
  "/files/:ecgFileId/version",
  requireRole("DOCTOR"),
  upload.single("file"),
  async (req, res, next) => {
    try {
      if (!req.file) throw new AppError(400, "ECG file is required.", "FILE_REQUIRED");
      const params = ecgFileIdParamsSchema.parse(req.params);
      createVersionBodySchema.parse({ ecgFileId: params.ecgFileId });
      assertSupportedEcgStorageFormat(req.file.originalname, req.file.mimetype);

      const file = await createEcgFileVersion({
        actorId: req.auth!.id,
        ecgFileId: params.ecgFileId,
        mimeType: req.file.mimetype,
        originalName: req.file.originalname,
        sizeBytes: req.file.size,
        sourcePath: req.file.path,
      });

      fs.rmSync(req.file.path, { force: true });
      res.status(201).json({ file });
    } catch (error) {
      if (req.file?.path) fs.rmSync(req.file.path, { force: true });
      next(error);
    }
  },
);

ecgStorageEngineRouter.get("/files/:ecgFileId/checksum", async (req, res, next) => {
  try {
    const params = ecgFileIdParamsSchema.parse(req.params);
    const result = await verifyEcgFileChecksum(params.ecgFileId, req.auth!);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

ecgStorageEngineRouter.delete("/files/:ecgFileId", requireRole("DOCTOR"), async (req, res, next) => {
  try {
    const params = ecgFileIdParamsSchema.parse(req.params);
    const result = await deleteEcgFile(params.ecgFileId, req.auth!);
    res.json(result);
  } catch (error) {
    next(error);
  }
});
