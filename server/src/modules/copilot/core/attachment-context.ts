import type { AttachmentForAnalysis, ClinicalContext } from "../copilot-types";
import { analyzeAttachmentsStructured } from "../v3/tools/document-analyzer";

export const CLINICAL_SAFETY_DISCLAIMER =
  "This AI interpretation is an assistive clinical tool and must be reviewed by a qualified physician.";

export function buildAttachmentContextBlock(attachments: AttachmentForAnalysis[]): string | null {
  if (!attachments.length) return null;

  const structured = analyzeAttachmentsStructured(attachments);
  const lines = [
    "UPLOADED ATTACHMENTS — The user has attached clinical files for this message.",
    "You MUST review every attachment below and reference relevant findings in your response.",
    "Never ignore uploaded files. Never fabricate measurements not present in the analysis.",
    "If OCR confidence is low or text is limited, state that explicitly.",
    `Structured analysis (${attachments.length} file(s)):\n${JSON.stringify(structured, null, 2)}`,
  ];

  for (const attachment of attachments) {
    if (attachment.analysisSummary) {
      lines.push(`Summary (${attachment.originalName}): ${attachment.analysisSummary}`);
    }
    if (attachment.extractedText?.trim()) {
      lines.push(`OCR text (${attachment.originalName}):\n${attachment.extractedText.slice(0, 2500)}`);
    }
    if (attachment.warnings?.length) {
      lines.push(`Warnings (${attachment.originalName}): ${attachment.warnings.join("; ")}`);
    }
    if (attachment.recommendations?.length) {
      lines.push(`Recommendations (${attachment.originalName}): ${attachment.recommendations.join("; ")}`);
    }
    if (typeof attachment.confidence === "number" && attachment.confidence < 0.65) {
      lines.push(`Low confidence (${Math.round(attachment.confidence * 100)}%) for ${attachment.originalName} — interpret cautiously.`);
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
