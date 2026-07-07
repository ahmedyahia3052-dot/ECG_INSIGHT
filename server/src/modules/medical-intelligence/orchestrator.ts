import { assessFindingConfidence, assessOverallConfidence } from "./confidence/engine";
import { generateDifferentialDiagnosis } from "./differential/engine";
import { buildExplainability, buildExplainabilitySummary } from "./explainability/engine";
import { generateRecommendations } from "./recommendations/engine";
import { evaluateAllMedicalRules } from "./rule-engine/rules";
import { buildMedicalReport, deriveOverallSeverity, deriveOverallUrgency, rankFindings } from "./report/engine";
import type { MedicalIntelligenceInput, MedicalIntelligenceReport } from "./types";

export const ENGINE_VERSION = "1.0.0";
export const ENGINE_ID = "ecg-medical-intelligence-engine";

export function runMedicalIntelligenceEngine(input: MedicalIntelligenceInput): MedicalIntelligenceReport {
  const { measurement } = input;

  const rawFindings = evaluateAllMedicalRules(measurement);
  const findings = rankFindings(rawFindings);

  const confidenceAssessments = findings.map((f) => assessFindingConfidence(f, measurement));
  const explainabilityArtifacts = findings.map((f) => buildExplainability(f, findings, measurement));

  const differentialMaps = new Map<string, ReturnType<typeof generateDifferentialDiagnosis>>();
  for (const finding of findings) {
    differentialMaps.set(finding.code, generateDifferentialDiagnosis(finding, findings));
  }

  const overallSeverity = deriveOverallSeverity(findings);
  const overallUrgency = deriveOverallUrgency(findings);
  const recommendations = generateRecommendations(findings, overallSeverity, overallUrgency);
  const overallConfidence = assessOverallConfidence(findings, measurement, confidenceAssessments);
  const explainabilitySummary = buildExplainabilitySummary(explainabilityArtifacts);

  return buildMedicalReport({
    findings,
    confidenceAssessments,
    explainabilityArtifacts,
    differentialMaps,
    recommendations,
    measurement,
    overallConfidence,
    explainabilitySummary,
  });
}

export function runMedicalIntelligenceFromMeasurements(
  measurement: MedicalIntelligenceInput["measurement"],
  context?: MedicalIntelligenceInput["clinicalContext"],
): MedicalIntelligenceReport {
  return runMedicalIntelligenceEngine({ measurement, clinicalContext: context });
}
