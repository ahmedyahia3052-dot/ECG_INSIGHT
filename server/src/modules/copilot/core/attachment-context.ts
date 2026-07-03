import type { AttachmentForAnalysis, ClinicalContext } from "../copilot-types";
import { AttachmentContextBuilder } from "../attachment/attachment-context-builder.service";
import { validateAttachmentsForPrompt } from "../validation/attachment-validator";

export const CLINICAL_SAFETY_DISCLAIMER =
  "This AI interpretation is an assistive clinical tool and must be reviewed by a qualified physician.";

export function buildAttachmentContextBlock(attachments: AttachmentForAnalysis[]): string | null {
  if (!attachments.length) return null;

  const normalizedContexts = attachments.map((attachment) => {
    const stored = AttachmentContextBuilder.readStored(attachment);
    if (stored) return stored;
    return AttachmentContextBuilder.build({
      documentType: attachment.documentType ?? attachment.kind,
      extractedText: attachment.extractedText ?? "",
      kind: attachment.kind,
      mimeType: attachment.mimeType,
      originalName: attachment.originalName,
      sizeBytes: attachment.sizeBytes,
    });
  });

  const validation = validateAttachmentsForPrompt(attachments);
  const serialized = normalizedContexts.map((context) => AttachmentContextBuilder.serializeForPrompt(context));
  const lines = [
    "UPLOADED ATTACHMENTS — Structured clinical context only (no raw files).",
    "You MUST review every attachment below and reference relevant findings in your response.",
    "Never ignore uploaded files. Never fabricate measurements not present in the analysis.",
    "If OCR confidence is low or text is limited, state that explicitly.",
    `Structured clinical context (${attachments.length} file(s)):\n${JSON.stringify(serialized, null, 2)}`,
  ];

  if (validation.flags.length) {
    lines.push(`Clinical validation flags:\n${validation.flags.map((flag) => `- ${flag}`).join("\n")}`);
  }
  if (validation.requiresPhysicianReview) {
    lines.push("Physician review is required before acting on low-confidence or flagged attachment findings.");
  }

  for (const attachment of attachments) {
    const context = AttachmentContextBuilder.readStored(attachment);
    if (context?.summary) {
      lines.push(`Summary (${attachment.originalName}): ${context.summary}`);
    } else if (attachment.analysisSummary) {
      lines.push(`Summary (${attachment.originalName}): ${attachment.analysisSummary}`);
    }
    if (context?.extractedTextPreview?.trim()) {
      lines.push(`OCR preview (${attachment.originalName}):\n${context.extractedTextPreview.slice(0, 2500)}`);
    }
    const warnings = context?.warnings?.length ? context.warnings : attachment.warnings;
    if (warnings?.length) {
      lines.push(`Warnings (${attachment.originalName}): ${warnings.join("; ")}`);
    }
    const recommendations = context?.recommendations?.length ? context.recommendations : attachment.recommendations;
    if (recommendations?.length) {
      lines.push(`Recommendations (${attachment.originalName}): ${recommendations.join("; ")}`);
    }
  }

  return lines.join("\n\n");
}

export function formatClinicalContextBlock(context: ClinicalContext): string | null {
  const lines: string[] = [];

  if (context.patient) {
    lines.push(
      `Patient: ${context.patient.fullName}, age ${context.patient.age}, ${context.patient.gender}`,
      `History: ${context.patient.history}`,
      `Medications: ${context.patient.medications}`,
      `Allergies: ${context.patient.allergies}`,
    );
    if (context.patient.riskFactors.length) {
      lines.push(`Risk factors: ${context.patient.riskFactors.join(", ")}`);
    }
  }

  if (context.currentCase) {
    lines.push(
      `Current ECG case: rhythm ${context.currentCase.rhythm ?? "unknown"}, HR ${context.currentCase.heartRate ?? "n/a"}`,
      `Intervals: ${context.currentCase.intervals}`,
      `Diagnosis: ${context.currentCase.diagnosis ?? context.currentCase.doctorDiagnosis ?? "pending"}`,
      `Severity: ${context.currentCase.severity ?? "unknown"}`,
    );
  }

  if (context.previousEcgs.length) {
    lines.push(`Previous ECGs:\n${context.previousEcgs.slice(0, 6).join("\n")}`);
  }

  if (context.reports.length) {
    lines.push(`Reports:\n${context.reports.slice(0, 6).join("\n")}`);
  }

  if (context.documents.length) {
    lines.push(`Documents:\n${context.documents.slice(0, 8).join("\n")}`);
  }

  if (context.criticalAlerts.length) {
    lines.push(`Critical alerts:\n${context.criticalAlerts.join("\n")}`);
  }

  if (!lines.length) return null;
  return `PATIENT / CASE CONTEXT (use when clinically relevant — never invent missing data):\n${lines.join("\n")}`;
}

export function appendClinicalSafetyDisclaimer(content: string): string {
  const trimmed = content.trim();
  if (!trimmed) return CLINICAL_SAFETY_DISCLAIMER;
  if (trimmed.includes(CLINICAL_SAFETY_DISCLAIMER)) return trimmed;
  return `${trimmed}\n\n---\n${CLINICAL_SAFETY_DISCLAIMER}`;
}
