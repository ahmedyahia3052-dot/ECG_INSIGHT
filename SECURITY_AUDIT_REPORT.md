# SECURITY_AUDIT_REPORT.md

# Sprint 105 — Enterprise Backend Security Audit

**Project:** ECG Insight Enterprise  
**Sprint:** 105 — Backend Security Audit (pre–Bolt UI integration)  
**Date:** 2026-07-09  
**Scope:** `server/` backend only — no UI changes, no page redesigns  
**Method:** Static code review, architecture tracing, integration-test inventory, cross-reference with Sprints 36/55/71/83 security work

---

## Executive Summary

The ECG Insight backend ships substantial enterprise security scaffolding: JWT sessions with DB re-validation, refresh-token rotation with reuse detection, CSRF for cookie auth, layered rate limiting, RBAC permission matrix, tenant middleware, upload magic-byte validation, audit logging, PHI encryption helpers, and security-event persistence.

**Overall posture:** Strong foundations with **inconsistent enforcement** across dual patient APIs and several IDOR gaps on mutation paths.

| Category | Rating | Notes |
|----------|--------|-------|
| Authentication | **Strong** | JWT + sessions, lockout, password policy |
| Authorization / RBAC | **Partial** | Matrix exists; not applied globally |
| Tenant Isolation | **Partial** | Org-platform strong; org-domain mutations weak |
| API Security | **Good** | Helmet, CORS, rate limits, Zod validation |
| Upload / OCR / AI | **Mixed** | ECG uploads strong; OCR/AI history gaps |
| Secrets / Env | **Good** | Zod schema; production guards; fallback risks |
| Audit / Monitoring | **Good** | Structured logging; in-process metrics only |

**Critical findings (must fix before production):**

1. Organization-domain patient `PATCH`/`DELETE` lack tenant checks (cross-tenant IDOR).
2. OCR routes process documents by ID without document access verification.
3. AI `/history` returns global analyses without user/org scoping.

---

## 1. Authentication

### Key Files

| File | Role |
|------|------|
| `server/src/middleware/auth.ts` | `requireAuth`, `requireRole` |
| `server/src/utils/jwt.ts` | Access/refresh JWT sign/verify |
| `server/src/modules/authentication/service/session.service.ts` | Session lifecycle, refresh rotation |
| `server/src/modules/authentication/service/authentication.service.ts` | Register/login/password |
| `server/src/modules/authentication/service/password.service.ts` | Password policy, reuse prevention |
| `server/src/modules/authentication/service/cookie.service.ts` | HttpOnly refresh + CSRF cookies |
| `server/src/auth/auth.routes.ts` | Public auth endpoints |
| `server/src/middleware/auth-rate-limit.ts` | Auth-specific rate limiting |

### Strengths

- Access tokens (15m TTL) validated with `issuer`/`audience`; every request re-checks DB session for revocation/expiry.
- Refresh tokens stored hashed; rotation increments `tokenVersion`; reuse triggers full user session revocation.
- Concurrent session cap (`MAX_CONCURRENT_SESSIONS = 5`).
- Account lockout after 5 failed logins (15 min).
- Password policy: 12+ chars, complexity, reuse prevention, 90-day history.
- OAuth (Google/Apple/Microsoft) gated by provider configuration.
- Auth endpoints use dedicated rate limiter (30 req / 15 min).

### Gaps

| Gap | Severity | Detail |
|-----|----------|--------|
| MFA not enforced at login | High | MFA enrollment exists in `security.routes.ts` but login flow does not require it |
| Email enumeration | Medium | `GET /auth/email-availability` reveals registered emails |
| Dev token leakage | Low | `auth-response-safety.ts` exposes reset/OTP tokens in non-production |
| Impersonation privilege | Medium | SUPER_ADMIN impersonation issues 15m tokens; audit-only control |

### Evidence

```15:47:server/src/middleware/auth.ts
export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  // verifies JWT, loads session from DB, checks revoked/expired/active
}
```

