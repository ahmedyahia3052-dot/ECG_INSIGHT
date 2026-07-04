# Changelog

All notable changes to this project are documented in this file.

---

## [Sprint13-Phase3] — 2026-07-04

### Added

- Production **ECG Pro Viewer Engine** with 5-layer render stack (`EcgProViewerEngine.tsx`)
- Layer 3 digitized waveform and Layer 4 AI overlay architecture (data-driven, no mock UI)
- `ecgViewerEngine.ts` contain-fit math, layer constants, rhythm strip markers
- Clinical findings panel with real case/measurement binding pipeline (`useEcgClinicalFindings`)
- Rhythm strip panel with 12-lead selector and paper-speed time markers
- Web pan navigation (Space+drag, Pan tool), grid opacity cycle, viewport-aware fit
- Tests: `ecg-pro-viewer-engine.test.ts`, `sprint13-ecg-pro-viewer-engine.integration.ts`
- Playwright Phase 3 spec (pan, grid opacity, clinical findings, resolution)
- `SPRINT13_PHASE3_REPORT.md`

### Changed

- `useEcgViewerControls` — internal viewport dimensions, pan mode, grid opacity
- `EcgPaperGrid` — zoom-synchronized spacing, opacity support
- `EcgImageCanvas` delegates to `EcgProViewerEngine`
- `EcgViewerRightRail` — clinical findings + measurements (removed placeholder cards)
- `EcgMonitorViewerFoundation` — rhythm strip, findings pipeline, resolution in status bar
- Toolbar: Pan, Grid opacity %, Export PDF label
- Integration pipeline: 59 scripts (Phase 3 engine test + integration)

### Preserved

- Sprint 12 `EcgProViewer` unchanged
- Phase 1–2 measurement workspace, persistence, calipers, annotations
- Compare and AI Overlay remain disabled until Sprint 14

### Fixed (stability closure)

- `/ecg-monitor` patient-loading race that rendered empty state instead of viewer (`ecgMonitorRoute.ts`)
- Collision-safe `nextCaseNumber()` and create retry on unique constraint (`cases.routes.ts`)
- Playwright auth bootstrap and shared fixture for 5 consecutive green runs
- `SPRINT13_PHASE3_FINAL_REPORT.md`

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
