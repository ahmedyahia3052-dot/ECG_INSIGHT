/**
 * Sprint 59 — AI Report Generator Enterprise unit tests.
 */
import { composeAiClinicalReport } from "../server/src/modules/ai-report-generator/composer";
import { emptyMeasurementResult } from "../server/src/modules/ecg-measurement";
import { severityToRiskLevel } from "../server/src/modules/ai-report-generator/types";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

assert(severityToRiskLevel("normal") === "LOW", "Normal severity should map to LOW risk");
assert(severityToRiskLevel("minor") === "LOW", "Minor severity should map to LOW risk");
assert(severityToRiskLevel("abnormal") === "INTERMEDIATE", "Abnormal severity should map to INTERMEDIATE risk");
assert(severityToRiskLevel("urgent") === "HIGH", "Urgent severity should map to HIGH risk");
assert(severityToRiskLevel("critical") === "CRITICAL", "Critical severity should map to CRITICAL risk");

const measurement = {
  ...emptyMeasurementResult(),
  confidence: 0.82,
  heartRate: 72,
  rhythm: "sinus_rhythm" as const,
  intervals: {
    ...emptyMeasurementResult().intervals,
    prIntervalMs: 160,
    qrsDurationMs: 92,
    qtIntervalMs: 390,
    qtcBazettMs: 410,
  },
  axis: {
    electricalAxisDeg: 45,
    frontalPlaneAxisDeg: 45,
    meanQrsAxisDeg: 45,
  },
};

const composed = composeAiClinicalReport({
  ecgCase: {
    caseId: "CASE-001",
    caseNumber: "ECG-001",
    clinicalNotes: "Routine screening ECG",
    finalDiagnosis: null,
  },
  measurement,
  patient: {
    company: "Test Corp",
    dateOfBirth: new Date("1985-06-15"),
    departmentName: "Cardiology",
    firstName: "Jane",
    gender: "FEMALE",
    lastName: "Doe",
    middleName: null,
    occupation: "Engineer",
    patientCode: "PAT-001",
  },
});

assert(composed.executiveSummary.patientDemographics.patientName === "Jane Doe", "Patient name should be composed");
assert(composed.executiveSummary.clinicalIndication === "Routine screening ECG", "Clinical indication should come from case notes");
assert(composed.fullInterpretation.rhythm.length > 0, "Rhythm narrative should be populated");
assert(composed.fullInterpretation.intervals.includes("160"), "Intervals should include PR value");
assert(composed.fullInterpretation.overallImpression.length > 0, "Overall impression should not be empty");
assert(composed.recommendations.length > 0, "Recommendations should be generated");
assert(composed.findings.length >= 0, "Findings array should exist");
assert(composed.explanations.length >= 0, "Explanations array should exist");
assert(["LOW", "INTERMEDIATE", "HIGH", "CRITICAL"].includes(composed.riskLevel), "Risk level should be valid");
assert(composed.aiConfidence > 0, "AI confidence should be positive");
assert(composed.acquisitionQuality.length > 0, "Acquisition quality label should be set");

const lowConfidence = composeAiClinicalReport({
  ecgCase: {
    caseId: "CASE-002",
    caseNumber: "ECG-002",
    clinicalNotes: null,
    finalDiagnosis: null,
  },
  dbMeasurement: { signalQuality: "POOR" },
  measurement: { ...measurement, confidence: 0.35 },
  patient: {
    company: null,
    dateOfBirth: new Date("1970-01-01"),
    departmentName: null,
    firstName: "John",
    gender: "MALE",
    lastName: "Smith",
    middleName: null,
    occupation: null,
    patientCode: "PAT-002",
  },
});

assert(
  lowConfidence.clinicalFlags.includes("POOR_QUALITY") || lowConfidence.clinicalFlags.includes("ARTIFACT"),
  "Low confidence should raise quality flags",
);
assert(lowConfidence.acquisitionQuality.toLowerCase().includes("poor"), "Poor signal should label acquisition as poor");

console.log("Sprint 59 AI Report Generator Enterprise unit tests: PASS");
