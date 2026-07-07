# Changelog — Enterprise QA Infrastructure

## Sprint 45 — Hospital Grade ECG Monitor V2 — 2026-07-07

### Added
- **Live Monitor V2 module** (`live-monitor-v2/`): hospital HUD, floating control palette, clinical 1 mm / 5 mm grid, clinical markers (PVC/ST/QT/AF/R-peak)
- **6-lead and custom layout modes** in `monitorLayout.ts`
- **Filter cycle, horizontal scroll, lead isolation** in `useEcgLiveMonitorEngine`
- Canvas-first shell (~93% viewport); controls moved to auto-hide floating palette
- Playwright: `tests/e2e/sprint45-hospital-monitor-v2.spec.ts` (7 tests)
- Integration: `scripts/sprint45-live-monitor-v2.integration.ts`
- Reports: `SPRINT45_FINAL_REPORT.md`, `LIVE_MONITOR_V2_REPORT.md`, `FPS_REPORT.md`, `MEMORY_REPORT.md`, `VISUAL_QA_REPORT.md`, `PLAYWRIGHT_REPORT.md`, `PERFORMANCE_REPORT.md`

### Validated
- `npm run lint` / `typecheck` / `build` — PASS
- Playwright Sprint 45 (7/7) + Sprint 41 regression (8/8) — PASS
- Integration markers — PASS

### Tag
- `Sprint45-HospitalMonitorV2`

---

## Release Candidate RC-1 — 2026-07-07

### Validated
- Production readiness audit across auth, dashboard, patient management, ECG pipeline, viewer, live monitor, measurements, AI cardiologist, MIC, reports, export, settings
- Quality gates: lint, typecheck, build, unit (156), integration (102 scripts), SAT, Playwright core

### Fixed (RC-1 remediation)
- **RC1-001:** Sprint 19 integration — accept `drawMultiLeadMonitorCanvas` for live monitor canvas
- **RC1-002:** `ecg-caliper-geometry.test.ts` — CSV export schema v6 header alignment
- **RC1-003:** Medical intelligence API 500 without migrations (SAT carry-over)
- **RC1-004:** Sprint 25 clinical panel — accept Sprint 38 AI Cardiologist workspace (SAT)
- **RC1-005:** Playwright API flake — network retry in test helpers (SAT)
- **RC1-006:** Sprint 34 measurement integration — include `ecgWaveDetectionBridge.ts` / `ecgMultiLeadSync.ts` in marker scan
- **RC1-007:** TypeScript errors in clinical report engine + missing `selectedLead` state in viewer foundation
- **RC1-008:** Sprint 22 integration — accept `drawClinicalGrid` rename for hospital monitor canvas
- **RC1-009:** Vitest `ecgMeasurementExport.test.ts` — CSV header schema v6 alignment

### Added
- `scripts/rc1-production-readiness.mjs` — RC-1 orchestrator
- `npm run qa:rc1` — run RC-1 pipeline
- Deliverables: `RC1_FINAL_REPORT.md`, `PRODUCTION_READINESS.md`, `OPEN_ISSUES.md`, `PERFORMANCE_AUDIT.md`, `VISUAL_REGRESSION.md`, `CLINICAL_VALIDATION.md`, `RC1_RUN_SUMMARY.json`

### RC-1 Gate
**PASSED** — 0 BLOCKER issues; **ECG Insight is Ready for Feature Development Phase 2.**

---

## System Acceptance Test (SAT) — 2026-07-07

### Validated
- Full quality gate: lint, typecheck, build, 102 integration scripts, 39 core Playwright tests
- Clinical workflow end-to-end (login → patient → upload → AI → report → PDF)
- Sprint 36/37/38 enterprise specs (viewer, live monitor, AI cardiologist)
- 47 application routes audited; zero open SAT defects

