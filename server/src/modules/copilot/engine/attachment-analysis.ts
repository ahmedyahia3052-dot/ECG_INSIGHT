import type { Prisma } from "@prisma/client";
import type { AttachmentForAnalysis, AttachmentInsight } from "../copilot-types";

function normalizeFindings(value: Prisma.JsonValue | null): string[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  const findings = (value as { findings?: unknown }).findings;
  return Array.isArray(findings) ? findings.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [];
}

export function attachmentInsights(attachments: AttachmentForAnalysis[]): AttachmentInsight[] {
  return attachments.map((attachment) => {
    const documentType = attachment.documentType ?? attachment.kind.toUpperCase();
    const findings = normalizeFindings(attachment.medicalAnalysis);
    if (attachment.analysisSummary) findings.unshift(attachment.analysisSummary);
    const readableText = attachment.extractedText?.trim();
    return {
      confidence: attachment.confidence ?? (readableText ? 0.72 : 0.55),
      documentType,
      findings: Array.from(new Set(findings)).slice(0, 8),
      interpretation: readableText ? readableText.slice(0, 700) : "",
      name: attachment.originalName,
      ocrStatus: readableText ? "text-available" : "limited",
      recommendations: (attachment.recommendations ?? []).slice(0, 6),
      warnings: (attachment.warnings ?? []).filter((warning) => !/AI assistance only/i.test(warning)).slice(0, 6),
    };
  });
}
