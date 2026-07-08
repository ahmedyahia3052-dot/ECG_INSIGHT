import type { ClinicalReport, ReportStatus } from "@prisma/client";
import type { UpdateDraftReportInput } from "./schemas";

export type ValidationResult = { errors: string[]; valid: boolean };

function push(errors: string[], message: string) {
  errors.push(message);
}

export function validateDraftReportUpdate(
  report: Pick<ClinicalReport, "status">,
  patch: UpdateDraftReportInput,
): ValidationResult {
  const errors: string[] = [];
  if (report.status !== "DRAFT" && report.status !== "UNDER_REVIEW") {
    push(errors, "Only draft or under-review reports can be edited.");
  }
  if (patch.recommendations && patch.recommendations.length === 0) {
    push(errors, "Recommendations cannot be an empty array when provided.");
  }
  if (patch.aiFindings !== undefined && patch.aiFindings.trim().length < 3) {
    push(errors, "AI findings must contain at least 3 characters when provided.");
  }
  return { errors, valid: errors.length === 0 };
}

export function validateFinalizeReport(
  report: Pick<
    ClinicalReport,
    "finalPhysicianImpression" | "physicianName" | "recommendations" | "rhythmInterpretation" | "status"
  >,
): ValidationResult {
  const errors: string[] = [];
  if (report.status === "SIGNED" || report.status === "ARCHIVED") {
    push(errors, "Signed or archived reports cannot be finalized.");
  }
  if (!report.physicianName?.trim()) {
    push(errors, "Physician name is required before finalization.");
  }
  if (!report.finalPhysicianImpression?.trim() && !report.rhythmInterpretation?.trim()) {
    push(errors, "Physician impression or rhythm interpretation is required before finalization.");
  }
  return { errors, valid: errors.length === 0 };
}

export function validateSignReport(
  report: Pick<ClinicalReport, "electronicSignaturePath" | "status">,
  signaturePath?: string,
): ValidationResult {
  const errors: string[] = [];
  if (report.status !== "FINALIZED") {
    push(errors, "Only finalized reports can be signed.");
  }
  if (!signaturePath && !report.electronicSignaturePath) {
    push(errors, "A signature image or electronic signature is required.");
  }
  return { errors, valid: errors.length === 0 };
}

export function isDraftStatus(status: ReportStatus) {
  return status === "DRAFT" || status === "UNDER_REVIEW";
}

export function isFinalStatus(status: ReportStatus) {
  return status === "FINALIZED" || status === "SIGNED" || status === "ARCHIVED";
}
