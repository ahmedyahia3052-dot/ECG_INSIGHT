# New Vitest Test Suites — SAT Coverage Expansion

**Generated:** 2026-07-07

## Summary

31 Vitest suites / **139 tests** added under `tests/unit/`, covering ECG viewer, live monitor, measurement engine, AI overlay, rendering engine, and medical intelligence modules.

No production code, UI, APIs, or business logic was modified.

## ECG Viewer & Interaction

| File | Tests | Validates |
|------|-------|-----------|
| `tests/unit/ecg/zoomPanEngine.test.ts` | 9 | Zoom limits, pan deltas, preset stepping |
| `tests/unit/ecg/rendering-interaction.test.ts` | 5 | Pointer drag, wheel zoom, lead hit-testing |
| `tests/unit/ecg/ecgImageEngine.test.ts` | 6 | Image format detection, zoom-at-point, hero fit, cache TTL |
| `tests/unit/ecg/gridPresets.test.ts` | 3 | Grid preset resolution |
| `tests/unit/ecg/leadFocus.test.ts` | 3 | Lead focus dim/highlight behaviour |

## Live ECG Monitor

| File | Tests | Validates |
|------|-------|-----------|
| `tests/unit/ecg/ecgMonitorRoute.test.ts` | 5 | Monitor screen phase routing |
| `tests/unit/ecg/ecgMonitorPath.test.ts` | 5 | Wave path SVG generation, ms↔sample conversion |
| `tests/unit/ecg/ecgMonitorBeatMarkers.test.ts` | 5 | R-peak/PVC/pacing detection, overlay coordinates |
| `tests/unit/ecg/signalQuality.test.ts` | 4 | Signal quality flags and severity labels |
| `tests/unit/ecg/waveformStyle.test.ts` | 3 | Monitor vs clinical trace styling |

## Measurement Engine

| File | Tests | Validates |
|------|-------|-----------|
| `tests/unit/ecg/ecgCalibrationMath.test.ts` | 6 | Grid spacing, snap, ms/mV/mm conversion, QTc/HR |
| `tests/unit/ecg/ecgCaliperGeometry.test.ts` | 5 | Caliper geometry, angle arcs, unit mapping |
| `tests/unit/ecg/ecgMeasurementEngine-extended.test.ts` | 6 | QT dispersion, export formats, serialize/restore, delete |
| `tests/unit/ecg/ecgMeasurementHistory.test.ts` | 4 | History stack, caliper summaries |
| `tests/unit/ecg/ecgMeasurementExport.test.ts` | 2 | CSV export with escaped commas |
| `tests/unit/ecg/ecgMeasurementReference.test.ts` | 5 | Reference range evaluation |
| `tests/unit/ecg/measurementTypes.test.ts` | 3 | Workspace migration and defaults |
| `tests/unit/ecg/ecgMultiLeadSync.test.ts` | 4 | Multi-lead caliper replication, sync markers |

## AI Findings & Cardiologist Workspace

| File | Tests | Validates |
|------|-------|-----------|
| `tests/unit/ecg/aiOverlayEngine.test.ts` | 3 | Confidence tone/color helpers |
| `tests/unit/ecg/aiOverlayEngine-extended.test.ts` | 6 | Overlay persistence, merge, filter, export |
| `tests/unit/ecg/diagnosisLeadMap.test.ts` | 5 | Diagnosis→lead territory mapping |
| `tests/unit/ecg/buildCardiologistModel.test.ts` | 2 | Cardiologist workspace model assembly |

## Rendering Engine

| File | Tests | Validates |
|------|-------|-----------|
| `tests/unit/ecg/viewport.test.ts` | 6 | Screen↔signal transforms, zoom-at-anchor, visible range |
| `tests/unit/ecg/dirtyRect.test.ts` | 5 | Dirty rect tracking and merge |
| `tests/unit/ecg/vectorModel.test.ts` | 5 | Vector model, SVG/smooth paths |
| `tests/unit/ecg/twelveLeadLayout.test.ts` | 4 | Twelve-lead layout regions |

## Workspace Persistence & History

| File | Tests | Validates |
|------|-------|-----------|
| `tests/unit/ecg/workspacePersistence.test.ts` | 3 | Storage keys, round-trip, corrupt JSON recovery |
| `tests/unit/ecg/useHistoryStack.test.tsx` | 5 | Undo/redo, reset, deduplicated commits |

## Clinical Workflow

| File | Tests | Validates |
|------|-------|-----------|
| `tests/unit/ecg/workflow-engine-extended.test.ts` | 4 | Workflow step completion |
| `tests/unit/ecg/clinical-alerts.test.ts` | 4 | Alert derivation |

## Medical Intelligence Core

| File | Tests | Validates |
|------|-------|-----------|
| `tests/unit/medical-intelligence/confidenceEngine.test.ts` | 4 | Finding/overall confidence assessment |

## Run Commands

```bash
npm run qa:vitest          # Vitest only (139 tests)
npm run qa:coverage        # Vitest + coverage reports
npm run qa:unit            # Legacy 17 scripts + Vitest (156 total)
```
