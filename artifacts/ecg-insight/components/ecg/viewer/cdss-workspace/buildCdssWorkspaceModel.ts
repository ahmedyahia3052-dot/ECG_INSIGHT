import type { AIAnalysisResult, AIExplainability } from "@/services/ai";
import type { DigitalEcg } from "@/services/ecgProcessing";
import type { MedicalIntelligenceReport } from "@/services/medicalIntelligence";

import { buildCardiologistModel } from "../ai-cardiologist/buildCardiologistModel";
import type { EcgClinicalMeasurement } from "../measurementTypes";
import { evaluateClinicalRules, highestSeverity, matchedRules } from "./clinicalRuleEngine";
import { buildRelationshipGraph, summarizeRelationshipGraph } from "./buildRelationshipGraph";
import { buildGuidelineReferences, severityToTriage, triageLabel } from "./guidelineEngine";
import type {
  CdssClinicalAssessment,
  CdssConfidenceMetric,
  CdssDifferentialRow,
  CdssRecommendation,
  CdssWorkspaceModel,
  EnterpriseClinicalDecisionSection,
} from "./types";

function buildDifferential(matched: ReturnType<typeof matchedRules>, mi?: MedicalIntelligenceReport | null): CdssDifferentialRow[] {
  if (mi?.findings.length) {
    const rows = mi.findings.flatMap((f) =>
      f.differentialDiagnosis.map((d) => ({
        clinicalConfidence: Math.round(d.likelihood * 100),
        contradictingFindings: f.explainability.conflictingEvidence,
        diagnosis: d.label,
        probability: Math.round(d.likelihood * 100),
        supportingFindings: d.distinguishingFeatures,
      })),
    );
    if (rows.length) return rows.slice(0, 8);
  }
  return matched.slice(0, 6).map((rule, index) => ({
    clinicalConfidence: rule.confidence,
    contradictingFindings: rule.contradictingFindings,
    diagnosis: rule.diagnosis,
    probability: Math.max(10, rule.confidence - index * 8),
    supportingFindings: [...rule.supportingFindings, ...rule.evidence.morphology],
  }));
}

function buildRecommendations(matched: ReturnType<typeof matchedRules>, cardiologistRecommendations: ReturnType<typeof buildCardiologistModel>["recommendations"]): CdssRecommendation[] {
  const recs: CdssRecommendation[] = [];
  const ids = new Set(matched.map((m) => m.ruleId));

  const add = (action: string, priority: CdssRecommendation["priority"], rationale: string, linked: string[]) => {
    if (recs.some((r) => r.action === action)) return;
    recs.push({
      action,
      linkedDiagnoses: linked,
      linkedFindings: matched.filter((m) => linked.includes(m.diagnosis)).flatMap((m) => m.supportingFindings),
      linkedMeasurements: matched.filter((m) => linked.includes(m.diagnosis)).flatMap((m) => m.evidence.measurements),
      priority,
      rationale,
    });
  };

  if (ids.has("anterior_stemi") || ids.has("inferior_stemi") || ids.has("lateral_stemi")) {
    add("Immediate PCI Candidate", "emergent", "STEMI pattern requires emergent reperfusion evaluation per ACS protocol.", matched.filter((m) => m.severity === "life_threatening").map((m) => m.diagnosis));
    add("Emergency Referral", "emergent", "Activate chest pain / STEMI pathway.", matched.filter((m) => m.severity === "life_threatening").map((m) => m.diagnosis));
  }
  if (ids.has("nstemi_suspicion")) {
    add("Troponin", "urgent", "Serial high-sensitivity troponin required for NSTEMI rule-out/rule-in.", ["NSTEMI Suspicion"]);
    add("Urgent Cardiology Review", "urgent", "Ischemic ECG without ST elevation warrants urgent cardiology assessment.", ["NSTEMI Suspicion"]);
  }
  if (ids.has("qt_prolongation") || ids.has("brugada_pattern") || ids.has("complete_heart_block")) {
    add("Emergency Referral", "emergent", "Life-threatening arrhythmia risk requires emergent evaluation.", matched.filter((m) => m.severity === "critical" || m.severity === "life_threatening").map((m) => m.diagnosis));
  }
  if (ids.has("lvh") || ids.has("rvh")) add("Echo", "routine", "Echocardiography clarifies hypertrophy and function.", matched.filter((m) => m.ruleId === "lvh" || m.ruleId === "rvh").map((m) => m.diagnosis));
  if (ids.has("atrial_fibrillation")) add("Holter", "routine", "Ambulatory monitoring may quantify burden and guide anticoagulation.", ["Atrial Fibrillation"]);
  if (ids.has("hyperkalemia_pattern") || ids.has("hypokalemia_pattern")) add("Electrolytes", "urgent", "ECG electrolyte pattern requires urgent laboratory correlation.", matched.filter((m) => m.ruleId.includes("kalemia")).map((m) => m.diagnosis));
  if (matched.some((m) => m.severity !== "normal" && m.severity !== "low_risk")) {
    add("Repeat ECG", "routine", "Serial ECG documents dynamic ischemic or rhythm changes.", matched.map((m) => m.diagnosis));
    add("Compare Previous ECG", "routine", "Prior ECG comparison improves diagnostic specificity.", matched.map((m) => m.diagnosis));
  }
  if (!recs.length) add("Routine follow-up", "routine", "No acute actionable abnormality detected by CDSS rules.", matched.map((m) => m.diagnosis));

  for (const row of cardiologistRecommendations.slice(0, 4)) {
    add(row.action, row.priority === "urgent" || row.priority === "emergent" ? "urgent" : "routine", row.rationale, matched.slice(0, 2).map((m) => m.diagnosis));
  }

  return recs.slice(0, 10);
}

