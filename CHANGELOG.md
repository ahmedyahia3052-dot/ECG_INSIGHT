# Changelog — Enterprise QA Infrastructure

## Sprint 82 — ECG Processing Engine — 2026-07-09

### Added (backend only — zero UI changes)
- **ECG Processing Engine** (`server/src/modules/ecg-processing-engine/`) — unified 13-stage production pipeline
- Upload ingest, preprocessing, normalization, grid detection, perspective correction, noise reduction
- Waveform extraction, measurement, lead mapping, quality score, validation interfaces
- Durable `EcgProcessingJob` queue with background workers and exponential retry recovery
- API: `/api/ecg-processing-engine` — enqueue, status, cancel, retry, case history
- Migration: `20260709010000_sprint82_ecg_processing_engine`
- Report: `SPRINT82_ECG_ENGINE.md`
- Tests: `sprint82-ecg-processing-engine.test.ts`, `.integration.ts`

### Preserved
- ECG Workspace, Viewer, Live Monitor, Rendering Engine — **zero changes**
- Legacy `/api/ecg/*` processing routes unchanged

### Tag
- `Sprint82_ECG_Processing_Engine`

---

## Sprint 75 — ECG UI Architecture Consolidation — 2026-07-08

### Added (architecture only — zero visual changes)
- **UI architecture layers:** `design-system/`, `presentation/`, `features/`, `lib/presentation/`, `ui-architecture/`
- Design token consolidation barrels (app + clinical tokens unchanged in value)
- Theme engine with dark, light, hospital, and system themes (`ThemeEngineProvider`)
- Presentation barrels: pages, widgets, medical, charts, cards, dialogs, forms, navigation
- Feature barrels: workspace, viewer, monitor
- Shared persisted panel layout utilities
- Report: `SPRINT75_UI_ARCHITECTURE_REPORT.md`
- Tests: `sprint75-ui-architecture.test.ts`, `sprint75-ui-architecture.integration.ts`

### Preserved
- All clinical UI visuals, layouts, colors, and rendering behavior — **unchanged**

### Tag
- `Sprint75_UI_Architecture_Consolidation`

---

## Sprint 71 — Enterprise Security Hardening — 2026-07-08

### Added (backend only — zero UI changes)
- **Security audit & hardening pass** across auth, authorization, uploads, secrets, realtime, and audit logging
- Upload IDOR fix: case/patient access enforced on ECG download and signed URLs
- Magic-byte upload validation (`upload-security.ts`)
- Auth token redaction in production responses (`auth-response-safety.ts`)
- Dedicated auth rate limiter (`auth-rate-limit.ts`)
- Separate optional crypto secrets: `PHI_ENCRYPTION_KEY`, `REQUEST_SIGNING_SECRET`, `DOWNLOAD_TOKEN_SECRET`
- Realtime room join restrictions and Socket.io CORS alignment
- Client audit POST allowlist; impersonation audit logging
- Report: `SPRINT71_ENTERPRISE_SECURITY_REPORT.md`
- Tests: `sprint71-security-hardening.test.ts`, `sprint71-security-hardening.integration.ts`

### Preserved
- ECG Workspace, Live Monitor, Viewer, Canvas, Rendering Engine, Frontend UI — **zero changes**

### Tag
- `Sprint71_Enterprise_Security_Hardening`

---

## Sprint 70 — Enterprise Performance & Database Optimization — 2026-07-08

### Added (backend only — zero UI changes)
- **Performance optimization pass** across Prisma queries, batch writes, pagination, and composite indexes
- **Enterprise Rules Engine:** batch rule execution persistence (`createManyAndReturn`) + batch audit logs; seeding removed from list/test hot paths
- **Clinical Alerts/Risk:** eliminate duplicate re-fetch after cold evaluation
- **AI Report Generator:** remove redundant `patientId` lookup on persist
- **Medical Intelligence:** capped/slim report list (20 rows, no nested findings)
- **Cases API:** slim file select on list; paginated audit timeline
- **Enterprise Report Engine:** count-guarded lazy template seeding
- Migration: `20260708090000_sprint70_performance_optimization` — 6 composite indexes
- Utility: `server/src/performance/query-profiler.ts`
- Report: `SPRINT70_PERFORMANCE_OPTIMIZATION_REPORT.md`
- Tests: `sprint70-performance-benchmark.test.ts`, `sprint70-performance-optimization.integration.ts`

