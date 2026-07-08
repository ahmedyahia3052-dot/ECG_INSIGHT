/**
 * Sprint 64 — Clinical Alerts & Risk Stratification Engine unit tests.
 */
import { detectClinicalAlerts, listAlertRuleCodes } from "../server/src/modules/clinical-alerts-risk-engine/alert-engine";
import { calculateRiskAssessment } from "../server/src/modules/clinical-alerts-risk-engine/risk-engine";
import { emptyMeasurementResult } from "../server/src/modules/ecg-measurement";
import {
  clinicalPriorityFromCategory,
  riskCategoryFromScore,
  severityToAiSeverity,
  urgencyFromCategory,
} from "../server/src/modules/clinical-alerts-risk-engine/types";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

assert(listAlertRuleCodes().length === 15, "Expected 15 alert detection rules");
assert(severityToAiSeverity("LOW") === "MILD", "LOW severity should map to MILD AISeverity");
assert(severityToAiSeverity("HIGH") === "SEVERE", "HIGH severity should map to SEVERE AISeverity");
assert(riskCategoryFromScore(0) === "LOW", "Score 0 should be LOW risk");
assert(riskCategoryFromScore(25) === "MODERATE", "Score 25 should be MODERATE risk");
assert(riskCategoryFromScore(50) === "HIGH", "Score 50 should be HIGH risk");
assert(riskCategoryFromScore(80) === "CRITICAL", "Score 80 should be CRITICAL risk");
assert(clinicalPriorityFromCategory("CRITICAL") === "CRITICAL", "Critical category should map to critical priority");
assert(urgencyFromCategory("HIGH") === "EMERGENT", "High category should map to emergent urgency");

const criticalMeasurement = {
  ...emptyMeasurementResult(),
  amplitudes: {
    ...emptyMeasurementResult().amplitudes,
    stDeviationMm: 2.5,
    tWaveAmplitudeMv: 0.7,
  },
  confidence: 0.88,
  heartRate: 38,
  intervals: {
    ...emptyMeasurementResult().intervals,
    prIntervalMs: 260,
    qrsDurationMs: 140,
    qtcBazettMs: 520,
  },
  axis: {
    electricalAxisDeg: -120,
    frontalPlaneAxisDeg: -120,
    meanQrsAxisDeg: -120,
  },
  morphology: ["wide_qrs", "pathological_q_waves"] as const,
  rhythm: "irregular" as const,
};

const criticalAlerts = detectClinicalAlerts({
  analysisRhythm: "atrial fibrillation",
  caseRhythm: "irregularly irregular",
  measurement: criticalMeasurement,
  patientGender: "MALE",
});

assert(criticalAlerts.length >= 6, "Critical pattern ECG should trigger multiple alerts");
assert(
  criticalAlerts.some((alert) => alert.alertCode === "CRITICAL_QT_PROLONGATION"),
  "Should detect critical QT prolongation",
);
assert(criticalAlerts.some((alert) => alert.alertCode === "BRADYCARDIA"), "Should detect bradycardia");
assert(criticalAlerts.some((alert) => alert.alertCode === "ST_ELEVATION"), "Should detect ST elevation");
assert(criticalAlerts.some((alert) => alert.alertCode === "ATRIAL_FIBRILLATION"), "Should detect atrial fibrillation");
assert(criticalAlerts.some((alert) => alert.alertCode === "POSSIBLE_AV_BLOCK"), "Should detect possible AV block");

const risk = calculateRiskAssessment(criticalAlerts, criticalMeasurement.confidence);
assert(risk.riskScore > 40, "Multiple severe alerts should produce elevated risk score");
assert(risk.riskCategory === "HIGH" || risk.riskCategory === "CRITICAL", "Risk category should be HIGH or CRITICAL");
assert(risk.factors.length === criticalAlerts.length, "Risk factors should mirror alert count");
assert(risk.supportingFindings.length > 0, "Supporting findings should be populated");
assert(risk.confidence > 0.5, "Risk confidence should be meaningful");

const normalMeasurement = {
  ...emptyMeasurementResult(),
  confidence: 0.9,
  heartRate: 72,
  intervals: {
    ...emptyMeasurementResult().intervals,
    prIntervalMs: 160,
    qrsDurationMs: 90,
    qtcBazettMs: 410,
  },
  axis: {
    electricalAxisDeg: 45,
    frontalPlaneAxisDeg: 45,
    meanQrsAxisDeg: 45,
  },
  rhythm: "sinus_rhythm" as const,
};

const normalAlerts = detectClinicalAlerts({ measurement: normalMeasurement });
assert(normalAlerts.length === 0, "Normal sinus ECG should not trigger alerts");

const normalRisk = calculateRiskAssessment(normalAlerts, normalMeasurement.confidence);
assert(normalRisk.riskScore === 0, "Normal ECG risk score should be 0");
assert(normalRisk.riskCategory === "LOW", "Normal ECG risk category should be LOW");
assert(normalRisk.urgency === "ROUTINE", "Normal ECG urgency should be ROUTINE");

console.log("Sprint 64 Clinical Alerts & Risk Stratification Engine unit tests: PASS");
