# Sprint 63 — Enterprise ECG Longitudinal Timeline & Follow-up Engine

## Scope

Backend and database only. Zero frontend changes.

## Module

`server/src/modules/ecg-longitudinal-timeline-engine/`

| Component | Path |
|-----------|------|
| TimelineService | `services/timeline.service.ts` |
| FollowUpService | `services/follow-up.service.ts` |
| ComparisonHistoryService | `services/comparison-history.service.ts` |
| TrendAnalysisService | `services/trend-analysis.service.ts` |
| Audit trail | `services/audit.service.ts` |
| REST routes | `controllers/timeline.routes.ts` |

Engine version: `sprint63-ecg-longitudinal-timeline-v1`

## Database

Migration: `prisma/migrations/20260708071000_sprint63_ecg_longitudinal_timeline`

| Model | Purpose |
|-------|---------|
| `ECGTimeline` | Permanent per-study timeline entry (patient cardiac record) |
| `ECGFollowUp` | Clinical follow-up recommendations from serial comparison |
| `ECGComparisonHistory` | Persisted comparison runs with deltas and trend summary |
| `ECGTrendSnapshot` | Structured automatic trend detections |

Indexes on patient, case, organization, branch, physician, dates, trend types.

## REST API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/patients/:patientId/timeline` | Complete ECG history (`?sync=true` rebuilds from cases) |
| GET | `/api/cases/:caseId/history` | Chronological ECG history for patient's record |
| GET | `/api/cases/:caseId/previous` | Previous ECG in timeline |
| GET | `/api/cases/:caseId/next` | Next ECG in timeline |
| GET | `/api/cases/:caseId/compare/:previousCaseId` | Measurement/diagnosis/interpretation/confidence deltas + trends + follow-up |

### Sprint 60 compatibility

Sprint 60 case **management** history moved to:

`GET /api/cases/:caseId/management-history`

Sprint 63 owns `GET /api/cases/:caseId/history` for chronological ECG history.

## Automatic trend engine

Detects: heart rate, QT/QTc prolongation, QRS widening, axis deviation, ST improvement/worsening, rhythm evolution, bundle branch progression, LVH progression, AF burden, PVC burden, interval and measurement progression.

## Follow-up summary engine

Generates narratives such as:

- Compared with previous ECG…
- No significant interval changes
- Progressive QT prolongation
- Improved ST elevation
- Persistent atrial fibrillation
- Recommend clinical follow-up

## Audit trail

`AuditAction` values: `ECG_TIMELINE_VIEWED`, `ECG_COMPARISON_PERFORMED`, `ECG_HISTORICAL_DATA_ACCESSED`, `ECG_TREND_ANALYSIS_GENERATED`, `ECG_FOLLOW_UP_GENERATED`, `ECG_LONGITUDINAL_REPORT_GENERATED`

Also writes `TimelineEvent` rows for timeline views, follow-up, and trend analysis.

## Tests

- `scripts/sprint63-ecg-longitudinal-timeline.test.ts` — trend engine unit tests
- `scripts/sprint63-ecg-longitudinal-timeline.integration.ts` — schema/module markers
- `scripts/sprint63-ecg-longitudinal-timeline-http.integration.ts` — HTTP integration

## Validation

```bash
npm run lint
npx tsc -p server/tsconfig.json --noEmit
npx prisma migrate deploy
npx tsx scripts/sprint63-ecg-longitudinal-timeline.test.ts
npx tsx scripts/sprint63-ecg-longitudinal-timeline.integration.ts
npx tsx scripts/sprint63-ecg-longitudinal-timeline-http.integration.ts
```
