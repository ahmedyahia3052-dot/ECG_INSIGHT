# API Endpoint Consistency Report — Sprint 72

## Executive summary

Sprint 72 scanned **552 REST operations** across **56 route modules**. The backend is functional and broad, but response and error contracts vary by module age. Sprint 72 introduces standard envelopes and full OpenAPI coverage without breaking existing clients.

## HTTP method distribution

| Method | Count |
|--------|------:|
| GET | 259 |
| POST | 219 |
| PUT | 13 |
| PATCH | 32 |
| DELETE | 29 |

## Tag / domain distribution (top 10)

| Tag | Endpoints |
|-----|----------:|
| ecg | 89 |
| cases | 67 |
| enterprise | 54 |
| clinical-intelligence | 48 |
| hospital-integration | 38 |
| reports | 32 |
| collaboration | 28 |
| medical-intelligence | 24 |
| workforce | 22 |
| notifications | 18 |

## Consistency findings

### ✅ Consistent

- **Authentication middleware:** `requireAuth` used across protected modules
- **Role checks:** `requireRole` pattern in admin/clinical modules
- **Validation:** Zod schemas prevalent in newer enterprise modules
- **Central error handler:** `AppError` + `next(error)` in majority of routes
- **Request tracing:** `requestId` on errors from global handler
- **API versioning:** Dual mount `/api` + `/api/v1` (documented, identical)

### ⚠️ Inconsistent (migration backlog)

| Area | Issue | Example modules |
|------|-------|-------------------|
| Success shape | Raw object vs `{ count, items }` vs `{ ok, service }` | cases, enterprise-rules, health |
| Error shape | Inline `{ error }` vs `AppError` | medical-intelligence, mic |
| Pagination | `{ page, pageSize, total }` key names vary | cases, notifications |
| Health endpoints | `/health`, `/healthz`, module `/health` | multiple |
| DTO naming | `schemas.ts` vs inline Zod vs `dto/` folder | interpretation-engine vs legacy |
| Controller pattern | Flat handlers vs controller classes | mixed |

### 🔧 Remediated in Sprint 72

- Standard success/error/pagination helpers in `server/src/api/standards/`
- Error handler adds `success: false` universally
- RFC 7807 problem+json optional format
- Full OpenAPI spec with shared response components
- Endpoint inventory automation
- Reference migration: `enterprise-rules-engine` health endpoint

## Endpoint naming review

| Pattern | Assessment |
|---------|------------|
| Plural resources (`/cases`, `/patients`) | ✅ RESTful |
| Action suffixes (`/regenerate`, `/publish`) | ✅ Acceptable for clinical workflows |
| Engine suffixes (`*-engine`) | ✅ Clear domain separation |
| Nested ECG paths (`/ecg/diagnostic-pipeline`) | ✅ Logical grouping |
| Duplicate mounts on `/cases` | ⚠️ Document carefully (4 routers) |

## HTTP status code review

| Code | Usage |
|------|-------|
| 200 | Standard reads and updates |
| 201 | Creates (auth, cases, events) |
| 204 | Deletes (notifications) |
| 400 | Zod validation (global handler) |
| 401/403 | Auth middleware |
| 404 | AppError NOT_FOUND |
| 503 | Health/readiness degradation |

**Finding:** Some legacy routes return 404 with inline JSON instead of `AppError` — should migrate incrementally.

## Authentication / authorization documentation

OpenAPI security schemes added:

- **bearerAuth** — JWT (`Authorization: Bearer`)
- **cookieAuth** — session cookie

Inventory auth column marks routes as `authenticated` when `requireAuth` appears in the route file (file-level heuristic).

## Recommendations (post-Sprint 72)

1. Migrate inline error responses to `AppError` module-by-module
2. Adopt `sendSuccess` / `sendPaginated` for new endpoints
3. Run `npm run swagger` in CI when route files change
4. Deprecate `/api` alias in client SDKs over next release cycle
5. Consolidate health endpoints under `/api/v1/health/*`

## Version

`sprint72-v1`
