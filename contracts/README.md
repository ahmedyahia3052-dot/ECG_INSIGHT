# ECG Insight API Contracts (Sprint 103)

Stable API contracts for Bolt UI replacement. All endpoints are mounted at `/api` and `/api/v1`.

## Contract Standards

| Concern | Location |
|---------|----------|
| Error body | `shared/types/errors.ts` → `ApiErrorBody` |
| Pagination | `shared/types/pagination.ts` → `PaginationMeta` |
| List queries | `page`, `pageSize`, `q`, `sortBy`, `sortDir` |
| Success envelope | `{ success: true, data, meta? }` (server `ApiSuccessBody`) |

## HTTP Error Contract

| Status | Code | When |
|--------|------|------|
| 401 | `UNAUTHORIZED` | Missing/invalid session |
| 403 | `FORBIDDEN` | RBAC denial |
| 404 | `NOT_FOUND` | Resource missing |
| 409 | `CONFLICT` | State conflict (duplicate, stale revision) |
| 422 | `VALIDATION_ERROR` | Zod/schema validation failure |
| 429 | `RATE_LIMITED` | Throttle exceeded |
| 500 | `INTERNAL_ERROR` | Unhandled server fault |

## Core Modules

See `api-registry.json` for machine-readable inventory.

### Auth (`/auth`)
- **POST /register** — create account; body: credentials; 201 user + token
- **POST /login** — authenticate; 200 token + user
- **GET /me** — current session user; 200 `User`

### Cases (`/cases`)
- **GET /** — paginated case list; query: `page`, `pageSize`, `q`, `status`, `severity`
- **GET /:caseId** — case detail; 200 `ECGCase`
- **POST /:caseId/review** — doctor review; body: diagnosis fields
- **POST /:caseId/approve** — approve case
- **POST /:caseId/reject** — reject case; body: `reason`
- **GET /:caseId/timeline** — paginated `CaseTimelineEvent[]`

### Patients (`/patients`)
- **GET /** — paginated `Patient[]`
- **POST /** — create; body: `PatientInput`
- **GET /:id** — patient detail with related cases

### Reports (`/reports`)
- **GET /** — paginated `ECGReport[]`
- **GET /:id** — report detail
- **POST /:id/finalize** — finalize draft
- **POST /:id/sign** — physician sign

### Subscriptions (`/subscriptions`)
- **GET /me** — `Subscription` + quota
- **GET /billing-history** — invoices and payments

### Enterprise (`/enterprise`)
- **GET /clinical-dashboard** — dashboard KPIs and AI metrics

### Notifications (`/notifications`)
- **GET /** — paginated `Notification[]`

### Uploads (`/uploads`)
- **POST /** — multipart ECG upload; 201 file metadata

## Shared Types

All DTOs map to `shared/types/` — never expose Prisma models to UI.

## Validation

Run `npx tsx scripts/sprint103-backend-readiness.integration.ts` to verify contract files and adapter/repository wiring.
