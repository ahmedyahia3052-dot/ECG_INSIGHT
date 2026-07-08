# Sprint 55 — Security Report

## Authentication (preserved + extended)

| Feature | Status |
|---------|--------|
| JWT access tokens | Existing — unchanged |
| Refresh tokens / sessions | Existing `Session` model |
| Remember Me | Existing auth flow |
| Password policies | Existing `SecurityPolicy` |
| Account lockout | `failedLoginAttempts`, `lockedUntil` on User |
| Multi-device sessions | `UserSession` model |
| Session revocation | Existing session revoke API |

## Sprint 55 Additions

| Feature | Implementation |
|---------|----------------|
| Tenant isolation | `requireTenantAccess()` — `TENANT_FORBIDDEN` on cross-org |
| Permission engine | `requirePermission()` — runtime JSON permission check |
| Login history | `LoginHistory` model — IP, userAgent, deviceId, success |
| Audit trail | All org mutations logged to `AuditLog` with `organizationId` |
| Soft delete | `deletedAt` on Organization, Department, Branch, Member, Role |
| MFA ready | Existing `UserMFA` — not modified |
| CSRF | Existing Sprint 36 middleware — not modified |
| Rate limiting | Existing API security — not modified |

## Threat Mitigations

| Threat | Mitigation |
|--------|------------|
| Cross-tenant data leak | Mandatory org ID match on all platform routes |
| Privilege escalation | Permission JSON validated per action |
| Orphaned org data | Cascade deletes on org removal |
| Audit tampering | Append-only `AuditLog` writes |

## Not Modified

ECG workspace routes, viewer APIs, image processing, clinical reading endpoints — zero changes.
