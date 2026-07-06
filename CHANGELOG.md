# Changelog — Sprint 30 Clinical Decision Workspace

## Added

- **16-stage clinical workflow engine** (`clinical-workflow/`)
  - Patient → Upload → Image Quality → Processing → Grid → Lead → Digitization → Signal → Measurements → AI Review → Clinical Review → Comparison → Doctor Notes → Final Report → Digital Signature → Export
- **EcgClinicalWorkflowRibbon** — guided workflow navigation with progress
- **EcgClinicalAlertsBanner** — critical/urgent/signal/measurement alerts
- **EcgPatientWorkspacePanel** — MRN, visit ID, organization, risk, pinned notes
- **EcgMeasurementStudioPanel** — HR, PR, QRS, QT, QTc, RR, axis, ST, P/T, voltage
- **EcgAiReviewWorkflowPanel** — expanded AI review with differential, evidence, confirmation
- **EcgHistoryEnginePanel** — prior ECG timeline with compare actions
- **EcgClinicalNotesPanel** — structured notes with templates and audit timestamp
- **EcgCaseTimelinePanel** — case audit timeline
- **useClinicalWorkflowEngine** — orchestrator hook with alerts and navigation
- Tests: `ecg-clinical-workflow.test.ts`, `sprint30-clinical-workflow.integration.ts`, e2e spec
- Reports: SPRINT30_FINAL, WORKFLOW, AI_REVIEW, REPORT_ENGINE, PERFORMANCE, RESPONSIVE, VISUAL_VALIDATION

## Changed

- **EcgMonitorViewerFoundation** — workflow ribbon, alerts, engine wiring, notes state
- **EcgClinicalRightPanel** — composes new workspace panels; focus tab/section support
- **EcgReportPreviewPanel** — finalize and sign report actions (Sprint 30)
- **useEcgWorkstationShortcuts** — Ctrl+S/P/E/M/R/A, F11, Space, Escape
- **viewer/index.ts** — exports new Sprint 30 modules
- **pipeline.mjs** — registers Sprint 30 tests
- **sprint27-ecg-rendering-engine.integration.ts** — accepts Sprint 28 clinical canvas as valid waveform renderer

## Preserved

- All existing rendering engines (Sprint 27/28)
- Digitization, measurement, AI diagnosis business logic
- Compare mode, live monitor, diagnostic mode
- Zero-chrome toolbar and resizable workspace (Sprint 29)

## Validation

- lint ✓ typecheck ✓ build ✓ integration ✓ playwright ✓