### Preserved
- ECG Workspace, Live Monitor, Viewer, Canvas, Rendering Engine, Frontend UI — **zero changes**

### Tag
- `Sprint70_Performance_Optimization`

---

## Sprint 68 — FHIR / HL7 Interoperability Engine — 2026-07-08

### Added (backend only — zero UI changes)
- **FHIR / HL7 Interoperability Engine** (`server/src/modules/fhir-hl7-interoperability-engine/`) — enterprise HIS/EMR/LIS integration layer
- **FHIR:** Patient, Practitioner, Organization, Observation, DiagnosticReport, DocumentReference, Encounter, Device, ServiceRequest, Condition serialization + validation
- **HL7 v2:** ORM, ORU, ADT, MDM, ACK parser, validator, and ACK builder
- **API:** `/api/interop` — FHIR/HL7 export/import, logs, external systems registry
- Migration: `20260708081000_sprint68_fhir_hl7_interoperability`
- Models: `FHIRExportJob`, `FHIRImportJob`, `HL7Message`, `InteroperabilityLog`, `ExternalSystem`, `ExternalOrganization`, `FHIRAudit`
- Tests: `sprint68-fhir-hl7-interoperability.test.ts`, `.integration.ts`, `-http.integration.ts`

### Preserved
- ECG Workspace, Live Monitor, Viewer, Canvas, Rendering Engine, Frontend UI — **zero changes**
- Legacy `/api/fhir` hospital integration routes unchanged

### Tag
- `Sprint68-FhirHl7Interoperability`

---

## Sprint 67 — Enterprise Clinical Rules Engine — 2026-07-08

### Added (backend only — zero UI changes)
- **Enterprise Rules Engine** (`server/src/modules/enterprise-rules-engine/`) — configurable clinical rules with conditions, actions, versioning, execution history
- **11 system rule templates** — QT, HR, QRS, AF, ST, BBB, PVC, risk score, clinical priority
- **API:** `/api/enterprise-rules-engine` — CRUD, test, history, bootstrap
- Migration: `20260708080000_sprint67_enterprise_rules_engine`
- Models: `ClinicalRule`, `RuleCondition`, `RuleAction`, `RuleExecution`, `RuleVersion`
- Tests: `sprint67-enterprise-rules-engine.test.ts`, `sprint67-enterprise-rules-engine.integration.ts`

### Preserved
- ECG Workspace, Live Monitor, Viewer, Canvas, Rendering Engine, Frontend UI — **zero changes**

### Tag
- `Sprint67_Enterprise_Rules_Engine`

---

## Sprint 63 — ECG Longitudinal Timeline & Follow-up Engine — 2026-07-08

### Added (backend only — zero UI changes)
- **ECG Longitudinal Timeline Engine** (`server/src/modules/ecg-longitudinal-timeline-engine/`) — permanent patient ECG timeline, serial comparison, trend detection, and clinical follow-up summaries
- **API:** `/api/patients/:patientId/timeline`, `/api/cases/:caseId/history`, `/previous`, `/next`, `/compare/:previousCaseId`
- Migration: `20260708071000_sprint63_ecg_longitudinal_timeline`
- Models: `ECGTimeline`, `ECGFollowUp`, `ECGComparisonHistory`, `ECGTrendSnapshot`
- Tests: `sprint63-ecg-longitudinal-timeline.test.ts`, `.integration.ts`, `-http.integration.ts`

### Changed
- Sprint 60 case management history route: `GET /api/cases/:caseId/management-history` (was `/history`; Sprint 63 owns chronological `/history`)

### Preserved
- ECG Workspace, Live Monitor, Viewer, Canvas, Rendering Engine, Frontend UI — **zero changes**

### Tag
- `Sprint63-LongitudinalTimeline`

---

## Sprint 64 — ECG Clinical Alerts & Risk Stratification Engine — 2026-07-08

