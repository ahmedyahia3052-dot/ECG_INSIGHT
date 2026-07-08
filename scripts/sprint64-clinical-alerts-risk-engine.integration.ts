/**
 * Sprint 64 — Clinical Alerts & Risk Stratification Engine integration markers.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const MOD = resolve(ROOT, "server/src/modules/clinical-alerts-risk-engine");

function assertFileContains(file: string, markers: string[]) {
  const text = readFileSync(file, "utf8");
  for (const marker of markers) {
    if (!text.includes(marker)) throw new Error(`Missing marker "${marker}" in ${file}`);
  }
}

const files = [
  {
    file: resolve(MOD, "alert-engine.ts"),
    markers: [
      "detectClinicalAlerts",
      "CRITICAL_QT_PROLONGATION",
      "ATRIAL_FIBRILLATION",
      "POSSIBLE_ACUTE_MI",
      "POSSIBLE_HYPERKALEMIA",
    ],
  },
  {
    file: resolve(MOD, "risk-engine.ts"),
    markers: ["calculateRiskAssessment", "riskCategory", "clinicalPriority", "urgency"],
  },
  {
    file: resolve(MOD, "repository.ts"),
    markers: [
      "persistDetectedAlerts",
      "persistRiskAssessment",
      "recordAlertHistory",
      "eCGRiskAssessment",
      "eCGAlertHistory",
    ],
  },
  {
    file: resolve(MOD, "clinical-alerts-risk.routes.ts"),
    markers: [
      "/alerts/:caseId",
      "/risk/:caseId",
      "/risk/recalculate/:caseId",
      "clinicalAlertsRiskEngineRouter",
    ],
  },
  {
    file: resolve(ROOT, "prisma/schema.prisma"),
    markers: [
      "ECGRiskAssessment",
      "ECGRiskFactor",
      "ECGAlertHistory",
      "EcgAlertSeverity",
      "EcgAlertCode",
    ],
  },
  {
    file: resolve(ROOT, "prisma/migrations/20260708070000_sprint64_clinical_alerts_risk_engine/migration.sql"),
    markers: ["ECGRiskAssessment", "ECGRiskFactor", "ECGAlertHistory", "EcgAlertCode"],
  },
  {
    file: resolve(ROOT, "server/src/modules/index.ts"),
    markers: ["/clinical-alerts-risk-engine", "clinicalAlertsRiskEngineRouter"],
  },
];

for (const entry of files) {
  assertFileContains(entry.file, entry.markers);
}

console.log("Sprint 64 Clinical Alerts & Risk Stratification Engine integration markers: PASS");
