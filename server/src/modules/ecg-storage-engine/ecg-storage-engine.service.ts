import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { env } from "../../config/env";
import { AppError } from "../../middleware/error";
import { createSignedDownloadToken, sha256File, verifySignedDownloadToken } from "../../utils/file-security";
import { assertResourceAccess, canAccessCase, canAccessPatient } from "../../utils/resource-access";
import {
  assertEcgStorageMagicBytes,
  assertSupportedEcgStorageFormat,
  buildStorageKey,
  mapFormatToFileType,
} from "./formats";
import { resolveStorageProvider } from "./providers";
import { createStoredName, ecgFileRepository } from "./repository";
import { ECG_STORAGE_ENGINE_ID, ECG_STORAGE_ENGINE_VERSION } from "./types";
import type { CreateEcgFileVersionInput, UploadEcgFileInput } from "./types";

type AuthContext = { id: string; role: string };

export function getEcgStorageEngineStatus() {
  const provider = resolveStorageProvider();
  return {
    engineId: ECG_STORAGE_ENGINE_ID,
    maxBytes: env.ECG_STORAGE_MAX_BYTES,
    provider: provider.kind,
    storagePath: env.STORAGE_PATH,
    version: ECG_STORAGE_ENGINE_VERSION,
  };
}

async function assertPatientAccess(patientId: string, auth: AuthContext) {
  const patient = await prisma.patient.findUnique({ where: { id: patientId } });
  if (!patient) throw new AppError(404, "Patient not found.", "PATIENT_NOT_FOUND");
  assertResourceAccess(await canAccessPatient(patient.id, auth as never));
  return patient;
}

async function assertFileAccess(file: { caseId: string | null; patientId: string | null; uploadedById: string }, auth: AuthContext) {
  if (auth.role === "SUPER_ADMIN" || auth.role === "ADMIN") return;
  const allowed =
    file.uploadedById === auth.id ||
    (file.patientId ? await canAccessPatient(file.patientId, auth as never) : false) ||
    (file.caseId ? await canAccessCase(file.caseId, auth as never) : false);
  assertResourceAccess(allowed, "You do not have access to this ECG file.");
}

export async function uploadEcgFile(input: UploadEcgFileInput) {
  if (input.sizeBytes > env.ECG_STORAGE_MAX_BYTES) {
    throw new AppError(413, "ECG file exceeds maximum storage size.", "ECG_FILE_TOO_LARGE");
  }

  assertSupportedEcgStorageFormat(input.originalName, input.mimeType);
  assertEcgStorageMagicBytes(input.sourcePath, input.originalName, input.mimeType);

  const patient = await prisma.patient.findUnique({ where: { id: input.patientId } });
  if (!patient) throw new AppError(404, "Patient not found.", "PATIENT_NOT_FOUND");

  if (input.caseId) {
    const ecgCase = await prisma.eCGCase.findUnique({ where: { id: input.caseId } });
    if (!ecgCase || ecgCase.patientId !== patient.id) {
      throw new AppError(404, "Linked ECG case not found for this patient.", "CASE_NOT_FOUND");
    }
  }

  const checksum = await sha256File(input.sourcePath);
  const existing = await ecgFileRepository.findByChecksum(checksum);
  if (existing) {
    return { deduplicated: true as const, file: ecgFileRepository.serialize(existing) };
  }

  const provider = resolveStorageProvider();
  const storedName = createStoredName(input.originalName);
  const storageKey = buildStorageKey(input.patientId, storedName);
  const stored = await provider.put({
    key: storageKey,
    mimeType: input.mimeType,
    sizeBytes: input.sizeBytes,
    sourcePath: input.sourcePath,
  });
  const storagePath = stored.absolutePath ?? (await provider.getPath(storageKey));
  const format = assertSupportedEcgStorageFormat(input.originalName, input.mimeType);
  const metadataJson = {
    ...(input.metadata ?? {}),
    storageEngine: ECG_STORAGE_ENGINE_VERSION,
  } satisfies Prisma.InputJsonObject;

  const file = await ecgFileRepository.createUploadedFile({
    checksum,
    fileType: mapFormatToFileType(format),
    metadataJson,
    organizationId: patient.organizationId,
    recordUuid: randomUUID(),
    storageKey,
    storagePath,
    storageProvider: provider.kind,
    storedName,
    upload: input,
  });

  return { deduplicated: false as const, file: ecgFileRepository.serialize(file) };
}

