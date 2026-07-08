import { runIntegrationMain } from "./finish-integration";
import { generateClinicalRecommendations } from "../server/src/modules/clinical-decision-support/recommendation-engine";
import { generateFollowUpPlan } from "../server/src/modules/clinical-decision-support/follow-up-engine";
import { buildSyntheticTwelveLeadEcg } from "./ecg-diagnostic-engine-synthetic";
import { measureFromLeads } from "../server/src/modules/ecg-measurement";
import { runMedicalIntelligenceFromMeasurements } from "../server/src/modules/medical-intelligence/orchestrator";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function main() {
  const { calibration, leads } = buildSyntheticTwelveLeadEcg({ bpm: 72, noise: 0 });
  const measurement = measureFromLeads({ calibration, leads });
  const medicalReport = runMedicalIntelligenceFromMeasurements(measurement);

  const recommendations = generateClinicalRecommendations({
    caseId: "integration-case",
    heartRate: measurement.heartRate,
    measurementConfidence: measurement.confidence,
    patientId: "integration-patient",
    prIntervalMs: measurement.intervals.prIntervalMs,
    qrsDurationMs: measurement.intervals.qrsDurationMs,
    qtcBazettMs: measurement.intervals.qtcBazettMs,
    rhythm: measurement.rhythm,
    structuredFindings: medicalReport.findings.map((finding) => ({
      code: finding.code,
      label: finding.label,
      severity: finding.severity,
    })),
  });

  assert(recommendations.length > 0, "integration pipeline should generate recommendations");
  assert(recommendations.every((item) => item.action.length > 0), "each recommendation needs action text");
  assert(recommendations.every((item) => item.priorityScore >= 0), "priority score required");

  const followUp = generateFollowUpPlan(recommendations);
  assert(followUp.nextEcgDate, "follow-up next ECG date required");
  assert(followUp.recommendedIntervalDays > 0, "recommended interval required");

  console.log("sprint65-clinical-decision-support.integration.ts: all tests passed");
}

runIntegrationMain(main, "sprint65-clinical-decision-support.integration.ts");
