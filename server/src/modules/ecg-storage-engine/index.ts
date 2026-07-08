export {
  ECG_STORAGE_ENGINE_ID,
  ECG_STORAGE_ENGINE_VERSION,
} from "./types";
export type {
  CreateEcgFileVersionInput,
  EcgFileStorageMetadata,
  EcgFileVersionRecord,
  EcgStorageFormat,
  EcgStorageProviderKind,
  StorageProvider,
  UploadEcgFileInput,
} from "./types";

export {
  assertEcgStorageMagicBytes,
  assertSupportedEcgStorageFormat,
  buildStorageKey,
  mapFormatToFileType,
  resolveEcgStorageFormat,
  SUPPORTED_ECG_STORAGE_EXTENSIONS,
  SUPPORTED_ECG_STORAGE_MIME_TYPES,
} from "./formats";

export { getLocalStorageRoot, LocalStorageProvider } from "./providers/local.provider";
export { S3CompatibleStorageProvider } from "./providers/s3.provider";
export { resolveStorageProvider, resetStorageProviderCache } from "./providers";

export { EcgFileRepository, createStoredName, ecgFileRepository } from "./repository";

export {
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

export { ecgStorageEngineRouter } from "./ecg-storage-engine.routes";
