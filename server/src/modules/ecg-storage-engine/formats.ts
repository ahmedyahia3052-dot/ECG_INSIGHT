import fs from "node:fs";
import path from "node:path";
import { AppError } from "../../middleware/error";
import type { EcgStorageFormat } from "./types";

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const JPEG_MAGIC = Buffer.from([0xff, 0xd8, 0xff]);
const PDF_MAGIC = Buffer.from("%PDF");

export const SUPPORTED_ECG_STORAGE_MIME_TYPES = new Set([
  "application/dicom",
  "application/octet-stream",
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
]);

export const SUPPORTED_ECG_STORAGE_EXTENSIONS = new Set([
  ".dcm",
  ".dicom",
  ".jpeg",
  ".jpg",
  ".pdf",
  ".png",
]);

const EXTENSION_TO_FORMAT: Record<string, EcgStorageFormat> = {
  ".dcm": "dicom",
  ".dicom": "dicom",
  ".jpeg": "jpeg",
  ".jpg": "jpeg",
  ".pdf": "pdf",
  ".png": "png",
};

const MIME_TO_FORMAT: Record<string, EcgStorageFormat> = {
  "application/dicom": "dicom",
  "application/octet-stream": "dicom",
  "application/pdf": "pdf",
  "image/jpeg": "jpeg",
  "image/jpg": "jpeg",
  "image/png": "png",
};

export function resolveEcgStorageFormat(originalName: string, mimeType: string): EcgStorageFormat | null {
  const ext = path.extname(originalName).toLowerCase();
  return EXTENSION_TO_FORMAT[ext] ?? MIME_TO_FORMAT[mimeType] ?? null;
}

export function assertSupportedEcgStorageFormat(originalName: string, mimeType: string) {
  const ext = path.extname(originalName).toLowerCase();
  if (!SUPPORTED_ECG_STORAGE_EXTENSIONS.has(ext) && !SUPPORTED_ECG_STORAGE_MIME_TYPES.has(mimeType)) {
    throw new AppError(400, "Unsupported ECG storage format. Allowed: PNG, JPEG, PDF, DICOM.", "UNSUPPORTED_ECG_FORMAT");
  }
  const format = resolveEcgStorageFormat(originalName, mimeType);
  if (!format) {
    throw new AppError(400, "Could not resolve ECG storage format.", "UNSUPPORTED_ECG_FORMAT");
  }
  return format;
}

function isDicomBuffer(header: Buffer, ext: string) {
  if (ext === ".dcm" || ext === ".dicom") return true;
  if (header.length >= 132) {
    return header.subarray(128, 132).toString("ascii") === "DICM";
  }
  return false;
}

export function assertEcgStorageMagicBytes(filePath: string, originalName: string, mimeType: string) {
  const format = assertSupportedEcgStorageFormat(originalName, mimeType);
  const header = fs.readFileSync(filePath).subarray(0, 132);
  const ext = path.extname(originalName).toLowerCase();

  switch (format) {
    case "png":
      if (!header.subarray(0, PNG_MAGIC.length).equals(PNG_MAGIC)) {
        throw new AppError(400, "File content does not match PNG format.", "INVALID_FILE_CONTENT");
      }
      break;
    case "jpeg":
      if (!header.subarray(0, JPEG_MAGIC.length).equals(JPEG_MAGIC)) {
        throw new AppError(400, "File content does not match JPEG format.", "INVALID_FILE_CONTENT");
      }
      break;
    case "pdf":
      if (!header.subarray(0, PDF_MAGIC.length).equals(PDF_MAGIC)) {
        throw new AppError(400, "File content does not match PDF format.", "INVALID_FILE_CONTENT");
      }
      break;
    case "dicom":
      if (!isDicomBuffer(header, ext)) {
        throw new AppError(400, "File content does not match DICOM format.", "INVALID_FILE_CONTENT");
      }
      break;
    default:
      throw new AppError(400, "Unsupported ECG storage format.", "UNSUPPORTED_ECG_FORMAT");
  }
}

export function mapFormatToFileType(format: EcgStorageFormat) {
  switch (format) {
    case "pdf":
      return "PDF_REPORT" as const;
    case "dicom":
      return "DICOM_ECG" as const;
    case "png":
    case "jpeg":
      return "IMAGE" as const;
  }
}

export function buildStorageKey(patientId: string, storedName: string) {
  return path.posix.join("ecg", patientId, storedName);
}
