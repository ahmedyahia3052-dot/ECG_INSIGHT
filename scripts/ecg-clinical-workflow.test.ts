import assert from "node:assert/strict";

import { buildClinicalAlerts } from "../artifacts/ecg-insight/components/ecg/viewer/clinical-workflow/alerts";
import {
  buildCaseTimelineEvents,
  buildWorkflowSteps,
  canNavigateToStep,
  navigateWorkflowStep,
  smartToolGroupForViewMode,
  workflowProgress,
} from "../artifacts/ecg-insight/components/ecg/viewer/clinical-workflow/engine";
import { WORKFLOW_STEP_ORDER } from "../artifacts/ecg-insight/components/ecg/viewer/clinical-workflow/types";

const baseCase = {
  caseId: "CASE-001",
  caseNumber: "ECG-2026-001",
  files: [{ downloadUrl: "/files/ecg.png", mimeType: "image/png" }],
  id: "case-1",
  imagePath: "/uploads/ecg.png",
  patientId: "patient-1",
  uploadDate: "2026-01-01T10:00:00.000Z",
} as const;

const digitalEcg = {
  calibration: { confidence: 0.9, gainMmPerMv: 10, gridDetected: true, paperSpeedMmPerSec: 25 },
  extractionTimestamp: "2026-01-01T10:05:00.000Z",
  leads: [{ durationSeconds: 10, lead: "II", samples: [0, 1, 0, 2], samplingRate: 500 }],
  measurementEngine: { heartRate: 72 },
  preprocessing: { contrastEnhanced: true },
  quality: { score: 88, warnings: [] },
  status: "available" as const,
};

const analysis = {
  confidenceScore: 0.91,
  createdAt: "2026-01-01T10:10:00.000Z",
  diagnosis: "Normal sinus rhythm",
  interpretation: "No acute ischemic changes.",
  recommendations: ["Routine follow-up"],
  severity: "normal" as const,
  urgentActions: [],
};

assert.equal(WORKFLOW_STEP_ORDER.length, 16);

const freshSteps = buildWorkflowSteps({
  caseRecord: baseCase as never,
  currentViewMode: "image",
});
assert.equal(freshSteps.length, 16);
assert.equal(freshSteps[0]?.status, "complete");
assert.ok(freshSteps.some((step) => step.status === "current"));

const advancedSteps = buildWorkflowSteps({
  analysis,
  caseRecord: baseCase as never,
  clinicalNotes: "Reviewed and stable.",
  currentViewMode: "waveform",
  digitalEcg: digitalEcg as never,
  measurementCount: 4,
  reports: [{ generatedAt: "2026-01-01T11:00:00.000Z", id: "r1", status: "draft" } as never],
});
assert.ok(advancedSteps.filter((step) => step.status === "complete").length >= 8);
assert.equal(workflowProgress(advancedSteps), Math.round((advancedSteps.filter((s) => s.status === "complete").length / 16) * 100));

const signalNav = navigateWorkflowStep("signal-reconstruction");
assert.equal(signalNav.viewMode, "waveform");

const compareNav = navigateWorkflowStep("comparison");
assert.equal(compareNav.compareMode, true);
assert.equal(compareNav.viewMode, "compare");

const notesNav = navigateWorkflowStep("doctor-notes");
assert.equal(notesNav.notesTab, true);

const currentStep = advancedSteps.find((step) => step.id === "signal-reconstruction");
assert.ok(currentStep);
assert.equal(canNavigateToStep(currentStep!), true);

const disabledFuture = freshSteps.find((step) => step.id === "digital-signature");
assert.ok(disabledFuture);
assert.equal(canNavigateToStep(disabledFuture!), false);

const timeline = buildCaseTimelineEvents({
  analysis,
  caseRecord: baseCase as never,
  currentViewMode: "ai-review",
  digitalEcg: digitalEcg as never,
  measurementCount: 2,
});
assert.ok(timeline.some((event) => event.id === "upload" && event.status === "complete"));
assert.ok(timeline.some((event) => event.id === "ai" && event.status === "complete"));
assert.ok(timeline.some((event) => event.status === "current"));

const alerts = buildClinicalAlerts({
  analysis,
  caseRecord: baseCase as never,
  currentViewMode: "ai-review",
  digitalEcg: digitalEcg as never,
});
assert.ok(alerts.length > 0);

assert.deepEqual(smartToolGroupForViewMode("image"), ["FILE", "VIEW", "DIGITIZE", "EXPORT"]);
assert.deepEqual(smartToolGroupForViewMode("ai-review"), ["FILE", "AI", "MEASURE", "EXPORT"]);
assert.deepEqual(smartToolGroupForViewMode("report"), ["FILE", "REPORT", "EXPORT"]);

console.log("ecg-clinical-workflow.test.ts: all Sprint 30 unit tests passed");
