# Sprint 96 — Clinical Measurement Engine Report

**Branch:** `feature/sprint96-measurements`  
**Engine version:** `sprint96-v1`  
**Date:** 2026-07-09

## Summary

Sprint 96 delivers a production clinical measurement engine integrated into the ECG Pro Viewer (`/ecg-viewer`). The sprint adds persisted clinical measurements, auto/manual REST APIs, digital calipers with overlay labels, and a measurement summary panel in the pro viewer workspace.

## Clinical Measurements

| Measurement | Field | Unit | Source |
|-------------|-------|------|--------|
| Heart Rate | `heartRate` | bpm | Auto / Manual |
| RR Interval | `rrIntervalMs` | ms | Auto / Manual |
| PR Interval | `prIntervalMs` | ms | Auto / Manual |
| QRS Duration | `qrsDurationMs` | ms | Auto / Manual |
| QT Interval | `qtIntervalMs` | ms | Auto / Manual |
| QTc | `qtcIntervalMs` | ms | Auto / Manual |
| P Duration | `pDurationMs` | ms | Auto / Manual |
| ST Level | `stLevelMm` | mm | Auto / Manual |
| T Wave Duration | `tWaveDurationMs` | ms | Auto / Manual |
| P Axis | `pAxisDeg` | deg | Auto (AI placeholder when unavailable) |
| QRS Axis | `qrsAxisDeg` | deg | Auto / Manual |
| T Axis | `tAxisDeg` | deg | AI placeholder for future |
| Electrical Axis | `electricalAxisDeg` | deg | Auto / Manual |

## Backend

### Database

- New Prisma model: `ClinicalMeasurementRecord`
- Enum: `ClinicalMeasurementSource` (`AUTO`, `MANUAL`, `HYBRID`)
- Migration: `20260709060000_sprint96_clinical_measurement_engine`

### REST API (`/api/clinical-measurement-engine`)

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/health` | Engine status and supported fields |
| GET | `/cases/:caseId` | Latest persisted record + clinical preview + workspace |
| POST | `/cases/:caseId/auto` | Run auto measurement from digitized leads |
| PUT | `/cases/:caseId/manual` | Persist manual/caliper measurements |

Auto measurement delegates to:

- `measureCaseFromStoredLeads` (clinical intervals)
- `runMeasurementEngine` (Sprint 59 bundle + validation)
- Axis placeholders (`pAxisDeg`, `qrsAxisDeg`, `tAxisDeg`) populated when available

Manual save validates against Sprint 59 reference ranges and persists caliper workspace JSON.

## Viewer Integration

### Components

- `EcgProViewerMeasurementLayer` — measurement overlay + floating caliper toolbar (web canvas)
- `EcgProViewerClinicalMeasurementsPanel` — HR/RR/PR/QRS/QT/QTc/ST/T/axis labels + Auto/Save actions
- `EcgProViewerToolsPanel` — caliper, measure, and basic ECG workflow preset tools
- `useEcgProViewerClinicalMeasurements` — React Query hook for API sync

### Digital Calipers

- Reuses enterprise `useEcgMeasurementWorkspace`, `EcgMeasurementOverlay`, and `EcgMeasurementFloatingToolbar`
- Workspace persisted locally and via existing viewer workspace API
- Manual values mapped to REST payload via `clinicalMeasurementMapper.ts`

## Validation

| Check | Result |
|-------|--------|
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `npm run build` | PASS |
| `npm test` | PASS |

## Tests

- `scripts/sprint96-clinical-measurement-engine.test.ts`
- `scripts/sprint96-clinical-measurement-engine.integration.ts`
- Added to `scripts/integration/pipeline.mjs`

## Git

- Commit: `Sprint96_MeasurementEngine`
- Push: `feature/sprint96-measurements` (no merge)
