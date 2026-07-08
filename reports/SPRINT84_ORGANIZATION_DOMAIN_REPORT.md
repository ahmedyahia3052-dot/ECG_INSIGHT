# Sprint 84 — Organization Domain Report

**Date:** 2026-07-09  
**Contract version:** `sprint84-v1`  
**Continues from:** Sprint 82 (ECG Processing Engine) + Sprint 80 (Database Foundation)

---

## Executive Summary

Sprint 84 delivers a unified **Organization Domain** API at `/api/v1/organization-domain` covering Organization, Department, Employee, Patient, Doctor, and ECG Case management with full CRUD, pagination, search, sorting, soft delete, audit trail, repository layer, Zod validation, Swagger documentation, and tests.

Authentication was **not modified** — all routes use existing `requireAuth` and tenant middleware from organization-platform.

| Gate | Result |
|------|--------|
| `npm run lint` | **PASS** |
| `npm run typecheck` | **PASS** |
| `npm run build` | **PASS** |
| Sprint 84 integration script | **PASS** |
| Sprint 84 unit test | **PASS** |

---

## API Surface

Base path: `/api/v1/organization-domain`

| Entity | Endpoints |
|--------|-----------|
| **Organization** | `GET/POST /organizations`, `GET/PATCH/DELETE /organizations/:organizationId` |
| **Department** | `GET/POST /organizations/:organizationId/departments`, `GET/PATCH/DELETE /departments/:departmentId` |
| **Employee** | `GET/POST /organizations/:organizationId/employees`, `GET/PATCH/DELETE /employees/:employeeId` |
| **Patient** | `GET/POST /patients`, `GET/PATCH/DELETE /patients/:patientId` |
| **Doctor** | `GET /organizations/:organizationId/doctors`, `GET/PATCH /doctors/:doctorId` |
| **ECG Case** | `GET/POST /cases`, `GET/PATCH/DELETE /cases/:caseId` |
| **Audit Trail** | `GET /organizations/:organizationId/audit` |

### List Query Parameters (all list endpoints)

| Param | Description |
|-------|-------------|
| `page` | Page number (default 1) |
| `pageSize` | Items per page (max 100, default 25) |
| `q` | Full-text search |
| `sortBy` | Entity-specific sort field |
| `sortDir` | `asc` or `desc` |
| `includeDeleted` | Include soft-deleted records |
| `organizationId` | Tenant scope filter |

---

## Architecture

```
organization-domain/
├── routes.ts           # REST handlers (requireAuth + tenant isolation)
├── repository.ts       # Prisma repositories + Sprint 80 foundation helpers
├── schemas.ts          # Zod validation
├── list-query.ts       # Pagination/sort helpers
├── domain-audit.ts     # AuditLog integration
├── swagger.ts          # OpenAPI path fragments
└── index.ts            # Public exports
```

### Repository Layer

Uses Sprint 80 database foundation:

- `notDeletedWhere()` / `withNotDeleted()` — soft-delete filtering
- `softDeleteData()` — soft-delete writes
- `buildCreateUpdateAudit()` / `buildUpdateAudit()` — audit field population

### Soft Delete Policy

| Entity | Mechanism |
|--------|-----------|
| Organization, Department, Patient, ECG Case | `deletedAt` timestamp |
| Employee | `employmentStatus = TERMINATED` |
| Doctor | `isActive` flag (via User model) |

### Audit Trail

All create/update/delete operations write to `AuditLog` via `recordDomainAudit()` → `recordEnterpriseAudit()`.

---

## Swagger

Organization Domain paths merged into `/api/v1/openapi.json` at runtime via `docs.routes.ts`.

Tag: **Organization Domain** (`sprint84-v1`)

---

## Validation

| Script | Purpose |
|--------|---------|
| `scripts/sprint84-organization-domain.integration.ts` | Structure + route marker validation |
| `scripts/sprint84-organization-domain.test.ts` | List query, pagination, foundation helper unit tests |

---

## Relationship to Legacy APIs

| Legacy Surface | Status |
|----------------|--------|
| `/organization-platform/*` | Retained — enterprise RBAC, branches, roles |
| `/organizations`, `/departments`, `/employees` (workforce) | Retained — backward compatible |
| `/patients`, `/cases` | Retained — clinical workflows unchanged |

Sprint 84 is the **canonical unified domain API** for org/patient CRUD going forward.

---

*Generated: Sprint 84 — Organization Domain · ECG Insight Enterprise*
