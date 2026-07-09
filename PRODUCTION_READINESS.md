# PRODUCTION_READINESS.md

# Sprint 105 — Enterprise Backend Production Readiness

**Project:** ECG Insight Enterprise  
**Date:** 2026-07-09  
**Audience:** Engineering, DevOps, Security, Release Management  
**Purpose:** Go/no-go assessment for backend production deployment before Bolt UI integration

---

## Overall Verdict

| Dimension | Status | Score |
|-----------|--------|-------|
| **Security** | **NOT READY** | 2 P0 blockers |
| **Reliability** | Ready with caveats | Single-instance OK |
| **Observability** | Partial | Log-only monitoring |
| **Data Integrity** | Partial | Transaction coverage good; isolation gaps |
| **Compliance** | NOT READY | HIPAA access control gaps |

### Recommendation

**NO-GO for production** until P0 risks (R-01, R-02) are remediated and verified by integration tests.  
**GO for Bolt UI integration development** against current backend APIs with awareness of documented gaps.  
**GO for staging/pilot** after P0 + P1 remediation with single-instance deployment.

---

## Production Readiness Checklist

### Authentication & Sessions

| Item | Status | Verification | Notes |
|------|--------|--------------|-------|
| JWT access token validation with issuer/audience | ✅ Ready | `server/src/utils/jwt.ts` | 15m TTL |
| DB session re-validation on every request | ✅ Ready | `server/src/middleware/auth.ts` | Revocation checked |
| Refresh token rotation + reuse detection | ✅ Ready | `session.service.ts` | Full session revoke on reuse |
| Password policy (12+ chars, complexity, history) | ✅ Ready | `password.service.ts` | 90-day history |
| Account lockout after failed attempts | ✅ Ready | `authentication.service.ts` | 5 attempts / 15 min |
| Auth endpoint rate limiting | ✅ Ready | `auth-rate-limit.ts` | 30 / 15 min |
| CSRF protection for cookie auth | ✅ Ready | `api-security.ts` | Double-submit cookie |
| MFA enforcement at login | ❌ Blocker | `security.routes.ts` | Enrollment exists; not wired to login |
| OAuth provider configuration gating | ✅ Ready | `authentication.service.ts` | Provider env vars required |
| Production token redaction | ✅ Ready | `auth-response-safety.ts` | Reset/OTP hidden in prod |

### Authorization & RBAC

| Item | Status | Verification | Notes |
|------|--------|--------------|-------|
| Enterprise permission matrix (21 permissions, 14 roles) | ✅ Ready | `permissions.ts` | Sprint 55 |
| `requirePermission` on org-platform routes | ✅ Ready | `tenant.middleware.ts` | ~23 usages |
| Global fine-grained permission enforcement | ⚠️ Partial | Clinical routes | Role-only checks remain |
| Resource access helpers (case/patient) | ⚠️ Partial | `resource-access.ts` | Relationship-based, not org-scoped |
| Cross-tenant isolation on all patient mutations | ❌ Blocker | `organization-domain/routes.ts` | PATCH/DELETE missing tenant check |
| Department-level isolation | ❌ Not Ready | Schema only | `departmentId` not enforced in queries |
| Developer permissions (owner-only) | ⚠️ Partial | `subscriptions.routes.ts` | Hardcoded email; use `protectedOwner` flag |

### API Security

| Item | Status | Verification | Notes |
|------|--------|--------------|-------|
| Helmet (HSTS, frameguard, referrer) | ✅ Ready | `server/src/app.ts` | Production HSTS |
| CORS whitelist | ✅ Ready | `server/src/app.ts` | Dev localhost exception |
| Global rate limiting | ✅ Ready | `express-rate-limit` | 600 / 15 min default |
| Production IP/user throttling | ⚠️ Partial | `api-security.ts` | Production-only; in-memory |
| Zod input validation | ✅ Ready | `middleware/validate.ts` | Widely adopted |
| Prototype pollution guard | ✅ Ready | `input-sanitizer.ts` | `__proto__` blocked |
| Standardized error responses | ✅ Ready | `middleware/error.ts` | No stack traces |
| Optional HMAC request signing | ⚠️ Partial | `api-security.ts` | Optional when header absent |
| Output schema validation | ❌ Not Ready | — | No systematic response validation |

