# Sprint 55 — Enterprise Organization & Multi-Tenant Platform

**Date:** 2026-07-08  
**Tag:** `Sprint55-EnterpriseOrganization`  
**Scope:** Backend architecture, APIs, database, security, organization management — **isolated from ECG workspace, monitor, viewer, and UI.**

---

## Objective

Build the enterprise foundation for SaaS and on-premise deployment with complete organization isolation, RBAC, subscriptions, branding, audit, and notifications.

## Delivered

### Module: `server/src/modules/organization-platform/`

| Component | Responsibility |
|-----------|----------------|
| `permissions.ts` | 21 granular permissions + 14 system role definitions |
| `tenant.middleware.ts` | `requireTenantAccess`, `requirePermission`, cross-tenant blocking |
| `organization.service.ts` | Org CRUD, departments, branches, members, subscriptions, branding |
| `audit.service.ts` | Enterprise audit + login history |
| `organization-platform.routes.ts` | REST API at `/api/organization-platform` |
| `schemas.ts` | Zod validation for all endpoints |

### Database (migration `20260708010000_sprint55_enterprise_organization`)

| Model | Purpose |
|-------|---------|
| `Organization` (extended) | Brand color, timezone, language, license/tax, quotas, soft delete, versioning |
| `OrganizationBranch` | Unlimited branches with GPS, manager, counters |
| `OrganizationSubscription` | Org-level plans, limits, feature flags |
| `OrganizationBranding` | Logo, colors, PDF/email/login/report branding |
| `EnterpriseRole` | Platform + org custom roles with JSON permissions |
| `OrganizationMember` | User-org membership with role, department, branch |
| `LoginHistory` | IP, device, success/failure tracking |
| `OrganizationNotification` | Notification center (7 categories) |
| `Department` (extended) | Category presets (Cardiology, ICU, etc.) |

### REST API (`/api/organization-platform`)

| Method | Endpoint | Permission |
|--------|----------|------------|
| POST | `/bootstrap` | SUPER_ADMIN — seed system roles |
| GET | `/permissions/catalog` | Auth — list all permissions |
| GET | `/` | Auth — list orgs (scoped) |
| POST | `/` | ADMIN+ — create organization |
| GET | `/:organizationId` | Tenant access |
| PATCH | `/:organizationId` | `organization.manage` |
| DELETE | `/:organizationId` | SUPER_ADMIN — soft delete |
| POST | `/:organizationId/departments` | `department.manage` |
| POST | `/:organizationId/branches` | `branch.manage` |
| POST | `/:organizationId/members` | `user.invite` |
| POST | `/:organizationId/roles` | `user.manage` |
| PATCH | `/:organizationId/subscription` | `subscription.manage` |
| PATCH | `/:organizationId/branding` | `branding.manage` |
| GET | `/:organizationId/audit` | `audit.access` |
| GET/POST | `/:organizationId/notifications` | Tenant / `notification.manage` |

### Security

- Tenant isolation middleware blocks cross-org access
- Platform admins (OWNER/SUPER_ADMIN) bypass tenant scope
- Granular `requirePermission` checks against enterprise role JSON
- Audit logging on all org mutations
- Login history model for failed login detection
- Existing CSRF, rate limiting, MFA, session management preserved

### Tests

| Script | Result |
|--------|--------|
| `scripts/sprint55-enterprise-organization.integration.ts` | PASS |
| `scripts/sprint55-rbac-security.test.ts` | PASS |

### Quality Gates

| Gate | Result |
|------|--------|
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `npm run build` | PASS |
| `prisma migrate deploy` | PASS |

### Preserved (not modified)

- ECG Workspace, Live Monitor, Render Engine, Canvas, Viewer, Image Processing, Clinical Reading UI

## Tag

`Sprint55-EnterpriseOrganization`
