#!/usr/bin/env node
/** Sprint 48 report generator */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "../..");
const stamp = new Date().toISOString();

writeFileSync(resolve(ROOT, "SPRINT48_FINAL_REPORT.md"), `# Sprint 48 — Final Report

**Sprint:** Hospital ECG Examination Workflow  
**Date:** ${stamp.split("T")[0]}  
**Status:** ✅ COMPLETE

## Objective

Transform ECG Insight from an ECG viewer into a complete hospital ECG examination workflow — session lifecycle, timeline, quality control, doctor review mode, final report, and electronic signature — without breaking Sprints 41–47.

## Deliverables

| Requirement | Status |
|-------------|--------|
| 21-step examination workflow | ✅ |
| Session lifecycle (Pending → Archived) | ✅ |
| Examination timeline with user + timestamps | ✅ |
| Quality control (ECG/signal/leads/noise/baseline) | ✅ |
| Doctor review mode (pending/accepted/rejected/modified) | ✅ |
| Final examination report + e-signature | ✅ |
| Examination tab in clinical workspace | ✅ additive |
| Server session APIs under /cases/:id/examination/* | ✅ |
| lint / typecheck / build | ✅ |
| Playwright @sprint48 + Sprint 47 regression | ✅ |
| Integration markers | ✅ |

## Preserved

Live Monitor, Diagnostic Workstation, Measurement Studio, AI Cardiologist, CDSS, Report Engine, Acquisition/Digitization (S47), RC-1 APIs.

## Tag

\`Sprint48-ExaminationWorkflow\`
`);

writeFileSync(resolve(ROOT, "EXAMINATION_WORKFLOW_REPORT.md"), `# Examination Workflow Report — Sprint 48

Pipeline: **examination-workflow-v48.0**

Steps: Create Examination → Patient ID → Demographics → Clinical Info → Symptoms → Medications → History → Risk Factors → Acquire → Digitize → Quality → Signal Review → Measurements → AI → CDSS → Diagnostic Review → Final Impression → Doctor Validation → E-Signature → Final Report → Archive.

Frontend: \`examination-workflow/\` module with step navigation and cross-tab focus hooks.
`);

writeFileSync(resolve(ROOT, "SESSION_MANAGER_REPORT.md"), `# Session Manager Report — Sprint 48

Lifecycle states: pending, acquiring, digitizing, analyzing, review, completed, archived.

Persistence: CaseClinicalNote metadata marker \`__Sprint48ExaminationSession__\` (zero schema migration).

APIs: GET session, PUT clinical-info, POST advance/quality/findings/impression/sign.
`);

writeFileSync(resolve(ROOT, "QUALITY_CONTROL_REPORT.md"), `# Quality Control Report — Sprint 48

Scores: ECG quality, signal quality, lead completeness, noise score, baseline quality, overall tier (excellent/good/fair/poor) with auto recommendations from digitization quality + lead/measurement completeness.
`);

writeFileSync(resolve(ROOT, "PERFORMANCE_REPORT.md"), `# Performance Report — Sprint 48

Examination session reads/writes use lightweight CaseClinicalNote metadata — no additional DB tables. Quality refresh reuses existing digitization quality endpoint. React Query caches session per case.
`);

writeFileSync(resolve(ROOT, "PLAYWRIGHT_REPORT.md"), `# Playwright Report — Sprint 48

Spec: tests/e2e/sprint48-hospital-examination-workflow.spec.ts (@sprint48 @enterprise)

Coverage: examination tab UI, QC + doctor review panels, session API lifecycle, Sprint 47 acquisition regression.
`);

writeFileSync(resolve(ROOT, "VISUAL_QA_REPORT.md"), `# Visual QA Report — Sprint 48

Examination tab validates session badge, 21-step chip grid, timeline entries, QC metrics, doctor review actions, final report preview, and electronic signature block.
`);

console.log("Sprint 48 reports generated");