### Not Ready / Blockers

| Item | Status | Verification | Notes |
|------|--------|--------------|-------|
| Org-platform tenant middleware | ✅ Ready | `tenant.middleware.ts` | `requireTenantAccess` |
| Org-domain patient GET isolation | ✅ Ready | `organization-domain/routes.ts` | `TENANT_FORBIDDEN` |
| Org-domain patient PATCH/DELETE isolation | ❌ Blocker | `organization-domain/routes.ts` | **P0 — R-01** |
| Legacy `/patients` API isolation | ⚠️ Partial | `patients.routes.ts` | Relationship-based |
| OCR document access control | ❌ Blocker | `ocr.routes.ts` | **P0 — R-02** |
| AI history scoping | ❌ Not Ready | `ai/ai.routes.ts` | Global query — **P1 — R-04** |
| Soft-delete enforcement | ✅ Ready | `database/foundation/` | `notDeletedWhere` helpers |

### Upload & File Security

| Item | Status | Verification | Notes |
|------|--------|--------------|-------|
| ECG magic-byte validation | ✅ Ready | `upload-security.ts` | PDF/PNG/JPEG |
| Path traversal prevention | ✅ Ready | `upload-access.ts` | `normalizeUploadPath` |
| Download access control | ✅ Ready | `assertEcgFileDownloadAccess` | Sprint 71 |
| Signed download URLs | ✅ Ready | `file-security.ts` | Scoped tokens |
| Size limits enforced | ✅ Ready | Multer configs | 20–50MB by route |
| Document upload magic-byte check | ⚠️ Partial | `documents.routes.ts` | MIME only |
| Malware scanning | ⚠️ Partial | `file-security.ts` | String-based only |
| ECG storage download (token-only) | ⚠️ Acceptable | `ecg-storage-engine.routes.ts` | Token must be tightly scoped |

### OCR & AI

| Item | Status | Verification | Notes |
|------|--------|--------------|-------|
| OCR role requirement (DOCTOR) | ✅ Ready | `ocr.routes.ts` | Auth + role |
| OCR document authorization | ❌ Blocker | `document-intelligence.service.ts` | **P0 — R-02** |
| AI analysis quota enforcement | ✅ Ready | `monetization.service.ts` | `assertCanRunAnalysis` |
| AI case access check (analyze) | ✅ Ready | `ai.routes.ts` | Before queueing |
| AI foundation rate limiting | ✅ Ready | `ai-foundation/rate-limit` | Per-actor buckets |
| AI inference audit trail | ✅ Ready | `ai-foundation/audit` | Cache hit/miss logged |
| AI history user/org scoping | ❌ Not Ready | `ai/ai.routes.ts` | **P1 — R-04** |
| AI foundation case access check | ⚠️ Partial | `foundation.routes.ts` | Body IDs not validated |

### Subscriptions & Payments

| Item | Status | Verification | Notes |
|------|--------|--------------|-------|
| Per-plan analysis quotas | ✅ Ready | `monetization.service.ts` | 402 on exhaustion |
| Generic webhook signature verification | ✅ Ready | `financial.service.ts` | HMAC verified |
| Paymob webhook signature | ❌ Not Ready | `subscriptions.routes.ts` | **P1 — R-05** |
| Financial audit trail | ✅ Ready | `FinancialAuditLog` model | Separate from clinical |
| Owner-only license management | ⚠️ Partial | `subscriptions.routes.ts` | Hardcoded email |

### Secrets & Environment

| Item | Status | Verification | Notes |
|------|--------|--------------|-------|
| Zod env schema validation | ✅ Ready | `server/src/config/env.ts` | Types + min lengths |
| Production placeholder rejection | ✅ Ready | `env.ts` superRefine | DATABASE_URL, JWT_SECRET, etc. |
| HTTPS enforcement (origins) | ✅ Ready | `env.ts` superRefine | Production only |
| Separate JWT access/refresh secrets | ✅ Ready | `env.ts` | Min 32 chars |
| `PHI_ENCRYPTION_KEY` required in prod | ❌ Not Ready | `security-crypto.ts` | Falls back to JWT_SECRET |
| `PAYMENT_WEBHOOK_SECRET` in schema | ❌ Not Ready | `financial.service.ts` | Dev default in code |
| `DOWNLOAD_TOKEN_SECRET` optional | ⚠️ Partial | `file-security.ts` | Falls back chain |