export async function createEcgFileVersion(input: CreateEcgFileVersionInput) {
  const file = await ecgFileRepository.findById(input.ecgFileId);
  if (!file) throw new AppError(404, "ECG file not found.", "ECG_FILE_NOT_FOUND");

  assertSupportedEcgStorageFormat(input.originalName, input.mimeType);
  assertEcgStorageMagicBytes(input.sourcePath, input.originalName, input.mimeType);

  const checksum = await sha256File(input.sourcePath);
  const provider = resolveStorageProvider();
  const storedName = createStoredName(input.originalName);
  const storageKey = buildStorageKey(file.patientId ?? "unknown", storedName);
  const stored = await provider.put({
    key: storageKey,
    mimeType: input.mimeType,
    sizeBytes: input.sizeBytes,
    sourcePath: input.sourcePath,
  });
  const storagePath = stored.absolutePath ?? (await provider.getPath(storageKey));
  const format = assertSupportedEcgStorageFormat(input.originalName, input.mimeType);

  const updated = await ecgFileRepository.appendVersion({
    checksum,
    file,
    fileType: mapFormatToFileType(format),
    metadataJson: {
      ...(input.metadata ?? {}),
      storageEngine: ECG_STORAGE_ENGINE_VERSION,
    },
    request: input,
    storageKey,
    storagePath,
  });

  return ecgFileRepository.serialize(updated);
}

export async function getEcgFileMetadata(ecgFileId: string, auth: AuthContext) {
  const file = await ecgFileRepository.findById(ecgFileId);
  if (!file) throw new AppError(404, "ECG file not found.", "ECG_FILE_NOT_FOUND");
  await assertFileAccess(file, auth);
  const versions = await ecgFileRepository.listVersions(file.id);
  return { file: ecgFileRepository.serialize(file), versions };
}

export async function resolveEcgFileDownloadPath(ecgFileId: string, auth: AuthContext, version?: number) {
  const file = await ecgFileRepository.findById(ecgFileId);
  if (!file) throw new AppError(404, "ECG file not found.", "ECG_FILE_NOT_FOUND");
  await assertFileAccess(file, auth);

  if (!version || version === file.version) {
    const provider = resolveStorageProvider();
    if (file.storageKey) {
      return provider.getPath(file.storageKey);
    }
    return file.storagePath;
  }

  const versionRow = await prisma.eCGFileVersion.findUnique({
    where: { ecgFileId_version: { ecgFileId: file.id, version } },
  });
  if (!versionRow) throw new AppError(404, "ECG file version not found.", "ECG_FILE_VERSION_NOT_FOUND");

  const provider = resolveStorageProvider();
  return versionRow.storagePath ?? provider.getPath(versionRow.storageKey);
}

export async function createEcgFileSignedUrl(ecgFileId: string, auth: AuthContext, expiresInSeconds = 300) {
  const downloadPath = await resolveEcgFileDownloadPath(ecgFileId, auth);
  return {
    expiresInSeconds,
    token: createSignedDownloadToken(downloadPath, expiresInSeconds),
  };
}

export function resolveSignedDownloadPath(token: string) {
  const pathValue = verifySignedDownloadToken(token);
  if (!pathValue) {
    throw new AppError(401, "Signed download token is invalid or expired.", "SIGNED_URL_INVALID");
  }
  return pathValue;
}

export async function deleteEcgFile(ecgFileId: string, auth: AuthContext) {
  const file = await ecgFileRepository.findById(ecgFileId);
  if (!file) throw new AppError(404, "ECG file not found.", "ECG_FILE_NOT_FOUND");
  await assertFileAccess(file, auth);

  const provider = resolveStorageProvider();
  const keys = new Set<string>();
  if (file.storageKey) keys.add(file.storageKey);

  const versions = await prisma.eCGFileVersion.findMany({ where: { ecgFileId: file.id } });
  for (const version of versions) keys.add(version.storageKey);

  for (const key of keys) {
    await provider.delete(key).catch(() => undefined);
  }

  if (file.storagePath && fs.existsSync(file.storagePath)) {
    fs.rmSync(file.storagePath, { force: true });
  }

  await ecgFileRepository.softDelete(file.id);

  await prisma.auditLog.create({
    data: {
      action: "ECG_FILE_DELETED",
      actorId: auth.id,
      caseId: file.caseId,
      entityId: file.id,
      entityType: "ECGFile",
      message: `ECG storage file ${file.originalName} deleted.`,
      metadata: { checksum: file.checksum, storageProvider: file.storageProvider, version: file.version },
      patientId: file.patientId,
    },
  });

  return { deleted: true, id: file.id };
}

export async function verifyEcgFileChecksum(ecgFileId: string, auth: AuthContext) {
  const file = await ecgFileRepository.findById(ecgFileId);
  if (!file || !file.checksum) throw new AppError(404, "ECG file not found.", "ECG_FILE_NOT_FOUND");
  await assertFileAccess(file, auth);

  const downloadPath = await resolveEcgFileDownloadPath(file.id, auth);
  const checksum = await sha256File(downloadPath);
  return {
    checksum,
    id: file.id,
    storedChecksum: file.checksum,
    valid: checksum === file.checksum,
  };
}

export { assertPatientAccess };