function buildConfidence(
  cardiologist: ReturnType<typeof buildCardiologistModel>,
  digitalEcg?: DigitalEcg | null,
  ruleConfidence?: number,
): CdssConfidenceMetric[] {
  const image = cardiologist.confidence.imageQuality.includes("%")
    ? parseInt(cardiologist.confidence.imageQuality, 10) || 75
    : 75;
  return [
    { label: "Image Confidence", percent: image },
    { label: "Digitization Confidence", percent: digitalEcg?.validation?.digitizationAccuracy ?? 70 },
    { label: "Measurement Confidence", percent: cardiologist.intervals.some((i) => i.value != null) ? 85 : 60 },
    { label: "Rule Confidence", percent: ruleConfidence ?? 70 },
    { label: "Clinical Confidence", percent: cardiologist.confidence.overall },
    { label: "Overall Confidence", percent: Math.round((image + (ruleConfidence ?? 70) + cardiologist.confidence.overall) / 3) },
  ];
}

function buildAssessment(matched: ReturnType<typeof matchedRules>, severity: ReturnType<typeof highestSeverity>): CdssClinicalAssessment {
  const primary = matched[0];
  const triage = severityToTriage(severity);
  return {
    finalDiagnosis: primary?.diagnosis ?? "No acute CDSS diagnosis",
    overallConfidence: primary?.confidence ?? 0,
    pipelineStage: "Final Clinical Assessment",
    reasoning: primary?.evidence.reasoning ?? "Insufficient data for structured CDSS assessment.",
    severity,
    triage,
  };
}

export function buildCdssWorkspaceModel(input: {
  analysis?: AIAnalysisResult | null;
  digitalEcg?: DigitalEcg | null;
  explainability?: AIExplainability | null;
  measurements?: EcgClinicalMeasurement[];
  medicalReport?: MedicalIntelligenceReport | null;
}): CdssWorkspaceModel {
  const cardiologist = buildCardiologistModel({
    analysis: input.analysis,
    digitalEcg: input.digitalEcg,
    explainability: input.explainability,
    medicalReport: input.medicalReport,
  });

  const analysisText = `${input.analysis?.diagnosis ?? ""} ${input.analysis?.interpretation ?? ""} ${input.analysis?.rhythm ?? ""}`;
  const allRules = evaluateClinicalRules({
    analysisText,
    cardiologist,
    measurements: input.measurements ?? [],
  });
  const matched = matchedRules(allRules);
  const severity = highestSeverity(allRules);
  const differential = buildDifferential(matched, input.medicalReport);
  const recommendations = buildRecommendations(matched, cardiologist.recommendations);
  const guidelines = buildGuidelineReferences(matched);
  const relationshipGraph = buildRelationshipGraph(matched, recommendations);
  const assessment = buildAssessment(matched, severity);
  const avgRuleConfidence = matched.length ? Math.round(matched.reduce((sum, r) => sum + r.confidence, 0) / matched.length) : 0;

  return {
    assessment,
    confidence: buildConfidence(cardiologist, input.digitalEcg, avgRuleConfidence),
    differential,
    evaluatedAt: new Date().toISOString(),
    guidelines,
    loaded: cardiologist.loaded,
    primaryRules: allRules,
    recommendations,
    relationshipGraph,
    summary: matched.length
      ? `${matched[0].diagnosis} (${matched[0].confidence}% confidence) — ${triageLabel(assessment.triage)}`
      : "CDSS evaluation complete — no rule-triggered diagnoses.",
  };
}

export function buildEnterpriseClinicalDecisionSection(model: CdssWorkspaceModel): EnterpriseClinicalDecisionSection {
  const matched = matchedRules(model.primaryRules);
  return {
    assessment: model.assessment,
    differential: model.differential,
    guidelines: model.guidelines,
    primaryDiagnosis: matched[0] ?? null,
    recommendations: model.recommendations,
    relationshipSummary: summarizeRelationshipGraph(model.relationshipGraph),
    triageLabel: triageLabel(model.assessment.triage),
  };
}