```107:111:server/src/modules/authentication/service/session.service.ts
if (session.refreshTokenHash !== hashToken(refreshToken) || session.tokenVersion !== claims.tokenVersion) {
  await sessionRepository.revokeAllForUser(session.userId);
  // REFRESH_REUSE
}
```

---

## 2. Authorization, JWT, Refresh Tokens, RBAC, Permission Matrix

### Key Files

| File | Role |
|------|------|
| `server/src/modules/authentication/domain/roles.ts` | Role rank matrix |
| `server/src/modules/organization-platform/permissions.ts` | 21 enterprise permissions, 14 system roles |
| `server/src/modules/organization-platform/tenant.middleware.ts` | `requireTenantAccess`, `requirePermission` |
| `server/src/utils/resource-access.ts` | Relationship-based patient/case access |
| `shared/types/role.ts` | Shared role permission contracts |

### Strengths

- **RBAC matrix:** 21 enterprise permissions across 14 system roles (Sprint 55).
- **Fine-grained permissions:** `requirePermission()` on organization-platform routes.
- **CSRF** double-submit cookie for cookie-authenticated mutating requests.
- **Impersonation** blocked for OWNER; audited for SUPER_ADMIN.
- Refresh token rotation with reuse detection (see Section 1).

### Gaps

| Gap | Severity | Detail |
|-----|----------|--------|
| Coarse `requireRole` | Medium | `ORGANIZATION_ADMIN` and `DOCTOR` share rank 3; SUPER_ADMIN bypass is broad |
| Permission matrix not global | High | `requirePermission` used on ~23 organization-platform routes; most clinical routes use role-only checks |
| Hardcoded owner identity | High | `DEVELOPER_OWNER_EMAIL` in subscriptions + copilot routes |
| Developer role over-privileged | Medium | `developer` system role grants all `ENTERPRISE_PERMISSIONS` |

### Evidence

```90:110:server/src/modules/organization-platform/tenant.middleware.ts
export function requirePermission(...required: EnterprisePermission[]) {
  // resolves member permissions; platform admins bypass
}
```

---

## 3. Organization Isolation, Department Isolation, and Patient Isolation

### Key Files

| File | Role |
|------|------|
| `server/src/modules/organization-platform/organization-platform.routes.ts` | Org CRUD with tenant middleware |
| `server/src/modules/organization-domain/routes.ts` | Alternate org-domain API |
| `server/src/modules/organization-domain/repository.ts` | Scoped repositories |
| `server/src/patients/patients.routes.ts` | Legacy patient API |
| `server/src/utils/resource-access.ts` | Relationship-based access |
| `prisma/schema.prisma` | `Patient.organizationId`, `departmentId` |

### Strengths

- Organization-platform routes consistently use `requireTenantAccess()` + `requirePermission()`.
- Organization-domain **GET** `/patients/:patientId` checks `patient.organizationId` vs user org.
- Organization-domain list endpoints scope via `resolveScopedOrganizationId()`.
- Schema supports org, department, branch membership on `OrganizationMember`.
- Soft-delete contracts in `server/src/database/foundation/`.

### Gaps

| Gap | Severity | Detail |
|-----|----------|--------|
| **Org-domain PATCH/DELETE patients missing tenant check** | **Critical** | Mutations verify patient exists but not org membership |
| Dual patient APIs | High | `/api/patients` uses relationship-based access; `/api/organization-domain/patients` uses org scoping |
| Legacy patient list org filter | High | Non-admin users can pass `?organizationId=` without tenant enforcement |
| No department-level isolation | Medium | `departmentId` on schema rarely enforced in query paths |
| ADMIN/SUPER_ADMIN bypass | Medium | `canAccessPatient()` grants full access without org boundary |

### Evidence

```364:376:server/src/modules/organization-domain/routes.ts
organizationDomainRouter.get("/patients/:patientId", async (req, res, next) => {
  // GET enforces cross-tenant check
  if (!isPlatformAdmin(req.auth!.role) && patient.organizationId) {
    const orgId = await resolveUserOrganizationId(req.auth!.id);
    if (orgId && orgId !== patient.organizationId) throw new AppError(403, "Cross-tenant access denied.", "TENANT_FORBIDDEN");
  }
});
```

