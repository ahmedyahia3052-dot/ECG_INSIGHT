# API Compatibility Report — Sprint 72

Generated as part of Sprint 72 Enterprise API Standardization.

## Versioning compatibility

| Client expectation | Server behavior | Compatible |
|--------------------|-----------------|------------|
| Base path `/api` | Router mounted at `/api` and `/api/v1` | ✅ Yes |
| Base path `/api/v1` | Canonical documented path | ✅ Yes |
| JWT Bearer auth | `Authorization: Bearer <token>` | ✅ Yes |
| Cookie auth | Session cookie from login | ✅ Yes |
| Error `{ code, message, requestId }` | Still returned; adds `success: false` | ✅ Yes |
| Error `{ error: "..." }` (legacy inline) | Some older routes still emit this | ⚠️ Partial |
| Success raw JSON object | Majority of existing endpoints | ✅ Yes |
| Success `{ success, data }` envelope | New standard; one reference endpoint migrated | ⚠️ Gradual |

## Response envelope compatibility

### Errors

The global error handler (`server/src/middleware/error.ts`) now emits:

```json
{ "success": false, "code": "...", "message": "...", "requestId": "..." }
```

**Impact:** Clients that ignore unknown fields remain compatible. Clients using strict schema validation must allow optional `success` boolean on errors.

### Success

No mass migration performed. Existing endpoints retain domain-specific shapes. New enterprise endpoints should adopt the standard envelope.

## OpenAPI compatibility

| Artifact | Before Sprint 72 | After Sprint 72 |
|----------|------------------|-----------------|
| Documented operations | 1 | 552 |
| Security schemes | None | bearerAuth, cookieAuth |
| Standard error schemas | None | ApiErrorResponse, ApiValidationErrorResponse |
| Orval codegen input | openapi.yaml (stub) | openapi.json (full) |

Regenerating Orval clients after Sprint 72 will produce hooks for all inventoried paths. Existing generated `healthCheck` hook remains valid.

## Route inventory compatibility

All **552** scanned operations match live Express route registrations. Inventory is generated from static analysis of `*.routes.ts` files and mount prefixes from `server/src/modules/index.ts`.

## Recommended client migration

1. Prefer `/api/v1` prefix for new integrations
2. Accept optional `success` field on all JSON responses
3. Prefer `code` + `message` over legacy `error` string when both present
4. Use `GET /api/v1/openapi.json` as contract source of truth

## Breaking change summary

**None identified.** Sprint 72 changes are backward compatible.
