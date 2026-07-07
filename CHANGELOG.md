# Changelog

## Sprint 40 — Medical Intelligence Core (2026-07-07)

### Added

- **Medical Intelligence Core (MIC)** — independent server module at `server/src/modules/medical-intelligence-core/`
- Structured ECG diagnosis catalog (26 entries) with ICD-10/SNOMED placeholders, references, and full clinical metadata
- Arrhythmia library (12 entities), STEMI/ischemia library (9 entities), measurement reference (8 parameters)
- Clinical engines: recommendations, differential diagnosis, risk stratification, guideline registry
- REST API at `/api/mic` for diagnosis, recommendation, risk, guideline, and reference lookup
- Prisma models: `MicDiagnosisEntry`, `MicArrhythmiaEntity`, `MicIschemiaEntity`, `MicMeasurementReference`, `MicGuidelineEntry`, `MicRecommendationMapping`, `MicRiskRule`
- Migration: `20260707180000_medical_intelligence_core`
- Database seed pipeline: `persist/seed.ts`
- Integration test: `scripts/sprint40-medical-intelligence-core.integration.ts`
- Documentation: `MIC_ARCHITECTURE.md`, `KNOWLEDGE_BASE_REPORT.md`, `DATABASE_SCHEMA.md`, `API_REPORT.md`

### Unchanged (by design)

- ECG Viewer, AI Cardiologist Workspace, Live ECG Monitor, measurements UI
- Playwright specs, regression suite, authentication, frontend routing
- Sprint 38 `medical-intelligence` analysis orchestration (separate from MIC)

### Tag

`Sprint40-MedicalIntelligenceCore`

---

## Sprint38-AICardiologistWorkspace (2026-07-07)

### Added
- **EcgAiCardiologistWorkspace** — 14-section hospital-grade AI interpretation UI
- **ai-cardiologist/** model builder, lead map, and types
- **medicalIntelligence.ts** frontend service with fetch/analyze helpers
- Medical Intelligence API registration (`/api/medical-intelligence`)
- `highlightLeads` on AI overlay workspace for diagnosis-driven visualization
- Integration test `sprint38-ai-cardiologist-workspace.integration.ts`
- Playwright suite `@sprint38` (3 tests)

### Changed
- `EcgClinicalRightPanel` AI tab now uses cardiologist workspace (replaces simple review panel)
- `EcgMonitorViewerFoundation` loads medical intelligence report when digitized ECG available

### Preserved
- Sprint 37 Live Monitor workspace — no changes
- `EcgAiReviewWorkflowPanel` retained for backward compatibility (not mounted in AI tab)
- ECG Review workstation shell, workflow ribbon, measurements, reports tabs

---

# Changelog — Sprint 37 Live Monitor

### Added
- Dedicated **Live ECG Monitor Workspace** at `/ecg-live-monitor` and `/ecg-live-monitor/[caseId]`
- `EcgLiveMonitorShell`, status panel, lead strip, transport controls, engine, and keyboard shortcuts
- Diagnostic Monitor fullscreen mode (ESC exit) with floating controls
- Sidebar nav item **Live Monitor** and case detail **Live Monitor** button
- Integration test `scripts/sprint37-live-monitor-workspace.integration.ts`
- Playwright suite `tests/e2e/sprint37-live-monitor.spec.ts` (`@sprint37`, 4 tests)

### Changed
- `EcgLiveMonitorView` supports `chrome` variants for standalone workspace embedding
- Enterprise shell full-bleed includes `/ecg-live-monitor` routes

### Unchanged
- ECG Review Workspace (`/ecg-workspace`, `EcgMonitorViewerFoundation`) — no functional changes

---

# Changelog — Sprint 36 Clinical Validation

## Sprint36-QA (2026-07-07)

### Validation
- Added `scripts/sprint36-clinical-validation.integration.ts` covering phases 1–10
- Added `tests/e2e/sprint36-clinical-validation.spec.ts` (`@sprint36-qa`, 8 tests)
- Registered integration script in `scripts/integration/pipeline.mjs`

### Fixed
- Infinite re-render loops in history stack, status metrics, workspace persistence, and AI overlay sync
- Duplicate React keys for custom measurement presets
- Web DOM `nativeID` warnings; added `ecgNativeId` / `ecgAnchorId` helpers
- Cross-origin ECG image loading (Helmet CORP policy)
- Nested buttons in measurement rows
- AI annotation merge duplicating generated overlays

### QA
- Updated floating palette E2E locators for Sprint 35 toolbar labels
- Generated Sprint 36 validation and QA reports
