import type { ECGAnalysisOutput } from "../../ai/domain";
import { generateExplainabilityArtifact } from "../../ai/explainability";
import type { ECGMeasurement } from "@prisma/client";
import type { MedicalIntelligenceReport } from "../../modules/medical-intelligence/types";
import type { AiExplainabilityBundle } from "../types";

export function buildEcgExplainability(
  output: ECGAnalysisOutput,
  measurement?: ECGMeasurement | null,
): AiExplainabilityBundle {
  const visual = generateExplainabilityArtifact({
    confidenceScore: output.confidenceScore,
    detectedAbnormalities: output.detectedAbnormalities,
    diagnosis: output.primaryDiagnosis,
    interpretation: output.interpretation,
    measurement,
    rationale: output.interpretationRationale,
    severity: output.severity,
  });

  return {
    evidence: {
      alternatives: output.secondaryDiagnoses.map((d) => `${d.diagnosis} (${Math.round(d.confidenceScore * 100)}%)`),
      conflictingEvidence: [],
      missingEvidence: output.detectedAbnormalities.length === 0 ? ["No abnormalities flagged for review."] : [],
      supportingEvidence: output.interpretationRationale,
    },
    summary: output.interpretation,
    visual: visual as unknown as Record<string, unknown>,
  };
}

export function buildClinicalExplainability(report: MedicalIntelligenceReport): AiExplainabilityBundle {
  const primary = report.findings[0];
  const primaryExplainability = primary?.explainability;
  const alternatives = report.findings
    .flatMap((finding) => finding.differentialDiagnosis.map((entry) => entry.label))
    .slice(0, 5);

  return {
    evidence: {
      alternatives,
      conflictingEvidence: primaryExplainability?.conflictingEvidence ?? [],
      missingEvidence: primaryExplainability?.missingEvidence ?? [],
      supportingEvidence: primaryExplainability?.supportingEvidence ?? primary?.label ? [primary.label] : [],
    },
    summary: report.explainabilitySummary || primaryExplainability?.rationale || "Clinical reasoning completed.",
  };
}

export function buildLlmExplainability(content: string, promptHash?: string): AiExplainabilityBundle {
  return {
    evidence: {
      alternatives: [],
      conflictingEvidence: [],
      missingEvidence: [],
      supportingEvidence: promptHash ? [`Prompt hash: ${promptHash}`] : [],
    },
    summary: content.slice(0, 500),
  };
}
