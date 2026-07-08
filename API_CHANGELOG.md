# API Changelog — Sprint 72

## 2026-07-08 — Enterprise API Standardization (Sprint 72)

### Added

- Enterprise API standards module (`server/src/api/standards/`)
- Standard success envelope: `{ success, data, meta? }`
- Standard error envelope: `{ success, code, message, requestId?, errors? }`
- RFC 7807 `application/problem+json` support in global error handler
- API documentation routes:
  - `GET /api/v1/docs` — Swagger UI
  - `GET /api/v1/openapi.json` — full OpenAPI 3.1 specification
  - `GET /api/v1/standards` — contract summary
- Endpoint inventory generator (`npm run api:inventory`)
- OpenAPI generator (`npm run api:openapi`, `npm run swagger`)
- Generated inventory: **552 operations** across **56 route modules

### Changed

- Global error handler now includes `success: false` on all error responses
- OpenAPI spec expanded from 1 operation to **552 operations**
- Orval input switched to `lib/api-spec/openapi.json`
- `GET /api/v1/enterprise-rules-engine/health` migrated to standard success envelope (reference implementation)

### Deprecated

- Bare `/api/*` paths — use `/api/v1/*` for new integrations

### Unchanged (backward compatible)

- Legacy list response shapes (`{ cases, page, ... }`, `{ notifications, ... }`)
- Existing HTTP status codes per endpoint
- Cookie + Bearer authentication mechanisms
- All existing route paths and operation semantics

### Breaking changes

**None.** Sprint 72 is additive and documentation-focused. Error responses gain a `success: false` field only.