### Database & Repositories

| Item | Status | Verification | Notes |
|------|--------|--------------|-------|
| Prisma singleton | ✅ Ready | `config/prisma.ts` | Connection pooling |
| Transaction usage (auth, ingestion) | ✅ Ready | Multiple services | Atomic operations |
| Entity contracts + soft-delete | ✅ Ready | `database/foundation/` | Documented registry |
| Repository pattern (auth, org-domain) | ✅ Ready | Repository modules | Consistent in core paths |
| Repository validator enforcement | ⚠️ Partial | `repository-validator.ts` | Advisory warnings only |
| Org scoping in all repositories | ❌ Not Ready | `organization-domain/repository.ts` | Caller must enforce |
| Dependency injection container | ❌ Not Ready | — | Direct singleton imports |

### Audit, Logging & Monitoring

| Item | Status | Verification | Notes |
|------|--------|--------------|-------|
| Structured JSON logging (Pino) | ✅ Ready | `utils/logger.ts` | Request ID, duration |
| Audit log persistence | ✅ Ready | `AuditLog` model | Actor, IP, entity refs |
| Security event persistence | ✅ Ready | `SecurityEvent` model | CSRF, rate limit, login failures |
| Client audit action whitelist | ✅ Ready | `audit.routes.ts` | 3 allowed actions |
| Health/readiness endpoints | ✅ Ready | `health.routes.ts` | `/health`, `/ready` |
| Production readiness snapshot | ✅ Ready | `health.service.ts` | DB, AI, storage checks |
| Security monitoring summary | ✅ Ready | `security.routes.ts` | Failed logins, risk score |
| Prometheus-compatible metrics | ❌ Not Ready | `observability.ts` | In-process only |
| APM / exception monitoring SDK | ❌ Not Ready | `logger.ts` | DSN log-only |
| Audit log org scoping on read | ⚠️ Partial | `audit.routes.ts` | Global for ADMIN |
| Tamper-evident audit integrity | ❌ Not Ready | — | Convention only |

### Caching

| Item | Status | Verification | Notes |
|------|--------|--------------|-------|
| AI inference cache with audit | ✅ Ready | `inference-cache.ts` | Hit/miss logged |
| OCR file cache | ⚠️ Partial | `ocr-cache.service.ts` | Local FS, no encryption |
| Redis optional for readiness | ✅ Ready | `health.service.ts` | Skipped if unset |
| Distributed rate limit cache | ❌ Not Ready | `api-security.ts` | In-memory Maps |

---

## Required Environment Variables (Production)

### Mandatory (enforced by `env.ts` superRefine)

| Variable | Purpose | Min Length |
|----------|---------|------------|
| `DATABASE_URL` | PostgreSQL connection | Non-placeholder |
| `JWT_SECRET` | Access token signing | 32 chars |
| `JWT_REFRESH_SECRET` | Refresh token signing | 32 chars |
| `CLIENT_ORIGIN` | CORS whitelist | HTTPS URL |
| `EXPO_PUBLIC_API_URL` | API base URL | HTTPS URL |
| `NODE_ENV` | Must be `production` | — |

### Strongly Recommended (not yet enforced — add in Sprint 106)

| Variable | Purpose | Risk if Missing |
|----------|---------|-----------------|
| `PHI_ENCRYPTION_KEY` | PHI field encryption | Falls back to JWT_SECRET (R-11) |
| `PAYMENT_WEBHOOK_SECRET` | Payment webhook HMAC | Dev default used (R-17) |
| `DOWNLOAD_TOKEN_SECRET` | Signed download URLs | Falls back chain |
| `REQUEST_SIGNING_SECRET` | Optional HMAC signing | Falls back to JWT_SECRET |
| `EXCEPTION_MONITORING_DSN` | Error tracking | Log-only (R-20) |
| `REDIS_URL` | Distributed rate limits | In-memory only (R-10) |

### Optional (feature-dependent)

