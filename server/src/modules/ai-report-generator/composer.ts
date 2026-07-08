import type { ClinicalReportFlagType, ClinicalRecommendationCategory } from "@prisma/client";
import type { AIAnalysis, ECGCase, ECGMeasurement, Patient } from "@prisma/client";
import { getClinicalKnowledgeById } from "../clinical-knowledge-engine";
import { runMedicalIntelligenceEngine } from "../medical-intelligence/orchestrator";
import type {
  ClinicalRecommendation,
  ClinicalSeverity,
  ClinicalUrgency,
  ExplainabilityArtifact,
  MedicalIntelligenceReport,
} from "../medical-intelligence/types";
import type { EcgClinicalMeasurementResult } from "../ecg-measurement/types";
import { acquisitionQualityLabel, patientAgeYears } from "./measurement-adapter";
import type { ComposedAiReport, GeneratedExplanation, GeneratedRecommendation } from "./types";
import { severityToRiskLevel } from "./types";

type ComposeInput = {
  analysis?: Pick<AIAnalysis, "confidenceScore" | "diagnosis" | "interpretation" | "recommendations" | "rhythm" | "severity" | "urgentActions"> | null;
  clinicalIndication?: string | null;
  dbMeasurement?: Pick<ECGMeasurement, "signalQuality"> | null;
  ecgCase: Pick<ECGCase, "caseId" | "caseNumber" | "clinicalNotes" | "finalDiagnosis">;
  measurement: EcgClinicalMeasurementResult;
  patient: Pick<
    Patient,
    "company" | "dateOfBirth" | "departmentName" | "firstName" | "gender" | "lastName" | "middleName" | "occupation" | "patientCode"
  >;
};

function formatPercent(value: number) {
  return `${Math.round(value <= 1 ? value * 100 : value)}%`;
}

function axisDescription(degrees: number) {
  if (degrees >= -30 && degrees <= 90) return `Normal axis (${Math.round(degrees)}°)`;
  if (degrees < -30) return `Left axis deviation (${Math.round(degrees)}°)`;
  return `Right axis deviation (${Math.round(degrees)}°)`;
}

function rhythmNarrative(report: MedicalIntelligenceReport, measurement: EcgClinicalMeasurementResult) {
  const rhythmFinding = report.findings.find((item) =>
    ["NSR", "SBRAD", "STACH", "AF", "AFL", "SVT", "VT"].includes(item.code),
  );
  if (rhythmFinding) return `${rhythmFinding.label}. ${measurement.rhythm.replace(/_/g, " ")} pattern on automated measurement.`;
  return `Rhythm classified as ${measurement.rhythm.replace(/_/g, " ")} with rate ${measurement.heartRate} bpm.`;
}

function categoryNarrative(report: MedicalIntelligenceReport, category: string, fallback: string) {
  const labels = report.findings.filter((item) => item.category === category).map((item) => item.label);
  return labels.length ? labels.join("; ") : fallback;
}

function stTNarrative(measurement: EcgClinicalMeasurementResult, report: MedicalIntelligenceReport) {
  const ischemia = report.findings.filter((item) => item.category === "ischemia").map((item) => item.label);
  const base = `ST deviation ${measurement.amplitudes.stDeviationMm} mm; T wave amplitude ${measurement.amplitudes.tWaveAmplitudeMv} mV.`;
  return ischemia.length ? `${base} Ischemic patterns: ${ischemia.join(", ")}.` : base;
}

function morphologyNarrative(measurement: EcgClinicalMeasurementResult, report: MedicalIntelligenceReport) {
  const flags = measurement.morphology.length ? measurement.morphology.join(", ") : "none";
  const labels = report.findings.map((item) => item.label).slice(0, 4).join(", ");
  return `Morphology flags: ${flags}. Key diagnostic labels: ${labels || "within expected limits"}.`;
}

function mapRecommendations(recommendations: ClinicalRecommendation[]): GeneratedRecommendation[] {
  const categoryMap: Record<ClinicalRecommendation["type"], ClinicalRecommendationCategory> = {
    anticoagulation_review: "CLINICAL_RECOMMENDATION",
    cardiology_consult: "CLINICAL_RECOMMENDATION",
    chest_xray: "FURTHER_INVESTIGATION",
    continuous_monitoring: "IMMEDIATE_ACTION",
    ct_angiography: "FURTHER_INVESTIGATION",
    echo: "FURTHER_INVESTIGATION",
    electrolytes: "FURTHER_INVESTIGATION",
    emergency_referral: "IMMEDIATE_ACTION",
    no_immediate_action: "FOLLOW_UP",
    observation: "FOLLOW_UP",
    repeat_ecg: "FOLLOW_UP",
    serial_troponin: "FURTHER_INVESTIGATION",
  };
  return recommendations.map((item) => ({
    action: item.action,
    category: categoryMap[item.type] ?? "CLINICAL_RECOMMENDATION",
    priority: item.priority,
    rationale: item.rationale,
  }));
}

function buildClinicalFlags(
  measurement: EcgClinicalMeasurementResult,
  severity: ClinicalSeverity,
  urgency: ClinicalUrgency,
  signalQuality?: string | null,
): ClinicalReportFlagType[] {
  const flags = new Set<ClinicalReportFlagType>();
  if (urgency === "critical" || urgency === "emergent") flags.add("URGENT");
  if (severity === "urgent" || severity === "critical") flags.add("NEEDS_REVIEW");
  if (measurement.confidence < 0.55 || signalQuality === "POOR") flags.add("POOR_QUALITY");
  if (measurement.confidence < 0.45) flags.add("ARTIFACT");
  if (measurement.confidence < 0.7 || signalQuality === "FAIR") flags.add("MANUAL_REVIEW_REQUIRED");
  return [...flags];
}