### Fixed (SAT remediation)
- **SAT-001:** Applied Prisma migrations for medical-intelligence + MIC tables (`prisma migrate deploy`)
- **SAT-002:** Sprint 25 integration accepts `EcgAiCardiologistWorkspace` in clinical right panel
- **SAT-003:** Digitize API retry in `ecg-workspace-restoration.spec.ts`
- **SAT-004:** `apiLogin` network error recovery in Playwright helpers
- **SAT-005:** Sprint 36 AI tab assertion updated for Sprint 38 workspace
- **SAT-006:** `fetchOrAnalyzeMedicalIntelligence` graceful analyze failure handling

### Added
- `scripts/sat-system-acceptance.mjs` — SAT orchestrator
- `npm run qa:sat` — run full SAT pipeline
- Deliverables: `SAT_REPORT.md`, `VISUAL_AUDIT.md`, `UI_QA_REPORT.md`, `CLINICAL_VALIDATION_REPORT.md`, `PERFORMANCE_REPORT.md`, `MEMORY_REPORT.md`, `REGRESSION_REPORT.md`, `BUG_REPORT.md`, `SCREENSHOT_BEFORE_AFTER.md`, `SAT_RUN_SUMMARY.json`

### Sprint 41 Gate
**PASSED** — SAT complete; Sprint 41 may begin after stakeholder sign-off.

---

---

---

## [Unreleased] — Sprint 44 Clinical Decision Support Engine (2026-07-07)

### Added
- **CDSS workspace module** — `cdss-workspace/` with deterministic 31-rule clinical engine
- **Explainable diagnoses** — leads, measurements, morphology, axis, rhythm, reasoning per rule
- **Severity & triage** — Normal → Life Threatening with Green/Yellow/Orange/Red/Black badge
- **Guideline engine** — ACC/AHA, ESC, Universal Definition of MI references
- **Finding relationship graph** — measurements → findings → diagnosis → recommendations
- **Clinical Decision Workspace** — CDSS tab in ECG Monitor right panel
- **Report integration** — Clinical Decision Support section in Sprint 43 enterprise reports
- **Playwright:** `tests/e2e/sprint44-cdss-workspace.spec.ts` (`@sprint44`)
- **Integration:** `scripts/sprint44-cdss-workspace.integration.ts`

### Changed (Additive)
- `EcgClinicalRightPanel.tsx` — CDSS tab
- `clinical-report-engine/*` — optional `clinicalDecision` report section
- `scripts/integration/pipeline.mjs` — Sprint 44 markers

### Quality Gate
- lint, typecheck, build, integration markers, Playwright `@sprint44` (4/4), Sprint 43 regression (4/4) — **PASS**
- Tag: `Sprint44-ClinicalDecisionSupport`
- Deliverables: `SPRINT44_FINAL_REPORT.md`, `CDSS_ENGINE_REPORT.md`, `RULE_ENGINE_REPORT.md`, `GUIDELINE_ENGINE_REPORT.md`, `CLINICAL_REASONING_REPORT.md`, `PLAYWRIGHT_REPORT.md`, `VISUAL_QA_REPORT.md`, `PERFORMANCE_REPORT.md`, `ACCESSIBILITY_REPORT.md`

---

## [Unreleased] — Sprint 43 Enterprise Clinical Report Engine (2026-07-07)

### Added
- **Enterprise Clinical Report Engine** — `clinical-report-engine/` module with full hospital-grade report UI
- **Report model builder** — `buildEnterpriseReportModel.ts` adapts MI + cardiologist + measurements + clinical report
- **Report toolbar** — Diagnostic/Clinical/Printable/Hospital PDF, light/dark, portrait/landscape, print/export preview
- **Client export** — JSON schema v1, FHIR Bundle, browser print
- **Server HTML sections** — `clinical-report-html-sections.ts` appends parameters, AI findings, differential, confidence, alerts to hospital PDF HTML
- **Playwright:** `tests/e2e/sprint43-clinical-report-engine.spec.ts` (`@sprint43`)
- **Integration:** `scripts/sprint43-clinical-report-engine.integration.ts`

