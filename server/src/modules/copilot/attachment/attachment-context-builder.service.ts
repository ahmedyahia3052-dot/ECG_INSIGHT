import type { AttachmentForAnalysis } from "../copilot-types";
import type { PipelineStageRecord } from "./pipeline-stage.types";
import type { ClinicalOcrStructuredData } from "../../ocr/clinical-ocr.service";
import { medicalExtractorRegistry } from "../extractors/registry";
import { classifyDocumentType } from "../extractors/document-classifier";
import type { AttachmentExtractionInput, NormalizedAttachmentContext } from "./types";

const OCR_PREVIEW_LIMIT = 2500;

export type BuildAttachmentContextInput = {
  attachmentId?: string;
  documentType: string;
  ecgMeasurements?: Record<string, unknown>;
  extractedText: string;
  kind: string;
  mimeType: string;
  originalName: string;
  pipelineStages?: PipelineStageRecord[];
  processingStatus?: NormalizedAttachmentContext["processingStatus"];
  sizeBytes: number;
  structuredOcr?: ClinicalOcrStructuredData;
};

function mergeFindings(items: string[]) {
  return Array.from(new Set(items.map((item) => item.trim()).filter(Boolean)));
}

export function buildNormalizedAttachmentContext(input: BuildAttachmentContextInput): NormalizedAttachmentContext {
  const extractionInput: AttachmentExtractionInput = {
    documentType: input.documentType,
    ecgMeasurements: input.ecgMeasurements,
    extractedText: input.extractedText,
    kind: input.kind,
    mimeType: input.mimeType,
    originalName: input.originalName,
    sizeBytes: input.sizeBytes,
    structuredOcr: input.structuredOcr,
  };

  const documentType = input.documentType || classifyDocumentType({
    kind: input.kind,
    mimeType: input.mimeType,
    originalName: input.originalName,
    text: input.extractedText,
  });

  const extracted = medicalExtractorRegistry.extract({ ...extractionInput, documentType });
  const ocrConfidence = input.structuredOcr?.confidence ?? extracted.confidence;

  return {
    attachmentId: input.attachmentId,
    confidence: Math.max(extracted.confidence, ocrConfidence),
    dates: extracted.dates,
    diagnoses: extracted.diagnoses,
    documentType,
    extractedTextPreview: input.extractedText.slice(0, OCR_PREVIEW_LIMIT),
    findings: mergeFindings(extracted.findings),
    kind: input.kind,
    measurements: extracted.measurements,
    metadata: {
      mimeType: input.mimeType,
      ocrEngine: input.structuredOcr?.engine,
      originalName: input.originalName,
      patientIdentifiers: extracted.patientIdentifiers,
      sizeBytes: input.sizeBytes,
    },
    modality: extracted.modality,
    numericalValues: extracted.numericalValues,
    ocrConfidence,
    pageReferences: extracted.pageReferences,
    pipelineStages: input.pipelineStages,
    processingStatus: input.processingStatus ?? "completed",
    recommendations: mergeFindings(extracted.recommendations),
    structuredOcr: input.structuredOcr,
    summary: extracted.summary,
    version: "11.1",
    warnings: mergeFindings(extracted.warnings),
  };
}

export function mergeAttachmentContexts(contexts: NormalizedAttachmentContext[]): NormalizedAttachmentContext | null {
  if (!contexts.length) return null;
  if (contexts.length === 1) return contexts[0];

  const mergedFindings = mergeFindings(contexts.flatMap((item) => item.findings));
  const mergedWarnings = mergeFindings(contexts.flatMap((item) => item.warnings));
  const mergedRecommendations = mergeFindings(contexts.flatMap((item) => item.recommendations));
  const lowestConfidence = Math.min(...contexts.map((item) => item.confidence));

  return {
    ...contexts[0],
    confidence: lowestConfidence,
    dates: mergeFindings(contexts.flatMap((item) => item.dates)),
    diagnoses: mergeFindings(contexts.flatMap((item) => item.diagnoses)),
    extractedTextPreview: contexts.map((item) => `[${item.metadata.originalName}] ${item.extractedTextPreview}`).join("\n\n").slice(0, OCR_PREVIEW_LIMIT),
    findings: mergedFindings,
    measurements: contexts.flatMap((item) => item.measurements),
    mergedFrom: contexts.map((item) => item.metadata.originalName),
    recommendations: mergedRecommendations,
    summary: `Merged clinical context from ${contexts.length} files: ${mergedFindings.slice(0, 4).join("; ")}`,
    warnings: mergedWarnings,
  };
}

export function readStoredNormalizedContext(attachment: AttachmentForAnalysis): NormalizedAttachmentContext | null {
  const medicalAnalysis = attachment.medicalAnalysis;
  if (!medicalAnalysis || typeof medicalAnalysis !== "object" || Array.isArray(medicalAnalysis)) return null;
  const normalized = (medicalAnalysis as Record<string, unknown>).normalizedContext;
  if (!normalized || typeof normalized !== "object") return null;
  return normalized as NormalizedAttachmentContext;
}

export function serializeAttachmentContextForPrompt(context: NormalizedAttachmentContext) {
  return {
    confidence: context.confidence,
    dates: context.dates,
    diagnoses: context.diagnoses,
    documentType: context.documentType,
    extractedTextPreview: context.extractedTextPreview,
    findings: context.findings,
    measurements: context.measurements,
    modality: context.modality,
    numericalValues: context.numericalValues,
    ocrConfidence: context.ocrConfidence,
    patientIdentifiers: context.metadata.patientIdentifiers,
    recommendations: context.recommendations,
    summary: context.summary,
    warnings: context.warnings,
  };
}

/** Single source of truth builder — invoked once at upload processing time. */
export const AttachmentContextBuilder = {
  build: buildNormalizedAttachmentContext,
  merge: mergeAttachmentContexts,
  readStored: readStoredNormalizedContext,
  serializeForPrompt: serializeAttachmentContextForPrompt,
};