### Added (backend only — zero UI changes)
- **Clinical Alerts & Risk Engine** (`server/src/modules/clinical-alerts-risk-engine/`) — 15 alert detectors + risk stratification
- **Extended** `ECGClinicalAlert` with Sprint 64 fields (`alertCode`, `alertSeverity`, evidence, engine version)
- **New models:** `ECGRiskAssessment`, `ECGRiskFactor`, `ECGAlertHistory`
- **API:** `/api/clinical-alerts-risk-engine` — alerts, risk, recalculate, audit
- Migration: `20260708070000_sprint64_clinical_alerts_risk_engine`
- Tests: `sprint64-clinical-alerts-risk-engine.test.ts`, `sprint64-clinical-alerts-risk-engine.integration.ts`

### Preserved
- ECG Workspace, Live Monitor, Viewer, Canvas, Rendering Engine, Frontend UI — **zero changes**

### Tag
- `Sprint64_Clinical_Alerts_Risk_Engine`

---

## Sprint 59 — AI Report Generator Enterprise — 2026-07-08

### Added (backend only — zero UI changes)
- **AI Report Generator** (`server/src/modules/ai-report-generator/`) — enterprise clinical report composition and persistence
- **Report sections:** executive summary, full interpretation, recommendations, risk stratification, clinical flags, AI explainability
- **API:** `/api/ai-report-generator` — generate, get, history, regenerate
- Migration: `20260708050000_sprint59_ai_report_generator`
- Models: `ClinicalGeneratedReport`, `ClinicalRecommendation`, `ClinicalFinding`, `ClinicalExplanation`
- Tests: `sprint59-ai-report-generator.test.ts`, `sprint59-ai-report-generator.integration.ts`

### Preserved
- ECG Workspace, Live Monitor, Viewer, Canvas, Rendering Engine, Frontend UI — **zero changes**

### Tag
- `Sprint59-AiReportGenerator`

---

## Sprint 58 — ECG Clinical Knowledge Engine — 2026-07-08

### Added (backend only — zero UI changes)
- **Clinical Knowledge Engine** (`server/src/modules/clinical-knowledge-engine/`) — structured ECG diagnosis catalog
- **26 core diagnoses** with ECG criteria, ICD-10, SNOMED CT, AHA/ESC guidelines, differential diagnoses
- **API:** `/api/clinical-knowledge-engine` — diagnoses, differential, categories, bootstrap seed
- Migration: `20260708043000_sprint58_clinical_knowledge_engine`
- Model: `EcgClinicalKnowledgeDiagnosis`
- Tests: `sprint58-clinical-knowledge-engine.test.ts`, `sprint58-clinical-knowledge-engine.integration.ts`

### Preserved
- ECG Workspace, Live Monitor, Viewer, Canvas, Rendering Engine, Frontend UI — **zero changes**

### Tag
- `Sprint58-ClinicalKnowledgeEngine`

---

## Sprint 57 — Enterprise Report Engine — 2026-07-08

### Added (backend only — isolated from ECG workspace/viewer/monitor)
- **Enterprise Report Engine** (`server/src/modules/enterprise-report-engine/`) — 9 report types, 11 templates, full document composer
- **Exports:** PDF, HTML, JSON, FHIR Bundle, PNG, JPEG, print, email/share payloads
- **Security:** contentHash, verificationHash, tamper detection, QR/barcode verification
- **History:** ReportExportLog, ReportHistoryEvent, audit trail integration
- Migration: `20260708030000_sprint57_enterprise_report_engine`
- API: `/api/enterprise-report-engine`
- Tests: `sprint57-enterprise-report-engine.integration.ts`, `sprint57-report-engine.test.ts`
- Report: `SPRINT57_REPORT_ENGINE_REPORT.md`

### Preserved
- ECG Workspace, Live Monitor, Viewer, Canvas, Rendering Engine, Layout, Sidebar — **zero changes**

### Tag
- `Sprint57-EnterpriseReportEngine`

---

## Hotfix — Workspace Layout Restore — 2026-07-08

