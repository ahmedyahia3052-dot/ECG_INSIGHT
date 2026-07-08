import type { DetectedClinicalAlert, RiskAssessmentDraft } from "./types";
import {
  CLINICAL_ALERTS_RISK_ENGINE_VERSION,
  SEVERITY_RANK,
  SEVERITY_SCORE_WEIGHT,
  clinicalPriorityFromCategory,
  riskCategoryFromScore,
  urgencyFromCategory,
} from "./types";

export function calculateRiskAssessment(
  alerts: DetectedClinicalAlert[],
  measurementConfidence: number,
): RiskAssessmentDraft {
  if (!alerts.length) {
    return {
      clinicalPriority: "ROUTINE",
      confidence: Number(measurementConfidence.toFixed(3)),
      factors: [{
        category: "baseline",
        code: "NORMAL_ECG",
        contribution: 0,
        evidence: ["No automated high-risk ECG alerts triggered"],
        label: "No acute alert pattern",
        weight: 0,
      }],
      riskCategory: "LOW",
      riskScore: 0,
      supportingFindings: ["No acute ECG alert patterns detected by clinical alert engine."],
      urgency: "ROUTINE",
    };
  }

  let rawScore = 0;
  const factors = alerts.map((alert) => {
    const weight = SEVERITY_SCORE_WEIGHT[alert.alertSeverity];
    const contribution = Number((weight * alert.confidence).toFixed(2));
    rawScore += contribution;
    return {
      category: alert.alertCode,
      code: alert.alertCode,
      contribution,
      evidence: alert.supportingFindings,
      label: alert.message,
      weight,
    };
  });

  const riskScore = Math.min(100, Number(rawScore.toFixed(1)));
  const riskCategory = riskCategoryFromScore(riskScore);
  const maxSeverity = alerts.reduce(
    (best, alert) => (SEVERITY_RANK[alert.alertSeverity] > SEVERITY_RANK[best] ? alert.alertSeverity : best),
    alerts[0]!.alertSeverity,
  );
  const confidenceValues = alerts.map((alert) => alert.confidence);
  const meanConfidence = confidenceValues.reduce((sum, value) => sum + value, 0) / confidenceValues.length;
  const confidence = Number(((meanConfidence * 0.7) + (measurementConfidence * 0.3)).toFixed(3));

  return {
    clinicalPriority: clinicalPriorityFromCategory(riskCategory),
    confidence,
    factors,
    riskCategory,
    riskScore,
    supportingFindings: [
      `Highest alert severity: ${maxSeverity}`,
      ...alerts.slice(0, 5).map((alert) => `${alert.alertCode}: ${alert.message}`),
    ],
    urgency: urgencyFromCategory(riskCategory),
  };
}

export function riskEngineVersion() {
  return CLINICAL_ALERTS_RISK_ENGINE_VERSION;
}