```378:410:server/src/modules/organization-domain/routes.ts
organizationDomainRouter.patch("/patients/:patientId", ...);
organizationDomainRouter.delete("/patients/:patientId", ...);
// PATCH/DELETE — no resolveScopedOrganizationId or tenant check
```

```19:55:server/src/utils/resource-access.ts
export async function canAccessPatient(patientId, auth) {
  // checks auditLogs, cases, reports, tasks — NOT organizationId
}
```

---

## 4. API Security, Rate Limiting, Input/Output Validation

### Key Files

| File | Role |
|------|------|
| `server/src/app.ts` | Helmet, CORS, global rate limit, middleware stack |
| `server/src/middleware/api-security.ts` | IP/user throttling, CSRF, request signing |
| `server/src/middleware/validate.ts` | Zod body/query validation |
| `server/src/middleware/input-sanitizer.ts` | Prototype pollution guard |
| `server/src/middleware/error.ts` | Standardized error responses |
| `server/src/api/standards/errors.ts` | Problem+JSON support |

### Strengths

- Helmet with HSTS in production, frame denial, referrer policy.
- CORS whitelist with dev localhost exception.
- Three rate-limit layers: global, auth-specific, production IP/user throttles.
- Optional HMAC request signing (`x-request-signature` + timestamp window).
- Zod validation widely used on routes.
- Input sanitizer blocks `__proto__`/`constructor`/`prototype`.
- Generic 500 responses — no stack traces to clients.
- Request ID propagation.

### Gaps

| Gap | Severity | Detail |
|-----|----------|--------|
| Production-only IP/user limits | Medium | Throttling skipped outside `NODE_ENV === "production"` |
| In-memory rate limit stores | Medium | Not distributed; reset on restart |
| Request signing optional | Medium | Missing signature passes validation |
| No global output schema validation | Low | Responses not systematically validated |
| AI `/health` and `/models` unauthenticated | Low | Provider health exposed without auth |

### Evidence

```81:96:server/src/app.ts
app.use(rateLimit({ limit: env.RATE_LIMIT_MAX, windowMs: env.RATE_LIMIT_WINDOW_MS }));
```

```61:71:server/src/middleware/api-security.ts
function validSignature(req) {
  if (!signature) return true; // signing is optional
}
```

---

## 5. Audit Logging and Exception Handling

### Key Files

| File | Role |
|------|------|
| `server/src/modules/audit/audit.routes.ts` | Admin audit read + client audit write |
| `server/src/modules/security/security.routes.ts` | Security audit helpers |
| `server/src/modules/organization-domain/domain-audit.ts` | Domain audit recording |
| `server/src/ai-foundation/audit/service.ts` | AI inference audit |
| `server/src/utils/logger.ts` | Pino structured logging |
| `server/src/middleware/error.ts` | Central error handler |

### Strengths

- Immutable audit trail with actor, IP, user-agent, entity refs.
- Security events for CSRF failures, rate limits, failed logins, device revocation.
- Client audit whitelist: `PATIENT_VIEWED`, `REPORT_DOWNLOADED`, `REPORT_VIEWED`.
- Super-admin middleware logs protected endpoint access.
- Financial audit separate from clinical audit.
- Centralized error handler with `AppError` codes.

### Gaps

| Gap | Severity | Detail |
|-----|----------|--------|
| Audit read lacks org scoping | Medium | `GET /audit` returns up to 200 logs globally |
| Client-submitted audit trusts actor | Medium | Doctors POST arbitrary `patientId` without access verification |
| Audit `organizationId` often unset | Low | Many `auditLog.create` calls omit org context |
| Exception monitoring log-only | Medium | `EXCEPTION_MONITORING_DSN` checked but only writes to Pino |

### Evidence

```13:42:server/src/modules/audit/audit.routes.ts
auditRouter.get("/", requireRole("ADMIN"), async (req, res) => {
  // global findMany, no mandatory tenant filter
});
```

---

## 6. File Upload Security and ECG Upload Validation

### Key Files