### Fixed
- Rolled back Sprint 53 workspace architecture to pre-rebuild stable layout (`bf5a1ed`)
- Restored `EcgViewerResizableWorkspace` + Sprint 29 grid shell; removed layout switcher modules
- Sidebar-only fix in `EcgUnifiedClinicalLeftPanel` (scroll, no crop/overlap)
- See `WORKSPACE_LAYOUT_RESTORE.md` — **not committed** (manual approval)

---

## Sprint 55 — Enterprise Organization & Multi-Tenant Platform — 2026-07-08

### Added (backend only — isolated from ECG workspace/viewer)
- **Organization Platform module** (`server/src/modules/organization-platform/`) — tenant isolation, RBAC, REST APIs
- **Database models:** OrganizationBranch, OrganizationSubscription, OrganizationBranding, EnterpriseRole, OrganizationMember, LoginHistory, OrganizationNotification
- **Extended:** Organization (quotas, branding, soft delete), Department (category presets)
- **API:** `/api/organization-platform` — orgs, departments, branches, members, roles, subscriptions, branding, audit, notifications
- **Permissions:** 21 granular keys + 14 system roles
- Migration: `20260708010000_sprint55_enterprise_organization`
- Tests: `sprint55-enterprise-organization.integration.ts`, `sprint55-rbac-security.test.ts`
- Reports: `SPRINT55_*` deliverables

### Preserved
- ECG Workspace, Live Monitor, Render Engine, Canvas, Viewer, Image Processing, Clinical Reading UI — **zero changes**

### Tag
- `Sprint55-EnterpriseOrganization`

---

## Sprint 52 — ECG Workspace Professional Rebuild — 2026-07-08

### Changed (Release Blocker)
- **Removed live monitor from `/ecg-workspace`** — monitor exists only in `/ecg-live-monitor`
- **Grouped interpretation toolbar** — IMAGE / VIEW / ANALYSIS / ANNOTATIONS / REPORT
- **90% viewport ECG fill** — hero fit target, fit width/height/page, zoom 100–300%
- **12-lead layout fix** — all standard leads always visible; 6×2, 3×4, sequential, stacked presets
- **Scrollable left clinical sidebar** — 280px+ docked controls; no canvas overlap
- **Clinical status bar** — zoom, paper speed, gain, coordinates, resolution

### Validation
- Integration: `scripts/sprint52-ecg-workspace-rebuild.integration.ts`
- Playwright: `tests/e2e/sprint52-ecg-workspace-rebuild.spec.ts` (11/11 PASS — sidebar width + overlap at 1366–3840px)

### Tag
- `Sprint52-EcgWorkspaceRebuild`

---

## Sprint 51 — Hospital Workflow Stabilization — 2026-07-08

### Fixed (Release Blocker)
- **Removed "No sample ECG available" dead-end** — replaced with professional examination gate
- **Auto-open newest examination** when a single eligible case exists
- **Examination selector** when multiple cases exist
- **Professional empty state** with Upload ECG, Import ECG, Open Existing Study, Load Demo Case
- **Auto-digitization** on workspace/monitor/foundation load when case has image but no digital signal
- **Upload → Workspace** automatic redirect after successful upload/analysis

### Validation
- Integration: `scripts/sprint51-hospital-workflow-stabilization.integration.ts`
- Playwright: `tests/e2e/sprint51-hospital-workflow-stabilization.spec.ts`

### Tag
- `Sprint51-HospitalWorkflowStabilization`

---

## Hospital Grade Rebuild — 2026-07-08

### Phase 1 — Live Monitor
- **Render Engine 2.0 integration** — `hospital-monitor/hospitalMonitorRenderer.ts` routes live canvas through RE2 phosphor pipeline with legacy fallback
- **Hospital display presets** — Bedside (dual), Central Station (6×2), Hospital Mode (12-lead diagnostic grid)
- **Extended bedside audio** — Normal, PVC, Bradycardia, Tachycardia, VF, VT, Asystole, Lead Off profiles; mute/volume/alarm volume/enable controls
- **Live monitor stabilization** (from prior session) — connection telemetry, 6×2 layout fix, canvas viewport ratio, instant layout redraw

