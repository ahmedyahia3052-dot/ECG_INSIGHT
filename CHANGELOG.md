# Changelog — Sprint 34 Professional Measurement Engine

## Added

- `ecgWaveDetectionBridge.ts` — smart P/Q/R/S/T/J/ST/QT fiducial detection and caliper seeding
- `ecgMultiLeadSync.ts` — 12-lead horizontal caliper replication and timestamp markers
- `ecgMeasurementHistory.ts` — audit log helpers
- `ecgLiveMeasurements.ts` — live measurement aggregation
- `EcgMeasurementFloatingToolbar.tsx` — professional floating measurement toolbox
- `EcgMeasurementHistoryPanel.tsx` — measurement history UI
- `scripts/ecg-wave-detection-bridge.test.ts`
- `scripts/sprint34-professional-measurement-engine.integration.ts`
- `tests/e2e/sprint34-professional-measurement-engine.spec.ts`

## Changed

- `useEcgMeasurementWorkspace.ts` — snap settings, history, wave seed, arrow nudge, annotations
- `EcgMeasurementOverlay.tsx` — annotation drawing, multi-lead sync markers
- `EcgMeasurementStudioPanel.tsx` — live measurements + history sections
- `EcgProViewerEngine.tsx` — floating toolbar mount
- `measurementTypes.ts` — history and snap settings on workspace state
- `ecgAiOverlayEngine.ts` / `aiOverlayTypes.ts` — PVC, PAC, AF, LBBB, RBBB labels
- `ecgMeasurementEngine.ts` — exported `summarizeCaliper`
- `scripts/integration/pipeline.mjs` — registered Sprint 34 tests

## Validation

- Lint, typecheck, build: pass
- Integration + unit tests: pass
- Playwright `@sprint34-measurement`: 3/3 pass