function buildExplanations(report: MedicalIntelligenceReport): GeneratedExplanation[] {
  return report.findings.slice(0, 6).map((finding) => {
    const artifact: ExplainabilityArtifact = finding.explainability;
    const knowledge = getClinicalKnowledgeById(finding.code);
    const references = [
      ...(knowledge?.guidelineReferences ?? []).map((ref) => `${ref.organization}: ${ref.title}${ref.year ? ` (${ref.year})` : ""}`),
      ...(knowledge?.references ?? []).map((ref) => ref.citation),
    ];
    return {
      clinicalReferences: references.slice(0, 4),
      findingCode: finding.code,
      howText: `Rule engine evaluated ${artifact.supportingEvidence.length} supporting features with ${artifact.conflictingEvidence.length} conflicting signals.`,
      supportingEvidence: artifact.supportingEvidence,
      whyText: artifact.rationale,
    };
  });
}

function emergencyWarning(report: MedicalIntelligenceReport) {
  if (report.overallUrgency !== "critical" && report.overallUrgency !== "emergent") return undefined;
  const critical = report.criticalFindings.length
    ? report.criticalFindings
    : report.findings.filter((item) => item.severity === "critical").map((item) => item.label);
  return critical.length
    ? `Emergency warning: ${critical.join(", ")}. Activate institutional emergency protocol immediately.`
    : "Emergency warning: high-urgency ECG pattern detected. Immediate physician review required.";
}

export function composeAiClinicalReport(input: ComposeInput): ComposedAiReport {
  const intelligence = runMedicalIntelligenceEngine({
    caseId: input.ecgCase.caseId,
    clinicalContext: {
      age: patientAgeYears(input.patient),
      sex:
        input.patient.gender === "MALE"
          ? "male"
          : input.patient.gender === "FEMALE"
            ? "female"
            : "other",
    },
    measurement: input.measurement,
  });

  const primary = intelligence.primaryDiagnosis.label
    ?? input.analysis?.diagnosis
    ?? input.ecgCase.finalDiagnosis
    ?? "No acute abnormality detected";
  const aiConfidence = intelligence.overallConfidence.score;
  const acquisitionQuality = acquisitionQualityLabel(aiConfidence, input.dbMeasurement?.signalQuality ?? null);
  const patientName = `${input.patient.firstName} ${input.patient.middleName ?? ""} ${input.patient.lastName}`.replace(/\s+/g, " ").trim();
  const clinicalIndication = input.clinicalIndication ?? input.ecgCase.clinicalNotes ?? "Routine ECG evaluation";

  const fullInterpretation = {
    axis: axisDescription(input.measurement.axis.meanQrsAxisDeg),
    comparison: "No prior ECG available in current case context for automated comparison.",
    conduction: categoryNarrative(intelligence, "conduction", "No significant conduction abnormality detected by rule engine."),
    hypertrophy: categoryNarrative(intelligence, "hypertrophy", "No voltage criteria for ventricular hypertrophy met."),
    intervals: `PR ${input.measurement.intervals.prIntervalMs} ms, QRS ${input.measurement.intervals.qrsDurationMs} ms, QT ${input.measurement.intervals.qtIntervalMs} ms, QTc ${input.measurement.intervals.qtcBazettMs} ms.`,
    morphology: morphologyNarrative(input.measurement, intelligence),
    overallImpression: intelligence.explainabilitySummary || input.analysis?.interpretation || primary,
    rate: `${input.measurement.heartRate} bpm`,
    rhythm: rhythmNarrative(intelligence, input.measurement),
    stT: stTNarrative(input.measurement, intelligence),
  };

  const executiveSummary = {
    acquisitionQuality,
    aiConfidence: formatPercent(aiConfidence),
    clinicalIndication,
    clinicalUrgency: intelligence.overallUrgency,
    patientDemographics: {
      ageYears: patientAgeYears(input.patient),
      company: input.patient.company ?? undefined,
      department: input.patient.departmentName ?? undefined,
      gender: input.patient.gender,
      occupation: input.patient.occupation ?? undefined,
      patientId: input.patient.patientCode ?? undefined,
      patientName,
    },
    primaryDiagnosis: primary,
    severity: intelligence.overallSeverity,
  };

  return {
    acquisitionQuality,
    aiConfidence,
    clinicalFlags: buildClinicalFlags(
      input.measurement,
      intelligence.overallSeverity,
      intelligence.overallUrgency,
      input.dbMeasurement?.signalQuality,
    ),
    clinicalIndication,
    clinicalUrgency: intelligence.overallUrgency,
    emergencyWarning: emergencyWarning(intelligence),
    executiveSummary,
    explanations: buildExplanations(intelligence),
    findings: intelligence.findings.map((finding) => ({
      category: finding.category,
      code: finding.code,
      confidence: finding.confidence.score,
      evidence: finding.explainability.supportingEvidence.map((value) => ({ feature: "evidence", value })),
      label: finding.label,
      severity: finding.severity,
    })),
    fullInterpretation,
    overallImpression: fullInterpretation.overallImpression,
    primaryDiagnosis: primary,
    recommendations: mapRecommendations(intelligence.recommendations),
    riskLevel: severityToRiskLevel(intelligence.overallSeverity),
    severity: intelligence.overallSeverity,
  };
}
