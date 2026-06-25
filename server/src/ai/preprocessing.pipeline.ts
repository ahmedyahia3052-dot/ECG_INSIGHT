import path from "node:path";
import type { Prisma } from "@prisma/client";
import { AppError } from "../middleware/error";
import type { ECGPreprocessingArtifact } from "./domain";

const acceptedExtensions = new Set([".jpg", ".jpeg", ".png", ".pdf"]);

function acceptedFormat(originalName: string): ECGPreprocessingArtifact["acceptedFormat"] {
  const ext = path.extname(originalName).toLowerCase();
  if (!acceptedExtensions.has(ext)) {
    throw new AppError(400, "Unsupported ECG image/PDF format. Accepted formats: jpg, jpeg, png, pdf.", "UNSUPPORTED_ECG_INGESTION_FORMAT");
  }
  return ext.slice(1) as ECGPreprocessingArtifact["acceptedFormat"];
}

function sourceFor(format: ECGPreprocessingArtifact["acceptedFormat"], source?: string): ECGPreprocessingArtifact["source"] {
  if (source === "camera_capture" || source === "drag_and_drop" || source === "upload") return source;
  if (format === "pdf") return "pdf_upload";
  return "unknown";
}

export function assertSupportedIngestionFile(originalName: string) {
  return acceptedFormat(originalName);
}

export function isSupportedImageOrPdfIngestionFile(originalName: string) {
  return acceptedExtensions.has(path.extname(originalName).toLowerCase());
}

export function buildPreprocessingArtifact(
  originalName: string,
  sizeBytes: number,
  source?: string,
): ECGPreprocessingArtifact {
  const format = acceptedFormat(originalName);
  const qualityPenalty = Math.min(0.18, Math.max(0, sizeBytes - 5_000_000) / 80_000_000);
  const baseConfidence = format === "pdf" ? 0.91 : 0.94;

  return {
    acceptedFormat: format,
    operations: [
      { confidence: 0.93, name: "auto_crop", status: "simulated" },
      { confidence: format === "pdf" ? 0.89 : 0.92, name: "perspective_correction", status: format === "pdf" ? "not_required" : "simulated" },
      { confidence: 0.9, name: "deskew", status: "simulated" },
      { confidence: 0.94, name: "contrast_enhancement", status: "simulated" },
      { confidence: 0.88, name: "grid_cleanup", status: "simulated" },
      { confidence: 0.87, name: "shadow_removal", status: format === "pdf" ? "not_required" : "simulated" },
    ],
    qualityScore: Number(Math.max(0.72, baseConfidence - qualityPenalty).toFixed(2)),
    source: sourceFor(format, source),
  };
}

export function mergeEcgMetadata(
  existing: Prisma.JsonValue | null | undefined,
  preprocessing: ECGPreprocessingArtifact,
): Prisma.InputJsonObject {
  const current = existing && typeof existing === "object" && !Array.isArray(existing)
    ? existing as Prisma.JsonObject
    : {};

  return {
    ...current,
    ingestion: {
      acceptedFormats: ["jpg", "jpeg", "png", "pdf"],
      capturedAt: new Date().toISOString(),
      supportsCameraCapture: true,
      supportsDragAndDrop: true,
    },
    preprocessing: toJsonObject(preprocessing),
  };
}

export function toJsonObject(value: unknown): Prisma.InputJsonObject {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonObject;
}
