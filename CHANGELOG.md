# Changelog

All notable changes to this project are documented in this file.

---

## [Sprint23] — 2026-07-06

### Added

- **Visual Inspector AI Engine** (`scripts/sprint23/visual-inspector-engine.mjs`) — live DOM audit, hospital UI scoring, multi-viewport screenshots
- Hospital UI Score Engine (14 modules, 98% minimum acceptance)
- Shared visual tokens (`ecgWorkstationVisualTokens.ts`)
- Sprint 23 readiness testIDs and integration/e2e tests

### Changed

- Self-healing layout: compact bottom dock, removed duplicate timeline from bottom stack
- Canvas resize optimization (no per-frame buffer reset)
- Responsive mini navigator with layout-aware width
- Enterprise shell title unified to **Hospital ECG Workstation**
- Clinical panel full-width fill; right panel min 20%

---

## [Sprint22] — 2026-07-06

### Added

- **Hospital ECG Workstation** rebuild at `/ecg-workspace`
- Hospital-grade digital monitor: phosphor persistence, major/minor grid, glow waveform, PVC/pacing/R beat markers
- `EcgMonitorMiniNavigator` timeline overview strip
- Toolbar groups: FILE, VIEW, DIGITIZE, MEASURE, AI, EXPORT, DISPLAY, TOOLS
- Collapsible left/right panels via toolbar toggles
- Clinical sidebar sections: Case, Rate, Intervals, Axis, ST, Rhythm, Noise, Artifacts, History, Comparison
- Tests: `sprint22-hospital-workstation.integration.ts`, `sprint22-hospital-workstation.spec.ts`

### Changed

- Workstation title: **Hospital ECG Workstation**
- Layout: 90% viewer / 10% bottom panel with dockable side panels
- Monitor canvas test IDs: `sprint22-hospital-monitor-canvas`
- View mode label: Waveform → **Digitized**

---

## [Sprint21] — 2026-07-06

### Added

- **ECG Insight Enterprise Workstation** branding and UX revolution at `/ecg-workspace`
- Toolbar groups: FILE, VIEW, ECG, MEASURE, AI, EXPORT
- AI Review clinical mode (`ai-review`) with heatmap + explainability
- `EcgEnterpriseStatusBar` with memory, GPU renderer, render time, backend health
- Monitor canvas glow + R-peak beat markers (`ecgMonitorBeatMarkers.ts`)
- Clinical sidebar: patient card, warnings, clinical notes, source provenance
- `useEnterpriseStatusMetrics.ts` runtime metrics hook

### Changed

- View mode switcher: Original, Processed, Waveform, Monitor, AI Review, Compare
- Layout: 88% viewer / 12% bottom panel
- `EcgClinicalRightPanel` full redesign
- `EcgWorkstationToolbar` complete regroup per enterprise protocol

---

## [Sprint19] — 2026-07-05

### Added

- **Report Preview** view mode in ECG workstation (`EcgReportPreviewPanel`) with generate, HTML preview, PDF export
- **Measurement Mode** dedicated view chip with automatic caliper activation
- **Canvas 2D monitor engine** (`ecgMonitorCanvas.ts`) for high-DPI live waveform rendering on web
- **Keyboard shortcuts** via `useEcgWorkstationShortcuts` (Ctrl+O, Ctrl+U, M, R, G)
- Monitor state in status bar (Live / Frozen / Paused)
- Tests: `sprint19-ecg-enterprise-hardening.integration.ts`, `sprint19-ecg-enterprise-hardening.spec.ts`

### Changed

- `EcgLiveMonitorView` — Canvas rendering on web, SVG fallback on native
- `EcgWorkstationToolbar` — Open navigates to case list; Report and Measure Mode actions
- View modes expanded to 8: Image, Processed, Waveform, Monitor, Measurement, Compare, Overlay, Report

---

## [Sprint18] — 2026-07-05

### Added

- **ECG Pro Clinical Workstation 2.0** — full dark UI rebuild at `/ecg-workspace`
- Grouped icon toolbar (`EcgWorkstationToolbar`) with FILE/VIEWER/LEADS/CLINICAL/VIEW sections
- Live monitor mode (`EcgLiveMonitorView`) with RAF SVG sweep from digitized leads
- View mode switcher: Image, Processed, Waveform, Monitor, Compare, Overlay
- Waveform playback timeline with play/pause/loop/scrubber
- Unified clinical right panel (`EcgClinicalRightPanel`)
- Compare overlay and split layout modes
- Tests: `sprint18-ecg-clinical-workstation.integration.ts`, `sprint18-ecg-clinical-workstation.spec.ts`
- Reports: `SPRINT18_FINAL_REPORT.md`, `VISUAL_VERIFICATION_REPORT.md`

### Changed

- `EcgMonitorViewerFoundation` — workstation 2.0 shell, replaces flat toolbar
- `EcgImageCanvas` — view mode routing (processed/waveform/overlay)
- `EcgCompareViewer` — overlay + split layouts
- `useEcgEnterpriseViewerState` — view modes, compare layout, lead layout, theme
- Viewer layout 85% main / 15% bottom; dark canvas background

### Preserved

- All Sprint 13–17 engines: measurements, digitization, AI overlay, export, persistence

---

## [Sprint17] — 2026-07-05

### Added — cursor-anchored wheel zoom, momentum pan, mini navigator, crisp rendering
- Zoom presets 100%–1600% with `setZoomPreset` toolbar buttons
- Clinical status bar metrics: paper speed, gain, lead, signal/digitization quality, DPI, size, FPS, coordinates
- Toolbar: Export PNG, Digitize, brightness/contrast, speed/gain cycles
- Lead focus mode toggle in left rail
- `useViewerRuntimeMetrics`, `ecgViewerExport`, `EcgMiniNavigator` exports
- Tests: `sprint17-ecg-pro-viewer-enterprise.integration.ts`, `sprint17-ecg-pro-viewer.spec.ts`
- Reports: `SPRINT17_FINAL_REPORT.md`, `TEST_REPORT.md`, `PERFORMANCE_REPORT.md`

### Changed

- `ECG_ZOOM_PRESETS` → `[1, 2, 4, 8, 16]`; `clampZoom` max → 32
- `EcgProViewerEngine` — anchor zoom, momentum pan, mini nav, pointer tracking
- `EcgViewerToolbar` / `EcgViewerTimeline` — Sprint 17 controls and status bar
- `EcgMonitorViewerFoundation` — runtime metrics wiring, digitize toolbar action
- `sprint13-ecg-viewer-foundation.integration.ts` — accepts `EcgEnterpriseWorkspaceScreen` route

### Preserved

- All Sprint 13–16.5 viewer, measurement, digitization, overlay, and workspace features

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
