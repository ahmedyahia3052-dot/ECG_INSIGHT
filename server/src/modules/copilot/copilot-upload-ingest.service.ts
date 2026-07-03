import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import AdmZip from "adm-zip";
import dicomParser from "dicom-parser";
import type { ClinicalOcrStructuredData } from "../ocr/clinical-ocr.service";

export type IngestedUploadFile = {
  extractedFrom?: "dicom" | "zip";
  mimeType: string;
  originalName: string;
  sizeBytes: number;
  storagePath: string;
};

const supportedInnerExtensions = new Set([".png", ".jpg", ".jpeg", ".pdf", ".txt", ".csv", ".dcm", ".dicom"]);

export function extractZipUpload(zipPath: string, destinationDir: string): IngestedUploadFile[] {
  fs.mkdirSync(destinationDir, { recursive: true });
  const zip = new AdmZip(zipPath);
  const entries = zip.getEntries().filter((entry) => !entry.isDirectory && supportedInnerExtensions.has(path.extname(entry.entryName).toLowerCase()));
  if (!entries.length) {
    throw new Error("ZIP package does not contain a supported clinical file.");
  }

  return entries.slice(0, 8).map((entry) => {
    const ext = path.extname(entry.entryName).toLowerCase();
    const storedName = `${Date.now()}-${randomUUID()}${ext}`;
    const storagePath = path.join(destinationDir, storedName);
    fs.writeFileSync(storagePath, entry.getData());
    return {
      extractedFrom: "zip" as const,
      mimeType: mimeFromExtension(ext),
      originalName: path.basename(entry.entryName),
      sizeBytes: entry.header.size,
      storagePath,
    };
  });
}

function mimeFromExtension(ext: string) {
  switch (ext) {
    case ".pdf": return "application/pdf";
    case ".png": return "image/png";
    case ".jpg":
    case ".jpeg": return "image/jpeg";
    case ".txt": return "text/plain";
    case ".csv": return "text/csv";
    case ".dcm":
    case ".dicom": return "application/dicom";
    default: return "application/octet-stream";
  }
}

export function parseDicomMetadata(filePath: string): Partial<ClinicalOcrStructuredData> & { modality?: string; patientId?: string } {
  const buffer = fs.readFileSync(filePath);
  let dataSet;
  try {
    dataSet = dicomParser.parseDicom(buffer);
  } catch {
    return {};
  }

  const patientName = dataSet.string("x00100010")?.replace(/\^/g, " ").trim();
  const patientId = dataSet.string("x00100020")?.trim();
  const studyDate = dataSet.string("x00080020")?.trim();
  const institution = dataSet.string("x00080080")?.trim();
  const modality = dataSet.string("x00080060")?.trim();
  const ageRaw = dataSet.string("x00101010")?.trim();
  const age = ageRaw?.match(/(\d{1,3})/)?.[1];

  return {
    age: age ? Number(age) : undefined,
    hospital: institution,
    measurements: {},
    modality,
    patientId,
    patientName,
    studyDate,
  };
}

export function isZipUpload(originalName: string, mimeType: string) {
  const ext = path.extname(originalName).toLowerCase();
  return ext === ".zip" || mimeType === "application/zip" || mimeType === "application/x-zip-compressed";
}

export function isDicomUpload(originalName: string, mimeType: string) {
  const ext = path.extname(originalName).toLowerCase();
  return ext === ".dcm" || ext === ".dicom" || mimeType === "application/dicom";
}