| File | Role |
|------|------|
| `server/src/uploads/uploads.routes.ts` | Legacy ECG upload |
| `server/src/modules/ecg-storage-engine/` | Enterprise ECG storage |
| `server/src/utils/upload-security.ts` | Magic-byte validation |
| `server/src/utils/upload-access.ts` | Path traversal + download auth |
| `server/src/utils/file-security.ts` | Signed download tokens, threat scan |
| `server/src/modules/documents/documents.routes.ts` | Clinical document upload |

### Strengths

- MIME + extension allowlists on ECG/document uploads.
- Magic-byte validation for PDF/PNG/JPEG.
- Size limits: 20MB uploads, 50MB ECG storage engine, 25MB copilot.
- Path traversal prevention in `normalizeUploadPath()`.
- Download authorization via `assertEcgFileDownloadAccess()` and signed tokens.
- Checksum deduplication in ECG storage engine.
- Case ownership check on upload paths (Sprint 71).

### Gaps

| Gap | Severity | Detail |
|-----|----------|--------|
| Documents upload lacks magic-byte check | Medium | MIME filter only |
| Weak malware scanning | Medium | `scanFileForThreats` checks eicar/script strings only |
| ECG storage `/download` token-only | Medium | No `requireAuth`; relies on signed token scope |
| Copilot accepts `application/octet-stream` | Medium | Bypasses strict MIME matching |

### Evidence

```21:40:server/src/utils/upload-security.ts
export function assertUploadContentMatchesMime(filePath, mimeType) {
  // magic-byte validation
}
```

```14:26:server/src/utils/upload-access.ts
export function normalizeUploadPath(requestedPath) {
  if (requestedPath.includes("..")) throw new AppError(403, ...);
}
```

---

## 7. OCR Security

### Key Files

| File | Role |
|------|------|
| `server/src/modules/ocr/ocr.routes.ts` | OCR processing endpoints |
| `server/src/modules/documents/document-intelligence.service.ts` | OCR extraction pipeline |
| `server/src/modules/copilot/attachment/ocr-cache.service.ts` | File-based OCR cache |

### Strengths

- OCR routes require authentication and `DOCTOR` role.
- Zod validation on `documentId` input.
- OCR failure notifications to ADMIN role.
- Clinical document model with typed metadata.

### Gaps

| Gap | Severity | Detail |
|-----|----------|--------|
| **No document access check on `/process`** | **Critical** | Any doctor can OCR any document by ID |
| **`extractAndIndexDocument` has no authz** | **Critical** | `actorId` used for audit only, not access control |
| **`/extract` loads document without authz** | High | Same IDOR pattern as `/process` |
| OCR cache on local filesystem | Medium | `uploads/ocr-cache` — no encryption at rest |

### Evidence

```21:31:server/src/modules/ocr/ocr.routes.ts
ocrRouter.post("/process", requireRole("DOCTOR"), async (req, res, next) => {
  const { extraction } = await extractAndIndexDocument(body.documentId, req.auth!.id);
  // no document access check
});
```

```173:178:server/src/modules/documents/document-intelligence.service.ts
export async function extractAndIndexDocument(documentId, actorId) {
  const document = await prisma.clinicalDocument.findUnique({ where: { id: documentId } });
  // no authorization
}
```

---

## 8. AI Endpoint Security

### Key Files

| File | Role |
|------|------|
| `server/src/ai/ai.routes.ts` | AI analyze endpoints |
| `server/src/ai-foundation/foundation.routes.ts` | AI foundation inference |
| `server/src/ai-foundation/rate-limit/service.ts` | AI inference rate limit |
| `server/src/ai-foundation/audit/service.ts` | Inference audit |
| `server/src/ai-foundation/cache/inference-cache.ts` | AI result cache |

### Strengths

- AI analysis checks case access + subscription quota before queueing.
- AI foundation has input validation, medical output validation, per-actor rate limits.
- Inference audit trail on cache hits and misses.
- Admin-only statistics endpoint.

### Gaps

