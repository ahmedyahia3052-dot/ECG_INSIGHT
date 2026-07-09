# Sprint 94 — ECG Digitization Engine Report

**Module:** `server/src/modules/ecg-digitization-engine`  
**Version:** `sprint94-ecg-digitization-v1`  
**Branch:** `feature/sprint94-ecg-digitization`  
**Mode:** Production — zero placeholders

## Summary

Sprint 94 extracts image-to-signal digitization into a dedicated production engine with durable Prisma-backed job queue, granular stage orchestration, and full integration with existing Sprint 82/85/86 infrastructure. All computer-vision algorithms delegate to the mature `ecg-digitization` library (v47) — no duplicated logic.

## Architecture

```
ecg-digitization-engine/
├── types.ts              Stage order, progress, job result types
├── interfaces.ts         WaveformExtractionEngine, LeadSegmentationEngine
├── stages.ts             Stage runners (paper, grid, leads, waveform, validate)
├── waveform-engine.ts    Default pluggable extraction engines
├── orchestrator.ts       executeDigitizationPipeline (18 tracked stages)
├── pipeline.ts           runDigitizationPipelineForFile (Sprint 82 inline)
├── repository.ts         Prisma EcgDigitizationJob CRUD + claim
├── worker.ts             Background queue pump + retry
├── recovery.ts           Exponential backoff + error classification
├── persist.ts            ECGLeadSignal + metadataJson persistence
├── ecg-digitization-engine.service.ts
├── ecg-digitization-engine.routes.ts
└── schemas.ts            Zod validators
```

## Digitization Pipeline (18 Stages)

| Stage | Capability |
|-------|------------|
| `UPLOAD_INGEST` | Resolve stored ECG file (Sprint 85 storage paths) |
| `PAPER_DETECT` | Automatic ECG paper detection (`detectSmartEcgFeatures`) |
| `DECODE` | Raster/PDF decode |
| `PREPROCESS` | Base image preprocessing |
| `PERSPECTIVE_CORRECT` | Perspective correction |
| `ROTATION_CORRECT` | Rotation correction |
| `DESKEW` | Deskew |
| `NOISE_REDUCE` | Noise reduction |
| `SHADOW_REMOVE` | Shadow removal |
| `CONTRAST_ENHANCE` | Contrast / histogram / gamma enhancement |
| `GRID_DETECT` | ECG grid detection + calibration |
| `LEAD_SEGMENT` | Lead segmentation |
| `TWELVE_LEAD_DETECT` | 12-lead layout validation |
| `WAVEFORM_EXTRACT` | Centerline waveform extraction |
| `RECONSTRUCT` | Signal reconstruction + digital objects |
| `VALIDATE` | Quality + signal validation |
| `PERSIST` | ECGLeadSignal + metadata persistence |
| `COMPLETE` | Job completion |

## Integration with Prior Sprints

| Sprint | Integration |
|--------|-------------|
| **Sprint 82 Processing Engine** | `orchestrator.ts` delegates `PREPROCESS` to `runDigitizationPipelineForFile()` — measurement stages remain in processing engine |
| **Sprint 85 Storage Engine** | Reads `ECGFile.storagePath` / storage provider metadata for ingest |
| **Sprint 86 AI Orchestrator** | Downstream — consumes persisted `ECGLeadSignal` + measurements after processing completes |

## API Endpoints

Base path: `/api/v1/ecg-digitization-engine`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Engine + worker health |
| POST | `/jobs` | Enqueue digitization job |
| GET | `/jobs` | List jobs (optional case filter) |
| GET | `/jobs/:jobId` | Job status + result |
| POST | `/jobs/:jobId/cancel` | Cancel queued/processing job |
| POST | `/jobs/:jobId/retry` | Retry failed job |
| GET | `/cases/:caseId/jobs` | Case digitization history |

## Database

Migration: `prisma/migrations/20260709050000_sprint94_ecg_digitization_engine/`

- `EcgDigitizationJob` model
- `EcgDigitizationJobStatus` enum
- `EcgDigitizationStage` enum (18 stages)

## Waveform Extraction Architecture

Pluggable interfaces in `interfaces.ts`:

- `WaveformExtractionEngine` — centerline extraction, reconstruction, digital signal objects
- `LeadSegmentationEngine` — 12-lead layout detection

Default implementations in `waveform-engine.ts` wrap existing `ecg-digitization` modules.

## Tests

- **Vitest:** `tests/unit/server/ecg-digitization-engine/engine.test.ts`
- **Scripts unit:** `scripts/sprint94-ecg-digitization-engine.test.ts`
- **Integration markers:** `scripts/sprint94-ecg-digitization-engine.integration.ts`

## Validation

All checks passed on branch `feature/sprint94-ecg-digitization`:

| Check | Result |
|-------|--------|
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `npm run build` | PASS |
| `npm test` | PASS (includes Sprint 94 unit + integration markers) |

Migration applied: `20260709050000_sprint94_ecg_digitization_engine`

## Out of Scope

- UI changes
- New CV algorithms (reuses `ecg-digitization` library)
- Measurement engine (remains Sprint 82)
