/**
 * Sprint 63 — ECG Longitudinal Timeline & Follow-up Engine integration markers.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const MOD = resolve(ROOT, "server/src/modules/ecg-longitudinal-timeline-engine");

function assertFileContains(file: string, markers: string[]) {
  const text = readFileSync(file, "utf8");
  for (const marker of markers) {
    if (!text.includes(marker)) throw new Error(`Missing marker "${marker}" in ${file}`);
  }
}

const files = [
  {
    file: resolve(MOD, "services/timeline.service.ts"),
    markers: ["syncPatientTimeline", "getPatientTimeline", "getCaseChronologicalHistory", "getAdjacentCase"],
  },
  {
    file: resolve(MOD, "services/comparison-history.service.ts"),
    markers: ["compareEcgCases", "eCGComparisonHistory", "ECG_TREND_ANALYSIS_GENERATED"],
  },
  {
    file: resolve(MOD, "services/trend-analysis.service.ts"),
    markers: [
      "HEART_RATE_TREND",
      "QT_PROLONGATION",
      "QRS_WIDENING",
      "AXIS_DEVIATION",
      "ST_IMPROVEMENT",
      "ST_WORSENING",
      "RHYTHM_EVOLUTION",
      "BUNDLE_BRANCH_PROGRESSION",
      "LVH_PROGRESSION",
      "AF_BURDEN",
      "PVC_BURDEN",
    ],
  },
  {
    file: resolve(MOD, "services/follow-up.service.ts"),
    markers: ["buildFollowUpSummary", "Compared with previous ECG", "Recommend clinical follow-up"],
  },
  {
    file: resolve(MOD, "controllers/timeline.routes.ts"),
    markers: [
      "ecgLongitudinalPatientsRouter",
      "ecgLongitudinalCasesRouter",
      "/:patientId/timeline",
      "/:caseId/history",
      "/:caseId/previous",
      "/:caseId/next",
      "/:caseId/compare/:previousCaseId",
    ],
  },
  {
    file: resolve(ROOT, "prisma/schema.prisma"),
    markers: [
      "model ECGTimeline",
      "model ECGFollowUp",
      "model ECGComparisonHistory",
      "model ECGTrendSnapshot",
      "ECG_TIMELINE_VIEWED",
      "ECG_COMPARISON_PERFORMED",
    ],
  },
  {
    file: resolve(ROOT, "prisma/migrations/20260708071000_sprint63_ecg_longitudinal_timeline/migration.sql"),
    markers: ["ECGTimeline", "ECGFollowUp", "ECGComparisonHistory", "ECGTrendSnapshot"],
  },
  {
    file: resolve(ROOT, "server/src/modules/index.ts"),
    markers: ["ecgLongitudinalCasesRouter", "ecgLongitudinalPatientsRouter"],
  },
];

for (const entry of files) {
  assertFileContains(entry.file, entry.markers);
}

console.log("Sprint 63 ECG Longitudinal Timeline integration markers: PASS");
