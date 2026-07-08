# Sprint 55 — Performance Report

## Database Design

| Optimization | Implementation |
|--------------|----------------|
| Indexes | All new tables indexed on `organizationId`, `status`, `deletedAt`, `createdAt` |
| Pagination | Org list, audit logs — default 25/page, max 100 |
| Soft delete filter | `deletedAt: null` on all queries |
| Foreign keys | Cascade on org children, SetNull on optional refs |

## Scale Targets

| Metric | Design Support |
|--------|----------------|
| 1000+ organizations | Paginated list + indexed `name`, `status`, `type` |
| 100,000+ patients | Existing patient model unchanged; org-scoped via `organizationId` |
| Millions of ECG cases | Existing case model; tenant filter at query layer |
| Horizontal scaling | Stateless API; PostgreSQL with connection pooling |

## Query Patterns

- `listOrganizations` — single COUNT + findMany with `take`/`skip`
- `getOrganizationById` — one query with selective includes
- `listOrganizationAuditLogs` — indexed `organizationId` + `createdAt DESC`

## Caching (future-ready)

- Permission resolution per request (no cache yet — correct for security)
- Subscription limits stored on `OrganizationSubscription` — no join required

## Validation

Migration applied in <15s on local PostgreSQL. API module adds zero frontend bundle impact.