| Gap | Severity | Detail |
|-----|----------|--------|
| **AI `/history` global data exposure** | **High** | No `userId` or org filter on analyses |
| AI foundation inference | Medium | No case/patient access check on body `caseId`/`patientId` |
| AI `/health` and `/models` unauthenticated | Low | Provider metadata exposed |
| AI cache may serve stale clinical results | Low | Cache keyed by case/measurement; TTL not visible in audit |

### Evidence

```118:133:server/src/ai/ai.routes.ts
aiRouter.get("/history", async (req, res, next) => {
  const where: Prisma.AIAnalysisWhereInput = {};
  // no user/org scope
});
```

---

## 9. Subscription Validation and Developer Permissions

### Key Files

| File | Role |
|------|------|
| `server/src/subscriptions/monetization.service.ts` | Quota enforcement |
| `server/src/subscriptions/subscriptions.routes.ts` | Billing, licenses, impersonation |
| `server/src/subscriptions/financial.service.ts` | Webhooks, checkout |
| `server/src/modules/organization-platform/permissions.ts` | `SUBSCRIPTION_PLAN_LIMITS` |

### Strengths

- `assertCanRunAnalysis()` enforces per-plan quotas before AI/ECG processing.
- Lifetime plan restricted to SUPER_ADMIN / owner-only endpoints.
- Webhook signature verification on generic `POST /payments/webhooks/:provider`.
- Financial audit trail for payments/refunds.
- Plan feature matrix (`aiFeatureAccess`).

### Gaps

| Gap | Severity | Detail |
|-----|----------|--------|
| Hardcoded owner email | High | `ownerOnly` middleware checks exact email string |
| Paymob webhook unsigned | High | `POST /payments/paymob/webhook` lacks signature check |
| `PAYMENT_WEBHOOK_SECRET` dev default | Medium | Not in env schema; hardcoded fallback |
| Quota is user-scoped, not org-scoped | Medium | Enterprise org billing may not align with per-user `usageRecord` |

### Evidence

```229:242:server/src/subscriptions/monetization.service.ts
export async function assertCanRunAnalysis(userId) {
  if (!snapshot.canAnalyze) throw new AppError(402, ..., "SUBSCRIPTION_QUOTA_EXHAUSTED");
}
```

---

## 10. Feature Flags

### Key Files

| File | Role |
|------|------|
| `shared/config/feature-flags.ts` | UI migration flags |
| `artifacts/ecg-insight/src/core/feature-flags.ts` | Client feature flags |

### Assessment

Feature flags control **frontend UI migration** (Bolt vs legacy), not backend authorization. Backend security must not rely on client-side flags. No server-side feature-flag middleware gates sensitive endpoints.

**Recommendation:** Add server-side feature flags for risky capabilities (AI inference, OCR, developer console) if gradual rollout is needed.

---

## 11. Environment Variables and Secrets Management

### Key Files

| File | Role |
|------|------|
| `server/src/config/env.ts` | Zod-validated env schema |
| `server/src/utils/security-crypto.ts` | PHI encryption, TOTP |
| `server/src/utils/file-security.ts` | Download token secrets |

### Strengths

- Zod schema validates types, URLs, min secret lengths.
- Production guards reject placeholder/localhost values for critical vars.
- HTTPS enforcement for `EXPO_PUBLIC_API_URL`, `CLIENT_ORIGIN`, `AI_ENGINE_URL` in production.
- Separate JWT access/refresh secrets (min 32 chars).
- Optional dedicated secrets: `PHI_ENCRYPTION_KEY`, `DOWNLOAD_TOKEN_SECRET`, `REQUEST_SIGNING_SECRET`.

### Gaps

| Gap | Severity | Detail |
|-----|----------|--------|
| Dev JWT secrets in source defaults | Medium | `env.ts` embeds development JWT secrets |
| Secret fallback chains | High | PHI encryption → `JWT_SECRET`; download tokens → `JWT_SECRET` |
| `PHI_ENCRYPTION_KEY` optional in production | High | No production `superRefine` requiring it |
| `PAYMENT_WEBHOOK_SECRET` not in env schema | Medium | Read from `process.env` with dev default |

### Evidence

```136:181:server/src/config/env.ts
.superRefine((value, ctx) => {
  if (value.NODE_ENV !== "production") return;
  // rejects placeholder DATABASE_URL, JWT_SECRET, etc.
});
```

