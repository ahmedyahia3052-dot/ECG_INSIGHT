# Sprint 88 — ECG Ingestion Pipeline Report

**Engine version:** `sprint88-ecg-ingestion-v1`  
**Scope:** Backend-only production ingestion pipeline (no UI changes)  
**Continues from:** Sprint 86 AI Orchestration Engine + Sprint 82 ECG Processing Engine

---

## Pipeline Flow

```
Upload → Validation → Storage → Queue → Processing → AI Orchestration → Results → Persist → Notification
```

Each stage is tracked on `EcgIngestionJob` with durable `EcgIngestionPipelineEvent` records for audit and observability.

| Stage | Responsibility |
|-------|----------------|
| UPLOAD | Job created after ECG file upload (or manual enqueue) |
| VALIDATE | File existence, SHA-256 checksum, duplicate detection |
| STORAGE | Persist checksum on `ECGFile`, confirm storage path |
| QUEUE | Priority queue handoff to worker |
| PROCESSING | Delegates to Sprint 82 `ecg-processing-engine` |
| AI_ORCHESTRATION | Delegates to Sprint 86 `ai-orchestration-engine` |
| RESULTS | Aggregate child job outputs |
| PERSIST | Verify analysis persistence |
| NOTIFICATION | Unified completion notification |
| COMPLETE | Terminal success |

---

## Features Delivered

### Duplicate Detection
- SHA-256 checksum computed during VALIDATE
- Matches prior completed ingestion for same case within configurable window (`ECG_INGESTION_DUPLICATE_WINDOW_HOURS`, default 24h)
- Duplicate jobs short-circuit with status `DUPLICATE` and `duplicateOfJobId` reference

### Checksum
- `computeFileSha256()` streams file from disk
- Stored on job (`checksumSha256`) and `ECGFile.checksum`

### Retry Policy
- Exponential backoff via `computeIngestionRetryDelayMs` / `scheduleIngestionRetryAt`
- Configurable base/max delay (`ECG_INGESTION_RETRY_BASE_MS`, `ECG_INGESTION_RETRY_MAX_MS`)
- Recoverable errors reschedule with `RETRY_SCHEDULED` status

### Timeout
- Per-job `timeoutMs` (default 600s)
- `IngestionTimeoutError`, `hasIngestionTimedOut`, `withIngestionTimeout`
- Timeout triggers retry or dead letter when max attempts exceeded

### Queue Priority
- `EcgIngestionPriority`: CRITICAL → HIGH → NORMAL → LOW
- Worker claims jobs ordered by priority ascending (CRITICAL first), then retry time, then creation time
- Case upload maps `ECGPriority` to ingestion priority automatically

### Dead Letter Queue
- Jobs exceeding `maxAttempts` move to status `DEAD_LETTER` with `deadLetterAt` timestamp
- `DEAD_LETTER` pipeline events emitted for operational triage

### Pipeline Events
- `EcgIngestionPipelineEvent` model with types: stage lifecycle, checksum, duplicate, child jobs, retry, cancel, timeout, notification, resume
- `GET /api/v1/ecg-ingestion-pipeline/jobs/:jobId/events`

### Progress Tracking
- Stage-based progress map (`INGESTION_STAGE_PROGRESS`, 0–100)
- `stageLog` JSON on job with per-stage status and duration

### Processing Metrics
- `metricsJson` on job: stage durations, total duration, retry count, duplicate flag, notification flag
- `GET /api/v1/ecg-ingestion-pipeline/metrics` aggregate counters

### Worker Abstraction
- `IngestionWorkerAdapter` interface with register/get/pump/stats
- Poll-based worker with concurrency (`ECG_INGESTION_WORKER_CONCURRENCY`)
- Re-pumps in-flight jobs waiting on child processing/orchestration jobs

### Cancellation
- `POST /jobs/:jobId/cancel` cancels ingestion job and best-effort child processing/orchestration jobs

### Resume Processing
- `POST /jobs/:jobId/resume` for FAILED, CANCELLED, or DEAD_LETTER jobs
- Optional `resumeFromStage` to restart from a specific pipeline stage

---

## API Surface

Mounted at `/api/v1/ecg-ingestion-pipeline`:

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Engine health + worker stats + metrics |
| GET | `/metrics` | Aggregate job counters |
| POST | `/jobs` | Enqueue ingestion job |
| GET | `/jobs` | List jobs (filter by case/status) |
| GET | `/jobs/:jobId` | Job detail + progress |
| GET | `/jobs/:jobId/events` | Pipeline event timeline |
| POST | `/jobs/:jobId/cancel` | Cancel job |
| POST | `/jobs/:jobId/resume` | Resume failed/cancelled/DLQ job |
| POST | `/jobs/:jobId/retry` | Schedule manual retry |
| GET | `/cases/:caseId/jobs` | Case-scoped job list |

---

## Upload Integration

`POST /uploads/ecg/:caseId` now calls `enqueueIngestionFromUpload()` instead of legacy `queueAnalysis()`, wiring uploads into the full production pipeline without frontend changes.

---

## Database

**Migration:** `prisma/migrations/20260709030000_sprint88_ecg_ingestion_pipeline`

- `EcgIngestionJob` — durable pipeline state, checksum, priority, child job IDs, DLQ fields
- `EcgIngestionPipelineEvent` — append-only event stream

---

## Module Layout

```
server/src/modules/ecg-ingestion-pipeline/
├── types.ts
├── checksum.ts
├── recovery.ts
├── metrics.ts
├── repository.ts
├── pipeline-manager.ts
├── worker-adapter.ts
├── worker.ts
├── schemas.ts
├── ecg-ingestion-pipeline.service.ts
├── ecg-ingestion-pipeline.routes.ts
└── index.ts
```

---

## Validation

| Gate | Result |
|------|--------|
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `npm run build` | PASS |
| `scripts/sprint88-ecg-ingestion-pipeline.test.ts` | PASS |
| `scripts/sprint88-ecg-ingestion-pipeline.integration.ts` | PASS |

---

## Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `ECG_INGESTION_WORKER_CONCURRENCY` | 2 | Parallel ingestion workers |
| `ECG_INGESTION_WORKER_POLL_MS` | 2000 | Queue poll interval |
| `ECG_INGESTION_DEFAULT_TIMEOUT_MS` | 600000 | Pipeline timeout |
| `ECG_INGESTION_RETRY_BASE_MS` | 20000 | Retry backoff base |
| `ECG_INGESTION_RETRY_MAX_MS` | 600000 | Retry backoff cap |
| `ECG_INGESTION_DUPLICATE_WINDOW_HOURS` | 24 | Duplicate detection window |

---

## Summary

Sprint 88 delivers a production-grade ECG ingestion pipeline that unifies upload, validation, storage, prioritized queuing, processing, AI orchestration, persistence verification, and notification—built on Sprint 82/86 engines with checksum duplicate detection, retry/timeout/DLQ policies, pipeline events, metrics, worker abstraction, cancellation, and resume support.