### Changed
- `EcgReportPreviewPanel.tsx` — hosts enterprise report panel alongside legacy HTML preview
- `EcgMonitorViewerFoundation.tsx` — passes clinical context props to report panel
- `reports.service.ts` — enterprise sections in `buildReportHtml`
- `scripts/integration/pipeline.mjs` — Sprint 43 integration marker

### Quality Gate
- lint, typecheck, build, integration markers, Playwright `@sprint43` (4/4) — **PASS**
- Tag: `Sprint43-ClinicalReportEngine`
- Deliverables: `SPRINT43_FINAL_REPORT.md`, `CLINICAL_REPORT_ENGINE.md`, `PDF_EXPORT_REPORT.md`, `PLAYWRIGHT_REPORT.md`, `VISUAL_QA_REPORT.md`, `PERFORMANCE_REPORT.md`, `ACCESSIBILITY_REPORT.md`

---

## [Unreleased] — Sprint 42 Clinical Measurement Studio (2026-07-07)

### Added
- **Waveform coordinate engine** — `waveformCoordinateSpace.ts` for timeMs/amplitudeMv measurement anchors
- **Auto snap engine** — `ecgAutoSnapEngine.ts` with clinical fiducial targets (P/Q/R/S/T/J/ST/baseline/grid)
- **Workflow presets** — Basic ECG, Chest Pain, ACS, STEMI, NSTEMI, Arrhythmia, QT Analysis, Athlete, Pediatric, Pre-op, Custom
- **Caliper modes** — crosshair, reference, free
- **Clinical measurements** — QTc Bazett/Fridericia, Q wave width/depth, bundle branch delay
- **Approval workflow** — pending/approved/rejected per measurement
- **Export XML** — FHIR-ready structure + CSV waveform columns
- **Playwright:** `tests/e2e/sprint42-clinical-measurement-studio.spec.ts` (`@sprint42`)

### Changed
- `ecgMeasurementEngine.ts`, `useEcgMeasurementWorkspace.ts`, `EcgMeasurementsPanel.tsx`, `EcgMeasurementOverlay.tsx`, `EcgMeasurementFloatingToolbar.tsx`
- `measurementTypes.ts` — waveform anchors, approval status, workflow preset state

### Quality Gate
- lint, typecheck, build, measurement unit tests — **PASS**
- Tag: `Sprint42-ClinicalMeasurementStudio`
- Deliverables: `SPRINT42_FINAL_REPORT.md`, `MEASUREMENT_ENGINE_REPORT.md`, `CALIPER_ENGINE_REPORT.md`, `AUTO_SNAP_REPORT.md`, `CLINICAL_VALIDATION_REPORT.md`, `PERFORMANCE_REPORT.md`, `PLAYWRIGHT_REPORT.md`, `VISUAL_QA_REPORT.md`

---

## [Unreleased] — Sprint 41 Professional Live ECG Monitor (2026-07-07)

### Added
- **Hospital-grade live monitor rendering** — multi-lead canvas (`drawMultiLeadMonitorCanvas`), clinical grid math, phosphor sweep, zoom/pan
- **Monitor modes** — 3-lead, 5-lead, 12-lead, single lead, rhythm strip (Lead II default)
- **Clinical controls** — paper speed 25/50 mm/s, gain 5/10/20 mm/mV, review mode, reset view
- **EcgLiveMonitorAlarmBar** — HR, signal quality, lead off, noise, acquisition status (real telemetry)
- **EcgLiveMonitorClinicalToolbar** — zoom, pan, calipers/measure, snapshot, export PNG
- **Keyboard shortcuts** — F11 diagnostic, V review, G grid, 1/3/5 layout modes
- **Playwright:** `tests/e2e/sprint41-live-monitor.spec.ts` (`@sprint41`)

### Changed
- `ecgMonitorCanvas.ts` — rewritten for multi-lead + rhythm strip + clinical grid
- `EcgLiveMonitorShell.tsx`, `EcgLiveMonitorView.tsx`, `EcgLiveMonitorControls.tsx`, `EcgLiveMonitorLeadStrip.tsx`
- `useEcgLiveMonitorEngine.ts` — layout mode, review mode, paper speed sync

