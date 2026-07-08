# API Report — Sprint 40 MIC

## Base Path

All endpoints require authentication (`requireAuth`).

**Base URL:** `/api/mic`

## Endpoints

### Health

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Engine id, version, catalog counts |

### Diagnosis Lookup (Module 1)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/diagnoses` | List catalog; query `category`, `tag` |
| GET | `/diagnoses/:code` | Single diagnosis by code |

### Specialty Libraries

| Method | Path | Description |
|--------|------|-------------|
| GET | `/arrhythmias` | Arrhythmia library (Module 2) |
| GET | `/ischemia` | STEMI/ischemia library (Module 3) |

### Measurement Reference (Module 4)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/references` | All reference ranges |
| GET | `/references/:parameter` | Single parameter (PR, QRS, QT, etc.) |

### Recommendation Lookup (Module 5)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/recommendations/:code` | Recommendations for diagnosis code |

### Differential Diagnosis (Module 6)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/differential` | Body: `{ finding, limit? }` — ranked differentials |
| GET | `/differential/:code` | Differential list for diagnosis code |

### Risk Stratification (Module 7)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/risk/:code` | Risk assessment for diagnosis |
| GET | `/risk-rules` | Active configurable rules |

### Guideline Lookup (Module 8)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/guidelines` | Query `organization`, `category` |
| GET | `/guidelines/:id` | Single guideline by id |

### Database Seed (Module 10)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/seed` | Upsert all MIC catalogs to database |
| GET | `/seed/stats` | Row counts per Mic* table |

## Example Requests

```http
GET /api/mic/diagnoses/AF
GET /api/mic/recommendations/NSTEMI
GET /api/mic/references/QTc
GET /api/mic/guidelines?organization=ESC
POST /api/mic/differential
Content-Type: application/json

{ "finding": "ST_ELEVATION", "limit": 5 }
```

## Response Shapes

Diagnosis entries return the full `MicDiagnosisEntry` object including ICD-10/SNOMED, references, and all clinical fields.

Differential responses include `confidence`, `rank`, `distinguishingFeatures`, and `rationale`.

Risk responses include `level` (`low` | `intermediate` | `high` | `critical`), `ruleId`, and `contributingFactors`.

## Registration

Mounted in `server/src/modules/index.ts`:

```typescript
modulesRouter.use("/mic", micRouter);
```

No frontend routes or UI components were added in Sprint 40.