| Variable | Purpose |
|----------|---------|
| `AI_ENGINE_URL` | External AI provider |
| `OLLAMA_BASE_URL` | Local LLM |
| `APPLE_OAUTH_PRIVATE_KEY` | Apple Sign-In |
| `GOOGLE_OAUTH_CLIENT_ID` | Google OAuth |
| `MICROSOFT_OAUTH_CLIENT_ID` | Microsoft OAuth |
| S3 credentials | Object storage |

---

## Deployment Topology Requirements

| Topology | Ready? | Requirements |
|----------|--------|--------------|
| Single instance (pilot) | ⚠️ After P0 fix | Dedicated secrets; HTTPS termination |
| Multi-instance (HA) | ❌ Not Ready | Redis rate limits; shared session store |
| Multi-tenant SaaS | ❌ Not Ready | P0 + P1 isolation fixes; org-scoped audit |
| Air-gapped / on-prem | ⚠️ Partial | OAuth optional; Ollama local AI |

---

## Pre-Deploy Verification Commands

```bash
# Type safety
npm run typecheck

# Lint
npm run lint

# Build (includes prisma generate)
npm run build

# Full test suite
npm test

# Sprint 105 security audit markers
npx tsx scripts/sprint105-backend-security-audit.test.ts
npx tsx scripts/sprint105-backend-security-audit.integration.ts

# Existing security regression
npx tsx scripts/sprint55-rbac-security.test.ts
npx tsx scripts/sprint71-security-hardening.integration.ts
npx tsx scripts/auth-session-hardening.integration.ts
```

---

## Go/No-Go Decision Matrix

| Scenario | Decision | Conditions |
|----------|----------|------------|
| Bolt UI dev integration | **GO** | Use org-platform APIs; avoid legacy `/patients` for mutations |
| Staging deployment | **NO-GO** | Until R-01, R-02 fixed |
| Production pilot (single instance) | **NO-GO** | Until P0 + P1 (R-01 through R-09) fixed |
| Production scale-out | **NO-GO** | Until P0 + P1 + R-10 (Redis rate limits) |
| HIPAA-covered deployment | **NO-GO** | Until access control gaps (R-01–R-04) fixed |
| PCI payment processing | **NO-GO** | Until R-05 (Paymob webhook signature) |

---

## Sprint 106 Remediation Plan (Recommended)

| # | Task | Risk | Effort |
|---|------|------|--------|
| 1 | Add tenant checks to org-domain patient PATCH/DELETE | R-01 | S |
| 2 | Add document access check to OCR routes + service | R-02 | S |
| 3 | Scope AI `/history` to actor user/org | R-04 | S |
| 4 | Verify Paymob webhook signature | R-05 | S |
| 5 | Wire MFA check into login flow | R-06 | M |
| 6 | Require `PHI_ENCRYPTION_KEY` in production env | R-11 | S |
| 7 | Add cross-tenant IDOR integration tests | All P0/P1 | M |
| 8 | Remove hardcoded `DEVELOPER_OWNER_EMAIL` | R-07 | S |

---

## Monitoring Alerts (Production)

| Alert | Source | Threshold |
|-------|--------|-----------|
| Failed login spike | `SecurityEvent` | >10/min per IP |
| Refresh token reuse | `SecurityEvent` | Any occurrence |
| CSRF validation failure | `SecurityEvent` | Any occurrence |
| Rate limit exceeded | `SecurityEvent` | >50/min global |
| 5xx error rate | Pino logs | >1% over 5 min |
| DB connection failure | `/ready` endpoint | Non-200 |
| OCR processing failure | Notification center | Any ADMIN alert |
| Payment webhook failure | `FinancialAuditLog` | Any unsigned rejection |

---

## Summary

The ECG Insight backend has **mature security primitives** from Sprints 36, 55, 71, and 83. Production deployment is blocked by **2 critical IDOR vulnerabilities** (patient mutation tenant bypass, OCR document access) and **7 high-priority gaps** in isolation, payments, and MFA. Bolt UI integration can proceed in development using org-platform APIs while Sprint 106 addresses remediation.

**Next action:** Execute Sprint 106 remediation plan; re-run this checklist after fixes.

---

*Generated by Sprint 105 Enterprise Backend Security Audit.*