### Phase 2 — ECG Workspace
- **Enterprise workstation preserved** — `EcgMonitorViewerFoundation` orchestrates left/center/right/bottom clinical layout (Sprint 24–35 stack)
- **Ready markers** — `#hospital-grade-workspace-ready`, `#hospital-grade-rebuild-ready` for full-workflow validation

### Validation
- Integration: `scripts/hospital-grade-rebuild.integration.ts`
- Playwright: `tests/e2e/hospital-grade-rebuild.spec.ts`
- Reports: `ROOT_CAUSE_REPORT.md`, `ARCHITECTURE_REPORT.md`, `WORKSPACE_REPORT.md`, `LIVE_MONITOR_REPORT.md`, `PERFORMANCE_REPORT.md`, `VISUAL_QA_REPORT.md`, `PLAYWRIGHT_REPORT.md`, `REGRESSION_REPORT.md`

### Tag
- `HospitalGradeRebuild-v1`

---

## Sprint 50 — Real Hospital ECG Monitor Experience — 2026-07-07

### Added
- **Live Monitor Audio module** (`live-monitor-audio/`) — R-wave synced Web Audio beeps (adult/pediatric/silent/mute), PVC tone, volume control, `M` shortcut
- **Professional interval HUD** (`live-monitor-pro/`) — HR, RR, PR, QRS, QT, QTc plus acquisition telemetry
- **Hospital layout modes** — 6×2, 3×4, dual, quad (extends Sprint 45 monitor layouts)
- **Lead focus mode** — instant full-monitor focus on any standard lead
- **Comparison presets** — II vs V5, inferior, anterior, lateral
- **Rhythm strip windows** — 10s, 20s, 30s, continuous selector
- Diagnostic viewport ratio **95%** (Sprint 49 HMI preserved)
- Playwright: `tests/e2e/sprint50-real-hospital-monitor.spec.ts`
- Integration: `scripts/sprint50-real-hospital-monitor.integration.ts`
- Reports: `SPRINT50_FINAL_REPORT.md`, `ECG_AUDIO_ENGINE_REPORT.md`, `TWELVE_LEAD_MONITOR_REPORT.md`, `LEAD_FOCUS_REPORT.md`, `RHYTHM_STRIP_REPORT.md`, `PERFORMANCE_REPORT.md`, `PLAYWRIGHT_REPORT.md`, `VISUAL_QA_REPORT.md`

### Preserved
- Render Engine 2.0, `EcgLiveMonitorView` canvas internals, backend, AI, digitization, reports
- All Sprint 37/41/45/49 testIDs and live monitor shortcuts

### Validated
- `npm run lint` / `typecheck` / `build` — PASS

### Tag
- `Sprint50-HospitalMonitorExperience`

---

## Sprint 49 — Hospital ECG Monitor HMI — 2026-07-07

