import type { ECGAnalysisOutput } from "../../ai/domain";
import type { MedicalIntelligenceReport } from "../../modules/medical-intelligence/types";
import type { ValidationResult } from "./input-validator";
import { structuredEcgOutputSchema } from "./schemas";

export function validateMedicalEcgOutput(output: ECGAnalysisOutput): ValidationResult {
  const errors: string[] = [];

  const parsed = structuredEcgOutputSchema.safeParse({
    clinicalSeverity: output.clinicalSeverity,
    confidenceScore: output.confidenceScore,
    detectedAbnormalities: output.detectedAbnormalities,
    heartRate: output.heartRate,
    interpretation: output.interpretation,
    primaryDiagnosis: output.primaryDiagnosis,
    recommendations: output.recommendations,
    rhythm: output.rhythm,
    urgentActions: output.urgentActions,
  });

  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      errors.push(`${issue.path.join(".")}: ${issue.message}`);
    }
  }

  if (output.clinicalSeverity === "CRITICAL" && output.urgentActions.length === 0) {
    errors.push("Critical severity requires at least one urgent action.");
  }

  if (output.confidenceScore < 0.4 && output.detectedAbnormalities.length > 3) {
    errors.push("Low confidence with multiple abnormalities requires manual review.");
  }

  return { errors, valid: errors.length === 0 };
}

export function validateMedicalIntelligenceReport(report: MedicalIntelligenceReport): ValidationResult {
  const errors: string[] = [];

  if (!report.findings.length) {
    errors.push("Clinical reasoning report must include at least one finding.");
  }

  if (report.overallConfidence.score < 0 || report.overallConfidence.score > 1) {
    errors.push("Overall confidence must be between 0 and 1.");
  }

  for (const finding of report.findings) {
    if (!finding.label?.trim()) {
      errors.push(`Finding ${finding.code} is missing a label.`);
    }
  }

  return { errors, valid: errors.length === 0 };
}

export function requiresPhysicianReview(output: ECGAnalysisOutput): boolean {
  return (
    output.clinicalSeverity === "CRITICAL" ||
    output.confidenceScore < 0.55 ||
    output.urgentActions.length > 0
  );
}
