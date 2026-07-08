import { generateClinicalRecommendations } from "../server/src/modules/clinical-decision-support/recommendation-engine";
import { generateFollowUpPlan } from "../server/src/modules/clinical-decision-support/follow-up-engine";
import { DEFAULT_DECISION_SUPPORT_RULES, RECOMMENDATION_CATALOG } from "../server/src/modules/clinical-decision-support/decision-rules";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function main() {
  assert(DEFAULT_DECISION_SUPPORT_RULES.length >= 7, "decision support rules should be seeded");
  assert(Object.keys(RECOMMENDATION_CATALOG).length === 11, "recommendation catalog should include 11 types");

  const critical = generateClinicalRecommendations({
    caseId: "case-1",
    patientId: "patient-1",
    structuredFindings: [{ code: "STEMI", label: "ST elevation MI", severity: "critical" }],
  });
  assert(critical.some((item) => item.recommendationType === "EMERGENCY_EVALUATION"), "STEMI should trigger emergency evaluation");
  assert(critical.some((item) => item.recommendationType === "TROPONIN"), "STEMI should trigger troponin");
  assert(critical[0]!.priorityScore >= critical[critical.length - 1]!.priorityScore, "recommendations should be priority sorted");

  const longQt = generateClinicalRecommendations({
    caseId: "case-2",
    patientId: "patient-2",
    qtcBazettMs: 510,
  });
  assert(longQt.some((item) => item.recommendationType === "ELECTROLYTES"), "long QT should trigger electrolytes");

  const lowQuality = generateClinicalRecommendations({
    caseId: "case-3",
    measurementConfidence: 0.4,
    patientId: "patient-3",
  });
  assert(lowQuality.some((item) => item.recommendationType === "MANUAL_REVIEW_REQUIRED"), "low quality should require manual review");

  const routine = generateClinicalRecommendations({
    caseId: "case-4",
    measurementConfidence: 0.9,
    patientId: "patient-4",
    qrsDurationMs: 90,
    qtcBazettMs: 420,
  });
  assert(routine.some((item) => item.recommendationType === "REPEAT_ECG"), "routine case should include repeat ECG");

  for (const item of critical) {
    assert(item.reasoning.length > 0, "reasoning required");
    assert(item.clinicalEvidence.length > 0, "clinical evidence required");
    assert(item.confidence > 0 && item.confidence <= 1, "confidence must be normalized");
    assert(item.supportingFindings.length >= 0, "supporting findings array required");
  }

  const followUp = generateFollowUpPlan(critical);
  assert(followUp.recommendedIntervalDays > 0, "follow-up interval required");
  assert(followUp.reminderDates.length === 2, "two reminders should be scheduled");
  assert(["CRITICAL", "EMERGENT", "URGENT", "ROUTINE"].includes(followUp.priority), "follow-up priority required");
  assert(new Date(followUp.nextEcgDate).getTime() > Date.now(), "next ECG date should be in the future");

  console.log("sprint65-clinical-decision-support.test.ts: all tests passed");
}

main();