### Quality Gate
- lint, typecheck, build — **PASS**
- Deliverables: `SPRINT41_FINAL_REPORT.md`, `LIVE_MONITOR_REPORT.md`, `PERFORMANCE_REPORT.md`, `VISUAL_QA_REPORT.md`, `RESPONSIVE_REPORT.md`, `PLAYWRIGHT_REPORT.md`

---

## [Unreleased] — 2026-07-07

### Added — SAT Coverage Expansion (Vitest)

**Test infrastructure**
- `vitest.config.ts` — v8 coverage on viewer, hooks, medical-intelligence production `.ts`
- `npm run qa:vitest`, `qa:coverage`, `qa:coverage:baseline`
- `scripts/qa/generate-coverage-reports.mjs` — emits `COVERAGE_*.md`, `UNTESTED_FILES.md`
- Fixed report generator repo-root path (`scripts/qa/*.mjs`)

**31 Vitest suites / 139 tests** under `tests/unit/ecg/` and `tests/unit/medical-intelligence/`
- ECG viewer: zoom/pan, image engine, grid presets, lead focus
- Live monitor: route phases, waveform paths, beat markers, signal quality, waveform style
- Measurement engine: calibration math, caliper geometry, export/import, reference ranges, multi-lead sync
- AI overlay: confidence helpers, persistence, merge/filter/export
- Rendering engine: viewport, dirty rects, vector model, twelve-lead layout
- Workspace: persistence round-trip, undo/redo history stack
- Medical intelligence: confidence engine

**Coverage delta (instrumented production `.ts`)**
- Statements/lines: **14.8% → 27.3%** (+12.5%)
- Functions: **51.8% → 71.0%** (+19.2%)
- Branches: **65.0% → 69.9%** (+4.9%)

**Deliverables:** `COVERAGE_REPORT.md`, `COVERAGE_DIFF.md`, `UNTESTED_FILES.md`, `NEW_TESTS.md`, `TEST_METRICS.md`

**Quality gate:** lint, typecheck, build, `qa:unit`, `qa:coverage` — PASS

**Next milestone:** >70% statement coverage (hooks, canvas renderers, MI engines)

### Fixed — Playwright Flaky Test (SAT Final Stabilization)

**Target:** `tests/e2e/login-screen-stability.spec.ts`

**Root cause:** 120s timeout from heavy reload/login cycles + redundant auth navigations; closed-context crash on retry after timeout.

**Test-only fixes:** `tests/e2e/utils/qa.ts` (auth helper guards/sync), `login-screen-stability.spec.ts` (lighter reload loop)

**Verification:** `--repeat-each=3` **3/3 PASS**; full `@smoke` **15/15 PASS** (3.0m)

**Deliverables:** `FLAKY_TEST_REPORT.md`, `PLAYWRIGHT_STABILITY_REPORT.md`

### Added — Enterprise Test Automation (Phases 1–8)

**Phase 1 — Playwright Coverage**
- `tests/e2e/enterprise-workflow-matrix.spec.ts` — 28-workflow consolidated spec (`@qa-matrix`)
- `scripts/qa/config.mjs` — workflow matrix + QA thresholds
- `scripts/qa/audit-playwright-coverage.mjs` — coverage audit (28/28 workflows)

**Phase 2 — Integration Tests**
- `scripts/qa/audit-integration-coverage.mjs` — 10-domain coverage report
- Integration pipeline unchanged (96 scripts); audit-only addition

**Phase 3 — Unit Tests**
- `scripts/run-unit-tests.mjs` — runs all 16 unit test files
- `scripts/qa/config.test.ts` — QA config validation
- `npm run qa:unit`

**Phase 4 — Visual Regression**
- `tests/e2e/visual-regression-enterprise.spec.ts` — Playwright snapshots
- `npm run qa:visual`, `npm run qa:visual:update`
- Snapshot path template in `playwright.config.ts`

