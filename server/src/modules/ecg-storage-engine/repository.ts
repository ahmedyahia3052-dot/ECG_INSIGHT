import { randomUUID } from "node:crypto";
import type { ECGFile, ECGFileVersion, Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import type { CreateEcgFileVersionInput, EcgFileStorageMetadata, EcgFileVersionRecord, UploadEcgFileInput } from "./types";

function toMetadata(file: ECGFile): EcgFileStorageMetadata {
  return {
    caseId: file.caseId,
    checksum: file.checksum,
    createdAt: file.createdAt.toISOString(),
    deletedAt: file.deletedAt?.toISOString() ?? null,
    fileType: file.fileType,
    id: file.id,
    metadataJson: file.metadataJson && typeof file.metadataJson === "object"
      ? file.metadataJson as Record<string, unknown>
      : null,
    mimeType: file.mimeType,
    organizationId: file.organizationId,
    originalName: file.originalName,
    patientId: file.patientId,
    recordUuid: file.recordUuid,
    sizeBytes: file.sizeBytes,
    storageKey: file.storageKey,
    storagePath: file.storagePath,
    storageProvider: file.storageProvider,
    storedName: file.storedName,
    uploadedById: file.uploadedById,
    version: file.version,
  };
}

function toVersionRecord(version: ECGFileVersion): EcgFileVersionRecord {
  return {
    checksum: version.checksum,
    createdAt: version.createdAt.toISOString(),
    createdById: version.createdById,
    ecgFileId: version.ecgFileId,
    id: version.id,
    mimeType: version.mimeType,
    originalName: version.originalName,
    sizeBytes: version.sizeBytes,
    storageKey: version.storageKey,
    version: version.version,
  };
}

export class EcgFileRepository {
  async findById(id: string, includeDeleted = false) {
    return prisma.eCGFile.findFirst({
      where: { deletedAt: includeDeleted ? undefined : null, id },
    });
  }

  async findByRecordUuid(recordUuid: string) {
    return prisma.eCGFile.findFirst({
      where: { deletedAt: null, recordUuid },
    });
  }

  async findByChecksum(checksum: string) {
    return prisma.eCGFile.findFirst({
      where: { checksum, deletedAt: null },
    });
  }

  async createUploadedFile(input: {
    upload: UploadEcgFileInput;
    storedName: string;
    storageKey: string;
    storagePath: string;
    storageProvider: string;
    checksum: string;
    fileType: string;
    recordUuid: string;
    organizationId?: string | null;
    metadataJson?: Prisma.InputJsonValue;
  }) {
    const file = await prisma.eCGFile.create({
      data: {
        caseId: input.upload.caseId,
        checksum: input.checksum,
        fileName: input.upload.originalName,
        fileType: input.fileType as never,
        metadataJson: input.metadataJson,
        mimeType: input.upload.mimeType,
        organizationId: input.organizationId ?? undefined,
        originalName: input.upload.originalName,
        patientId: input.upload.patientId,
        recordUuid: input.recordUuid,
        sizeBytes: input.upload.sizeBytes,
        storageKey: input.storageKey,
        storagePath: input.storagePath,
        storageProvider: input.storageProvider,
        storedName: input.storedName,
        storedPath: input.storagePath,
        uploadedById: input.upload.actorId,
        version: 1,
      },
    });

    await prisma.eCGFileVersion.create({
      data: {
        checksum: input.checksum,
        createdById: input.upload.actorId,
        ecgFileId: file.id,
        metadataJson: input.metadataJson,
        mimeType: input.upload.mimeType,
        originalName: input.upload.originalName,
        sizeBytes: input.upload.sizeBytes,
        storageKey: input.storageKey,
        storagePath: input.storagePath,
        version: 1,
      },
    });

    return file;
  }

  async appendVersion(input: {
    request: CreateEcgFileVersionInput;
    file: ECGFile;
    storageKey: string;
    storagePath: string;
    checksum: string;
    fileType: string;
    metadataJson?: Prisma.InputJsonValue;
  }) {
    const nextVersion = input.file.version + 1;
    const updated = await prisma.eCGFile.update({
      data: {
        checksum: input.checksum,
        fileName: input.request.originalName,
        fileType: input.fileType as never,
        metadataJson: input.metadataJson,
        mimeType: input.request.mimeType,
        originalName: input.request.originalName,
        sizeBytes: input.request.sizeBytes,
        storageKey: input.storageKey,
        storagePath: input.storagePath,
        storedPath: input.storagePath,
        version: nextVersion,
      },
      where: { id: input.file.id },
    });

    await prisma.eCGFileVersion.create({
      data: {
        checksum: input.checksum,
        createdById: input.request.actorId,
        ecgFileId: input.file.id,
        metadataJson: input.metadataJson,
        mimeType: input.request.mimeType,
        originalName: input.request.originalName,
        sizeBytes: input.request.sizeBytes,
        storageKey: input.storageKey,
        storagePath: input.storagePath,
        version: nextVersion,
      },
    });

    return updated;
  }

  async softDelete(id: string) {
    return prisma.eCGFile.update({
      data: { deletedAt: new Date() },
      where: { id },
    });
  }

  async listVersions(ecgFileId: string) {
    const versions = await prisma.eCGFileVersion.findMany({
      orderBy: { version: "desc" },
      where: { ecgFileId },
    });
    return versions.map(toVersionRecord);
  }

  serialize(file: ECGFile): EcgFileStorageMetadata {
    return toMetadata(file);
  }
}

export function createStoredName(originalName: string) {
  const ext = originalName.includes(".") ? originalName.slice(originalName.lastIndexOf(".")) : "";
  return `${Date.now()}-${randomUUID()}${ext.toLowerCase()}`;
}

export const ecgFileRepository = new EcgFileRepository();
