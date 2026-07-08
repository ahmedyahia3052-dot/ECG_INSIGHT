import type { ClinicalOcrStructuredData } from "../../ocr/clinical-ocr.service";
import type { PipelineStageRecord } from "./pipeline-stage.types";

export type ClinicalDocumentModality =
  | "ecg"
  | "echo"
  | "lab"
  | "radiology"
  | "ct"
  | "mri"
  | "ultrasound"
  | "cath"
  | "pathology"
  | "prescription"
  | "clinical_photo"
  | "handwritten"
  | "general";

export type NormalizedMeasurement = {
  key: string;
  unit?: string;
  value: number | string;
};

export type NormalizedAttachmentContext = {
  attachmentId?: string;
  confidence: number;
  dates: string[];
  diagnoses: string[];
  documentType: string;
  extractedTextPreview: string;
  findings: string[];
  kind: string;
  measurements: NormalizedMeasurement[];
  mergedFrom?: string[];
  metadata: {
    mimeType: string;
    ocrEngine?: string;
    originalName: string;
    pageCount?: number;
    patientIdentifiers: string[];
    sizeBytes: number;
  };
  modality: ClinicalDocumentModality;
  numericalValues: Record<string, number | string>;
  ocrConfidence: number;
  pageReferences: string[];
  pipelineStages?: PipelineStageRecord[];
  processingStatus: "completed" | "failed" | "processing";
  recommendations: string[];
  structuredOcr?: ClinicalOcrStructuredData;
  summary: string;
  version: "11.1";
  warnings: string[];
};

export type AttachmentExtractionInput = {
  documentType: string;
  ecgMeasurements?: Record<string, unknown>;
  extractedText: string;
  kind: string;
  mimeType: string;
  originalName: string;
  sizeBytes: number;
  structuredOcr?: ClinicalOcrStructuredData;
};

export type AttachmentExtractionResult = {
  confidence: number;
  dates: string[];
  diagnoses: string[];
  findings: string[];
  measurements: NormalizedMeasurement[];
  modality: ClinicalDocumentModality;
  numericalValues: Record<string, number | string>;
  pageReferences: string[];
  patientIdentifiers: string[];
  recommendations: string[];
  summary: string;
  warnings: string[];
};
