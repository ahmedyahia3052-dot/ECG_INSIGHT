import type { AttachmentForAnalysis } from "../../copilot-types";
import type { DocumentAnalysisJson } from "../types";
import { AttachmentContextBuilder } from "../../attachment/attachment-context-builder.service";

function pipelineFor(modality: string, documentType: string, kind: string): DocumentAnalysisJson["pipeline"] {
  const haystack = `${documentType} ${kind} ${modality}`.toLowerCase();
  if (/ecg|ekg/.test(haystack)) return "ecg";
  if (/lab|cbc|troponin|chemistry/.test(haystack)) return "laboratory";
  if (/xray|x-ray|ct|mri|radiology|cxr|echo/.test(haystack)) return "radiology";
  return "general";
}

/** Backward-compatible adapter — reads SSOT normalized context when available. */
export function analyzeAttachmentStructured(attachment: AttachmentForAnalysis): DocumentAnalysisJson {
  const stored = AttachmentContextBuilder.readStored(attachment);
  if (stored) {
    return {
      abnormalValues: stored.modality === "lab" ? Object.values(stored.numericalValues).map(String) : undefined,
      documentType: stored.documentType,
      extractedTextPreview: stored.extractedTextPreview,
      findings: stored.findings,
      impression: stored.diagnoses[0],
      intervals: stored.modality === "ecg" ? stored.numericalValues as DocumentAnalysisJson["intervals"] : undefined,
      measurements: stored.numericalValues,
      morphology: stored.findings.filter((item) => /lvh|qt/i.test(item)),
      name: attachment.originalName,
      pipeline: pipelineFor(stored.modality, stored.documentType, attachment.kind),
      recommendations: stored.recommendations,
      rhythm: typeof stored.numericalValues.rhythm === "string" ? stored.numericalValues.rhythm : undefined,
      warnings: stored.warnings,
    };
  }

  const rebuilt = AttachmentContextBuilder.build({
    documentType: attachment.documentType ?? attachment.kind,
    extractedText: attachment.extractedText ?? "",
    kind: attachment.kind,
    mimeType: attachment.mimeType,
    originalName: attachment.originalName,
    sizeBytes: attachment.sizeBytes,
  });

  return {
    documentType: rebuilt.documentType,
    extractedTextPreview: rebuilt.extractedTextPreview,
    findings: rebuilt.findings,
    name: attachment.originalName,
    pipeline: pipelineFor(rebuilt.modality, rebuilt.documentType, attachment.kind),
    recommendations: rebuilt.recommendations,
    warnings: rebuilt.warnings,
  };
}

export function analyzeAttachmentsStructured(attachments: AttachmentForAnalysis[]): DocumentAnalysisJson[] {
  return attachments.map(analyzeAttachmentStructured);
}
