import type { NormalizedAttachmentContext } from "../attachment/types";
import type { AttachmentForAnalysis } from "../copilot-types";

const OCR_CONFIDENCE_THRESHOLD = 0.65;

export type AttachmentValidationResult = {
  confidence: number;
  flags: string[];
  requiresPhysicianReview: boolean;
  valid: boolean;
};

function isImpossibleMeasurement(key: string, value: number) {
  if (key.toLowerCase().includes("heart") || key === "heartRateBpm") return value < 20 || value > 300;
  if (key.toLowerCase().includes("pr")) return value < 50 || value > 500;
  if (key.toLowerCase().includes("qrs")) return value < 40 || value > 300;
  if (key.toLowerCase().includes("qt")) return value < 200 || value > 800;
  return false;
}

export function validateAttachmentContext(context: NormalizedAttachmentContext): AttachmentValidationResult {
  const flags: string[] = [];
  if (context.ocrConfidence < OCR_CONFIDENCE_THRESHOLD) {
    flags.push("Low OCR confidence — verify extracted values against source document.");
  }
  if (!context.extractedTextPreview.trim()) {
    flags.push("No readable OCR text extracted.");
  }
  for (const measurement of context.measurements) {
    if (typeof measurement.value === "number" && isImpossibleMeasurement(measurement.key, measurement.value)) {
      flags.push(`Implausible ${measurement.key} value (${measurement.value}) — manual verification required.`);
    }
  }
  if (context.findings.some((item) => /stemi|st elevation|ventricular fibrillation|complete heart block/i.test(item))) {
    flags.push("High-acuity finding language detected — urgent physician review required.");
  }

  const requiresPhysicianReview = flags.length > 0 || context.confidence < OCR_CONFIDENCE_THRESHOLD;
  return {
    confidence: context.confidence,
    flags,
    requiresPhysicianReview,
    valid: flags.every((flag) => !/Implausible|No readable OCR/.test(flag)),
  };
}

export function validateAttachmentsForPrompt(attachments: AttachmentForAnalysis[]): AttachmentValidationResult {
  const contexts = attachments
    .map((attachment) => {
      const medicalAnalysis = attachment.medicalAnalysis;
      if (!medicalAnalysis || typeof medicalAnalysis !== "object" || Array.isArray(medicalAnalysis)) return null;
      return (medicalAnalysis as Record<string, unknown>).normalizedContext as NormalizedAttachmentContext | undefined;
    })
    .filter(Boolean) as NormalizedAttachmentContext[];

  if (!contexts.length) {
    return { confidence: 0.5, flags: ["Attachment context missing normalized clinical payload."], requiresPhysicianReview: true, valid: false };
  }

  const results = contexts.map(validateAttachmentContext);
  return {
    confidence: Math.min(...results.map((item) => item.confidence)),
    flags: Array.from(new Set(results.flatMap((item) => item.flags))),
    requiresPhysicianReview: results.some((item) => item.requiresPhysicianReview),
    valid: results.every((item) => item.valid),
  };
}
