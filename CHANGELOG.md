# Changelog

All notable changes to this project are documented in this file.

---

## [Sprint13-Phase2] — 2026-07-04

### Added

- Sprint 13 Phase 2 clinical measurement workspace: calipers, derived measurements, annotations, undo/redo
- `EcgMeasurementOverlay`, `EcgMeasurementsPanel`, `useEcgMeasurementWorkspace`, `ecgCalibrationMath`
- Server persistence: `GET/PUT /api/cases/:caseId/ecg-viewer-workspace`
- Measurement PDF export: `POST /api/cases/:caseId/ecg-viewer-workspace/export`
- Client service `ecgViewerWorkspace.ts` with local AsyncStorage + server sync
- Tests: `ecg-calibration-math.test.ts`, `sprint13-ecg-measurement-workspace.integration.ts`
- Playwright Phase 2 spec for measurement panel and tools
- `SPRINT13_PHASE2_REPORT.md`

### Changed

- `EcgMonitorViewerFoundation` wires measurement workspace and persistence
- `EcgViewerToolbar` enables Measure, Caliper, Annotation, Undo/Redo; Export generates measurement PDF
- `EcgViewerRightRail` renders live measurements panel (AI Findings remains placeholder)
- `EcgImageCanvas` renders measurement overlay with image-space coordinates
- Integration pipeline registers Phase 2 scripts (57 total)

### Preserved

- Sprint 12 Copilot and `EcgProViewer` unchanged
- Sprint 13 Phase 1 viewer foundation tests still pass
- Compare and AI Overlay remain disabled

---

## [Sprint-12-Stable] — 2026-07-04

### Added

- Copilot workspace components: `CopilotMessageList`, `CopilotMessageCard`, `CopilotComposer`, `CopilotResizableWorkspace`, `CopilotClinicalPanel`, `CopilotErrorBoundary`, `UploadPipelineProgress`
- `uploadPipeline.ts` with stage tracking and polling
- `clinicalErrors.ts` for normalized clinical/upload errors
- `@shopify/flash-list`, `react-resizable-panels` dependencies
- `scripts/sprint12-enterprise-workspace.integration.ts`
- Integration pipeline SSOT: `scripts/integration/pipeline.mjs`, `scripts/run-integration-suite.mjs`
- Integration teardown helper: `scripts/finish-integration.ts`
- Infrastructure: `scripts/infrastructure/startup-health-manager.mjs`, `scripts/validate-rc-pipeline.mjs`
- E2E: `bootstrapAuthenticatedPage`, `auth-logout-regression.spec.ts`, extended `tests/e2e/test.ts` platform guard

### Changed

- Refactored `copilot.tsx` into extracted workspace components with full-bleed enterprise layout
- `EnterpriseUI` full-bleed mode for `/copilot`
- `voiceEngine` extended statuses, waveform, streaming lifecycle
- `copilot.ts` attachment processing polling + abort support
- `npm test` runs canonical 53-script integration suite
- Localhost development requests skip express rate limiter (E2E stability)
- OAuth provider discovery failure no longer blocks password login

### Fixed

- Copilot nested scroll / composer visibility
- Textarea unbounded growth (120px cap)
- Upload send before pipeline completion
- Integration script hang (Tesseract/Prisma open handles)
- Patient `patientCode` allocation collisions (MAX SQL + retry)
- E2E rate-limit 429 failures during full suite runs
- Login Sign In button incorrectly disabled when OAuth discovery fails
- Playwright flakiness in clinical workflows, copilot memory, release candidate UI

### Deferred

- Sprint 13: embedded ECG viewer panels, Redis queue, Zustand normalization, Prometheus export

---

## [Sprint-11-Stable] — prior

See git history and sprint-specific reports under `SPRINT_*` markdown files.
