# Sprint 72 — Enterprise API Standardization

Backend-only enterprise API standardization for ECG Insight Enterprise.

## Module

`server/src/api/`

| Area | Path | Purpose |
|------|------|---------|
| Standards | `standards/` | Success/error/pagination envelopes |
| Registry | `registry/` | Mount points + generated endpoint inventory |
| Docs | `docs/` | OpenAPI + Swagger UI routes |

## Standard contracts

### Success (new enterprise envelope)

```json
{
  "success": true,
  "data": {},
  "meta": {
    "requestId": "req_123",
    "engineVersion": "sprint72-v1",
    "timestamp": "2026-07-08T12:00:00.000Z"
  }
}
```

### Error (standardized — backward compatible fields retained)

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "Invalid request payload.",
  "requestId": "req_123",
  "errors": {}
}
```

Clients sending `Accept: application/problem+json` receive RFC 7807-compatible payloads.

### Pagination (standard)

```json
{
  "success": true,
  "data": {
    "items": [],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 100,
      "totalPages": 5
    }
  }
}
```

Legacy list endpoints (`{ cases, page, pageSize, total, totalPages }`) remain supported during migration.

## API versioning

| Path | Status |
|------|--------|
| `/api/v1/*` | **Canonical** |
| `/api/*` | Legacy alias (deprecated, identical router) |

## Documentation routes

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/v1/docs` | Swagger UI |
| GET | `/api/v1/openapi.json` | Full OpenAPI 3.1 JSON spec |
| GET | `/api/v1/standards` | Machine-readable standard contract summary |

## Generation scripts

```bash
npm run api:inventory   # Scan route files -> API_INVENTORY.md + endpoint-inventory.json
npm run api:openapi     # Build lib/api-spec/openapi.json (552 operations)
npm run swagger         # inventory + openapi
```

## Inventory summary

- **552** REST operations scanned across **56** route modules
- **20** OpenAPI tag groups
- Auth-detected routes use bearer JWT security in OpenAPI

## Migration guidance

1. New enterprise endpoints **must** use `sendSuccess`, `sendCreated`, `sendPaginated` from `server/src/api/standards`
2. Errors **must** use `throw new AppError(...)` (never inline `{ error: ... }`)
3. Validation **must** use `validateBody` / `validateQuery` or Zod `.parse()` with global handler
4. Regenerate OpenAPI after adding routes: `npm run swagger`

## Tests

- `scripts/sprint72-api-standardization.test.ts`
- `tests/unit/server/api/standards.test.ts`

## Version

`sprint72-v1`