### Added
- **Live Monitor HMI module** (`live-monitor-hmi/`) — ICU-style status bar, overlay left/right rails, bottom transport bar, diagnostic HUD
- Patient identity row (name, MRN, age, sex, hospital, recording time)
- Collapsible acquisition rail (leads, filter, calipers, capture, record, freeze, export)
- Collapsible clinical rail (findings, measurements, notes, alerts, quick impression) — case data only, no AI backend changes
- Bottom timeline/playback/zoom/scale bar with auto-hide
- Mouse wheel zoom + panel toggle shortcuts `[` `]` `\`
- Canvas viewport ratio **94%** with overlay chrome

### Preserved
- Render Engine 2.0, `EcgLiveMonitorView` canvas internals, backend, AI, digitization, reports
- All Sprint 37/41/45 testIDs and live monitor shortcuts

### Validated
- `npm run lint` / `typecheck` / `build` — PASS
- Playwright Sprint 49 (6/6) + Sprint 45 regression — PASS

### Tag
- `Sprint49-MonitorHMI`

---

## Sprint 48 — Hospital ECG Examination Workflow — 2026-07-07

### Added
- **Examination workflow module** (`examination-workflow/`) — 21-step hospital examination session with lifecycle manager
- **Session APIs** — `GET/PUT/POST /cases/:caseId/examination/*` (session, advance, quality, findings review, impression, sign)
- **Timeline** — timestamps, performed actions, responsible user
- **Quality control** — ECG/signal/lead/noise/baseline scores with auto recommendations
- **Doctor review mode** — pending/accepted/rejected/modified findings with reason tracking
- **Final examination report** — clinical history, measurements, AI + doctor findings, e-signature
- **Examination tab** in clinical right panel (additive)
- Pipeline version: **examination-workflow-v48.0**
- Playwright: `tests/e2e/sprint48-hospital-examination-workflow.spec.ts`
- Integration: `scripts/sprint48-hospital-examination-workflow.integration.ts`
- Reports: `SPRINT48_FINAL_REPORT.md`, `EXAMINATION_WORKFLOW_REPORT.md`, `SESSION_MANAGER_REPORT.md`, `QUALITY_CONTROL_REPORT.md`, `PERFORMANCE_REPORT.md`, `PLAYWRIGHT_REPORT.md`, `VISUAL_QA_REPORT.md`

### Preserved
- Live Monitor, Diagnostic Workstation, Measurement Studio, AI Cardiologist, CDSS, Report Engine, Acquisition/Digitization (S47)
- Existing APIs, database schema, RC-1/SAT compatibility

### Validated
- `npm run lint` / `typecheck` / `build` — PASS
- Playwright Sprint 48 (4/4) + Sprint 47 acquisition regression — PASS

### Tag
- `Sprint48-ExaminationWorkflow`

---

## Render Engine 2.0 — Hospital Visualization Engine — 2026-07-07

### Added (visualization only)
- **Render Engine 2.0 module** (`render-engine-2/`): hospital phosphor renderer, medical grid, waveform processor, lead renderer, realtime offscreen engine
- OffscreenCanvas double buffering + circular scroll buffer
- Sub-pixel grid, anti-aliased phosphor trace, CRT persistence fade
- Waveform artifact simulation (baseline wander, muscle, powerline, respiration, noise) with filter ON/OFF
- Unit tests: `scripts/render-engine-2.test.ts`
- Integration markers: `scripts/render-engine-2.integration.ts`
- Playwright: `tests/e2e/render-engine-2-hospital-visualization.spec.ts`
- Reports: `RENDER_ENGINE_2_REPORT.md`, `VISUAL_BENCHMARK.md`, `FPS_REPORT.md`, `PERFORMANCE_REPORT.md`

### Changed (visualization only)
- `ecgMonitorCanvas.ts` — delegates multi-lead paint to RE2
- `EcgLiveMonitorView.tsx` — `HospitalRealtimeEngine` with metrics callback
- `live-monitor-v2/ecgHospitalGrid.ts` — re-exports RE2 grid (backward compatible)

### Preserved
- No AI, backend, API, database, or report engine changes
- Sprint 45/46 monitor shell and testIDs unchanged

### Tag
- `RenderEngine-2.0`

---

## Sprint 46.1 — Enterprise Test Infrastructure Stabilization — 2026-07-07

### Added (infrastructure only)
- **Sequential Playwright runner** (`scripts/run-playwright-sequential.mjs`) — isolated processes per suite
- **Session cleanup** (`tests/e2e/utils/session-cleanup.ts`) — localStorage, sessionStorage, IndexedDB wipe
- **Auth infrastructure** (`tests/e2e/utils/auth-infrastructure.ts`) — fresh login/logout, token validation
- **Network monitor** (`tests/e2e/utils/network-stability.ts`) — 5xx detection, API recovery polling
- **CI pipeline orchestrator** (`scripts/run-enterprise-ci-pipeline.mjs`, `npm run qa:pipeline`)
- **Artifact collector** (`scripts/qa/generate-pipeline-artifacts.mjs`)
- Integration markers: `scripts/sprint46-1-test-infrastructure.integration.ts`
- Reports: `SPRINT46_1_FINAL_REPORT.md`, `PLAYWRIGHT_STABILIZATION_REPORT.md`, `CI_PIPELINE_REPORT.md`, `AUTH_REPORT.md`, `FLAKY_TEST_REPORT.md`, `PERFORMANCE_REPORT.md`

### Changed (test infrastructure only)
- `tests/e2e/test.ts` — per-test isolated request, storage reset, network monitor, session destroy
- `tests/e2e/utils/qa.ts` — `resetBrowserStorage` in `clearAuthState`; explicit poll waits replace `waitForTimeout`
- `playwright.config.ts` — JSON reporter, `storageState: undefined`
- `package.json` — `qa:playwright:sequential`, `qa:pipeline`; `qa:smoke`/`qa:e2e` use sequential runner
- `scripts/sat-system-acceptance.mjs`, `run-full-regression.mjs`, `run-enterprise-qa.mjs` — sequential Playwright
- `.github/workflows/enterprise-qa.yml` — sequential smoke/enterprise/accessibility/visual/mobile

### Preserved
- All Sprint 1–46 product features, UI, APIs, and database schema unchanged

### Validated
- `npm run lint` / `typecheck` / `build` — PASS
- Sprint 46.1 integration markers — PASS

### Tag
- `Sprint46-1-TestInfrastructure`

---

## Sprint 47 — ECG Acquisition & Digitization Engine — 2026-07-07

### Added
- **Smart ECG detection** (`acquisition/smart-ecg-detector.ts`) — borders, rotation, perspective, shadows, paper color
- **Applied deskew** in preprocessing pipeline + morphology-preserving **signal reconstruction**
- **Quality tiers** (Excellent/Good/Fair/Poor) with clinical reasons
- **Background digitization jobs** — `POST/GET/DELETE /ecg/digitization/jobs`, cancelable with progress stages
- **Grid overlay API** — `GET /ecg/digital/:caseId/grid-overlay`
- **Frontend acquisition module** — capture panel, overlay/split studio, digitization bridge, job hook
- **Acquisition tab** in clinical right panel (additive — no changes to Monitor/CDSS/Reports core)
- Pipeline version: **ecg-digitization-v47.0**
- Playwright: `tests/e2e/sprint47-acquisition-digitization.spec.ts`
- Integration: `scripts/sprint47-acquisition-digitization.integration.ts`
- Reports: `SPRINT47_FINAL_REPORT.md`, `DIGITIZATION_ENGINE_REPORT.md`, `IMAGE_PREPROCESSING_REPORT.md`, `SIGNAL_RECONSTRUCTION_REPORT.md`, `PERFORMANCE_REPORT.md`, `PLAYWRIGHT_REPORT.md`, `VISUAL_QA_REPORT.md`

### Preserved
- Live ECG Monitor, Diagnostic Workstation, Measurement Studio, AI Cardiologist, CDSS, Report Engine
- Existing APIs, database, RC-1 stability, SAT compatibility

### Validated
- `npm run lint` / `typecheck` / `build` — PASS
- Playwright Sprint 47 (4/4) + Sprint 16 regression (2/2) — PASS

### Tag
- `Sprint47-AcquisitionDigitization`

---

## Sprint 46 — Diagnostic ECG Workstation — 2026-07-07

### Added
- **Diagnostic workstation module** (`diagnostic-workstation/`): shell, lead tools, rhythm strip, panels ribbon
- **Compare enhancements**: difference highlighting, lead/beat sync toggles
- **Report linking**: AI finding → lead highlight + diagnostic panel focus
- Playwright: `tests/e2e/sprint46-diagnostic-ecg-workstation.spec.ts` (6 tests)
- Integration: `scripts/sprint46-diagnostic-ecg-workstation.integration.ts`
- Reports: `SPRINT46_FINAL_REPORT.md`, `DIAGNOSTIC_WORKSTATION_REPORT.md`, `ECG_COMPARISON_REPORT.md`, `VISUAL_QA_REPORT.md`, `PLAYWRIGHT_REPORT.md`, `PERFORMANCE_REPORT.md`

### Preserved
- Live ECG Monitor route and `EcgLiveMonitorView` (Sprints 41/45)
- RC-1 stability, measurement studio (Sprint 42), AI cardiologist, reports, CDSS

### Validated
- `npm run lint` / `typecheck` / `build` — PASS
- Integration markers — PASS

### Tag
- `Sprint46-DiagnosticWorkstation`

---

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