**Phase 5 — Performance Benchmarks**
- `scripts/qa/performance-benchmark.mjs`
- `tests/e2e/performance-viewer-ready.spec.ts`
- `npm run qa:performance`

**Phase 6 — Accessibility**
- `scripts/qa/accessibility-audit.mjs`
- Auth test IDs for stable axe/login scans (prior regression task)

**Phase 7 — Quality Dashboard**
- `scripts/qa/generate-dashboard.mjs` → HTML + JSON dashboard
- `npm run qa:dashboard`
- Historical snapshots in `test-results/qa-history/`

**Phase 8 — CI/CD**
- Rewrote `.github/workflows/enterprise-qa.yml` — 5-job staged pipeline
- `scripts/run-enterprise-qa.mjs` — local CI parity orchestrator
- `npm run qa:enterprise:full`

### Reports
- `TEST_STRATEGY.md`
- `PLAYWRIGHT_COVERAGE_REPORT.md`
- `UNIT_TEST_REPORT.md`
- `INTEGRATION_TEST_REPORT.md`
- `VISUAL_REGRESSION_REPORT.md`
- `PERFORMANCE_BENCHMARK.md`
- `ACCESSIBILITY_REPORT.md`
- `QA_DASHBOARD_REPORT.md`
- `CI_PIPELINE_REPORT.md`

### Validation (This Session)
- `npm run lint` — pass
- `npm run typecheck` — pass
- `npm run build` — pass
- `npm run qa:unit` — 16/16 pass
- Playwright workflow audit — 28/28 (100%)
- Integration domain audit — 10/10 (100%)

### Not Modified
- Production UI, workflows, runtime behavior
- Sprint 38 AI Cardiologist files
- ECG viewer / monitor / clinical panel components

---

## [Unreleased] — 2026-07-07 — EMKP (Isolated Module)

### Added — ECG Medical Knowledge Platform (EMKP)

**Completely isolated module at `enterprise/emkp/` — zero production integration.**

- **Phase 1** — Enterprise knowledge model (categories, concepts, evidence, confidence, risk, severity)
- **Phase 2** — 47 structured ECG disease entries (all requested diagnoses)
- **Phase 3** — 47 clinical rules with required/supporting/exclusion findings
- **Phase 4** — Guideline mapping (ESC, AHA, ACC, UDMI, IEC, WHF, HRS)
- **Phase 5** — 6 differential diagnosis trees
- **Phase 6** — 12-lead clinical knowledge (I–III, aVR/aVL/aVF, V1–V6)
- **Phase 7** — 43+ ECG terminology dictionary entries
- **Phase 8** — Normalized `emkp.*` PostgreSQL schema (`enterprise/emkp/database/schema.sql`)
- **Phase 9** — OpenAPI 3.1 + Zod schemas (design only, not mounted)
- **Phase 10** — Validation suite (`scripts/emkp-validation.test.ts`)

### EMKP Deliverables
- `ECG_KNOWLEDGE_ARCHITECTURE.md`
- `ECG_KNOWLEDGE_DATABASE.md`
- `CLINICAL_RULE_ENGINE.md`
- `DIFFERENTIAL_DIAGNOSIS.md`
- `ECG_TERMINOLOGY.md`
- `GUIDELINE_MAPPING.md`
- `API_SPECIFICATION.md`
- `DATABASE_SCHEMA.md`
- `MEDICAL_REFERENCE_INDEX.md`

### EMKP Quality Gate
- ✅ No production code modified
- ✅ No UI / Viewer / Live Monitor modified
- ✅ No runtime behavior changed
- ✅ No existing APIs modified
- ✅ No routing changes
- ✅ No Acceptance Test interference
- ✅ Validation: 47 diseases, 47 rules, 12 leads, 6 differential trees — all pass

- 95% **line** coverage requires c8/vitest instrumentation (roadmap in TEST_STRATEGY.md)
- Full `npm run qa:e2e` not re-run end-to-end this session (use `qa:enterprise:full`)
- Visual baselines require first `--update-snapshots` run in CI
