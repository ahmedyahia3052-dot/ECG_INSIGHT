export const ECG_STORAGE_ENGINE_VERSION = "sprint85-ecg-storage-v1" as const;
export const ECG_STORAGE_ENGINE_ID = "ecg-insight-ecg-storage-engine" as const;

export type EcgStorageProviderKind = "local" | "s3";

export type EcgStorageFormat = "png" | "jpeg" | "pdf" | "dicom";

export interface StorageObjectRef {
  key: string;
  provider: EcgStorageProviderKind;
  absolutePath?: string;
}

export interface StoragePutInput {
  key: string;
  sourcePath: string;
  mimeType: string;
  sizeBytes: number;
}

export interface StorageHeadResult {
  exists: boolean;
  key: string;
  sizeBytes?: number;
  mimeType?: string;
}

export interface StorageProvider {
  readonly kind: EcgStorageProviderKind;
  put(input: StoragePutInput): Promise<StorageObjectRef>;
  getPath(key: string): Promise<string>;
  delete(key: string): Promise<void>;
  head(key: string): Promise<StorageHeadResult>;
}

export interface EcgFileStorageMetadata {
  id: string;
  recordUuid: string | null;
  caseId: string | null;
  patientId: string | null;
  organizationId: string | null;
  originalName: string;
  storedName: string;
  mimeType: string;
  fileType: string;
  sizeBytes: number;
  checksum: string | null;
  storageProvider: string;
  storageKey: string | null;
  storagePath: string;
  version: number;
  uploadedById: string;
  createdAt: string;
  deletedAt: string | null;
  metadataJson: Record<string, unknown> | null;
}

export interface EcgFileVersionRecord {
  id: string;
  ecgFileId: string;
  version: number;
  storageKey: string;
  checksum: string;
  sizeBytes: number;
  mimeType: string;
  originalName: string;
  createdAt: string;
  createdById: string;
}

export interface UploadEcgFileInput {
  actorId: string;
  caseId?: string;
  patientId: string;
  sourcePath: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  metadata?: Record<string, unknown>;
}

export interface CreateEcgFileVersionInput {
  actorId: string;
  ecgFileId: string;
  sourcePath: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  metadata?: Record<string, unknown>;
}