```6:8:server/src/utils/security-crypto.ts
function encryptionSecret() {
  return env.PHI_ENCRYPTION_KEY ?? env.JWT_SECRET;
}
```

---

## 12. Database Transactions, Repository Layer, Dependency Injection

### Key Files

| File | Role |
|------|------|
| `server/src/database/foundation/contracts.ts` | Entity registry |
| `server/src/database/foundation/repository-validator.ts` | Query validation helpers |
| `server/src/modules/organization-domain/repository.ts` | Domain repositories |
| `server/src/modules/authentication/repository/` | Auth repositories |
| `server/src/config/prisma.ts` | Prisma singleton |

### Strengths

- Entity contracts document soft-delete, audit fields, relationships.
- `validateRepositoryQuery()` warns on missing `deletedAt` filters.
- Transactions used for registration, session rotation, ingestion pipelines.
- Repository pattern in auth, org-domain, ECG storage, enterprise rules.
- Soft-delete via `notDeletedWhere()` in org-domain repos.

### Gaps

| Gap | Severity | Detail |
|-----|----------|--------|
| No DI container | Low | Direct singleton imports; hard to enforce policies globally |
| Repository validator advisory only | Medium | Warnings only; not automatic |
| Inconsistent org scoping in repos | High | `listPatientsRepo` trusts caller-provided `organizationId` |
| Many routes use Prisma directly | Medium | Bypass repository layer |
| Patient update allows `organizationId` change | High | Without tenant check on mutation path |

---

## 13. Caching, Logging, and Monitoring

### Key Files

| File | Role |
|------|------|
| `server/src/middleware/observability.ts` | Request metrics |
| `server/src/utils/logger.ts` | Pino logging |
| `server/src/modules/health/health.service.ts` | Readiness/production snapshots |
| `server/src/modules/security/security.routes.ts` | `/monitoring/summary` |

### Strengths

- Structured JSON logging with request ID, duration, status.
- `/health`, `/ready`, `/metrics` endpoints.
- Production readiness snapshot checks DB, AI, storage, queue, audit pipeline.
- Security monitoring summary (failed logins, critical events, risk score).
- Redis optional for readiness.

### Gaps

| Gap | Severity | Detail |
|-----|----------|--------|
| Metrics in-process only | Medium | Lost on restart; not Prometheus-compatible |
| No APM integration | Medium | DSN env var exists but no exporter SDK |
| `/metrics` unauthenticated | Low | Request counts/errors exposed |

---

## Security Test Coverage

| Script | Coverage |
|--------|----------|
| `scripts/sprint36-security-hardening.integration.ts` | MFA tables, CSRF, session reuse markers |
| `scripts/sprint71-security-hardening.test.ts` | Magic bytes, path traversal, token redaction |
| `scripts/sprint55-rbac-security.test.ts` | Permission matrix unit tests |
| `scripts/auth-session-hardening.integration.ts` | Session refresh, reuse detection |
| `scripts/owner-security.integration.ts` | Owner account protection |
| `scripts/sprint105-backend-security-audit.test.ts` | Sprint 105 audit deliverables |
| `scripts/sprint105-backend-security-audit.integration.ts` | Security module markers |

### Test Gaps

- No integration tests for cross-tenant patient IDOR on org-domain PATCH/DELETE.
- No tests for OCR document authorization.
- No tests for AI history data leakage.
- No tests for Paymob webhook forgery.

---

## Conclusion

The backend is **architecturally ready** for Bolt UI integration from a security-primitives standpoint, but **not production-ready** until P0 IDOR gaps (org-domain patient mutations, OCR authorization, AI history scoping) are remediated. Prior audits (Sprints 36, 55, 71) delivered meaningful hardening; Sprint 105 confirms remaining enforcement gaps before UI integration proceeds at scale.

**Recommended next sprint:** Sprint 106 — Backend Security Remediation (P0/P1 fixes only, no UI).

---

*Generated by Sprint 105 Enterprise Backend Security Audit — read-only review, no UI modifications.*
