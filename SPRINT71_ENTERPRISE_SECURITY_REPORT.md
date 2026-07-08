# Sprint 71 — Enterprise Security Report

**Scope:** Backend-only security audit and hardening (zero frontend / Workspace / Viewer / Live Monitor changes)  
**Date:** 2026-07-08  
**Branch:** `backup-before-restore`

---

## Executive Summary

Sprint 71 performed a full backend security review across authentication, authorization, uploads, secrets, realtime, audit logging, and HTTP hardening. Critical IDOR and token-leakage gaps were remediated. Remaining items are documented as prioritized recommendations for production deployment.

### Hardening Delivered

| Area | Before | After |
|------|--------|-------|
| ECG file download | Auth only; any authenticated user could download by `storedName` | Case/patient/uploader access enforced |
| Signed download URL | Arbitrary path, no ownership check | Resolved via DB file + access check |
| Auth token responses | `resetToken`, OTP, verification tokens returned in API | Redacted in production |
| Auth endpoints | Global rate limit only | Dedicated auth rate limiter (30 / 15 min) |
| Upload validation | MIME + extension only | Magic-byte content validation |
| Case upload | No case ownership check | `canAccessCase` enforced |
| Client audit POST | Arbitrary action string cast to enum | Allowlist: `PATIENT_VIEWED`, `REPORT_VIEWED`, `REPORT_DOWNLOADED` |
| Realtime rooms | Arbitrary `join`, `join:user`, `join:role` | Restricted to authenticated user's own rooms |
| Socket.io CORS | `origin: true` (reflect any origin) | Same origin policy as REST API |
| Crypto secrets | Single `JWT_SECRET` for JWT, PHI, HMAC, downloads | Separate optional env keys with safe fallback |
| Impersonation | No audit trail | `IMPERSONATION_STARTED` audit log |
| Helmet | Baseline | Added `frameguard`, `referrerPolicy` |

---

## Authentication

**Status: Strong foundation with Sprint 71 improvements**

- JWT access tokens validated via `verifyAccessToken`; sessions checked for revocation/expiry.
- Refresh tokens stored hashed; reuse detection present in `auth.service.ts`.
- Password hashing uses bcrypt; password history and lockout after failed attempts implemented.
- **Hardened:** Auth routes now use dedicated rate limiting (`auth-rate-limit.ts`).
- **Hardened:** Sensitive tokens (`resetToken`, `emailVerificationToken`, `otp`) redacted from production responses via `auth-response-safety.ts`.

**Remaining recommendations**

1. Enforce MFA at login for privileged roles in production.
2. Add CAPTCHA or progressive delay on repeated failed logins beyond IP rate limits.
3. Rotate refresh tokens on every use (currently session-based; acceptable but document policy).

---

## Authorization & RBAC

**Status: Partial — enterprise permissions coexist with legacy role checks**

- `requireRole` / `requireAuth` middleware used consistently on protected routes.
- Resource helpers in `resource-access.ts` (`canAccessCase`, `canAccessPatient`) used across clinical modules.
- **Hardened:** Upload download and signed-url paths now use resource access checks.

**Remaining recommendations**

1. Migrate all routes to unified enterprise permission matrix (Sprint 55 RBAC).
2. Add integration tests asserting 403 for cross-tenant file/case access.
3. Audit modules still using role-only checks without organization scoping.

---

## JWT Validation & Refresh Tokens

**Status: Good**

- Separate `JWT_SECRET` and `JWT_REFRESH_SECRET` (min 32 chars; production placeholder validation).
- Session invalidation on logout / logout-all.
- Refresh reuse triggers security event.

**Recommendations:** Bind refresh tokens to device fingerprint optionally; shorten access token TTL for high-risk roles.

---

## Password Hashing

**Status: Good** — bcrypt with password history and reuse prevention.

---

## Secret Management & Environment Variables

**Status: Improved in Sprint 71**

New optional environment variables (backward compatible):

| Variable | Purpose |
|----------|---------|
| `PHI_ENCRYPTION_KEY` | AES-GCM field encryption (`security-crypto.ts`) |
| `REQUEST_SIGNING_SECRET` | HMAC request signatures (`api-security.ts`) |
| `DOWNLOAD_TOKEN_SECRET` | Signed download tokens (`file-security.ts`) |
| `AUTH_RATE_LIMIT_MAX` | Auth endpoint rate limit (default 30) |
| `AUTH_RATE_LIMIT_WINDOW_MS` | Auth rate limit window (default 15 min) |

Production validation enforces HTTPS origins, non-placeholder secrets for JWT/DB.

**Recommendations**

1. **Required for production:** Set all three dedicated secrets distinct from `JWT_SECRET`.
2. Store secrets in a vault (AWS Secrets Manager, Azure Key Vault, HashiCorp Vault).
3. Document key rotation runbook using existing `KeyRotationEvent` model.

---

## DTO & Request Validation

**Status: Good** — Zod schemas on auth, security, audit (post-hardening), and most modules via `validateBody`.

**Recommendations:** Audit remaining routes for raw `req.body` usage without schema validation.

---

## Upload Validation

**Status: Hardened**

- MIME allowlist, extension allowlist, 20 MB limit (unchanged).
- **New:** Magic-byte validation in `upload-security.ts` for PDF/PNG/JPEG; binary null-byte rejection for text types.
- **New:** Case access check before accepting upload.

---

## SQL Injection Protection

**Status: Good** — Prisma parameterized queries throughout; no raw string concatenation in reviewed paths.

---

## XSS Protection

**Status: Baseline**

- JSON API responses; `inputSanitizer` middleware present.
- Error handler does not expose stack traces to clients.
- Helmet headers enabled.

**Recommendations:** Ensure clinical free-text fields sanitized on render (frontend concern; out of scope).

---

## CSRF Considerations

**Status: Good for cookie-auth flows**

- Double-submit cookie pattern for mutating requests when refresh cookie present.
- Auth endpoints exempt (stateless token bootstrap).

---

## CORS Configuration

**Status: Good for REST**

- Explicit allowlist from `CLIENT_ORIGIN`; dev localhost extras.
- Rejected origins logged.
- **Hardened:** Socket.io aligned with same origin policy.

---

## Helmet & Security Headers

**Status: Improved**

- HSTS in production.
- **New:** `frameguard: deny`, `referrerPolicy: strict-origin-when-cross-origin`.
- CSP disabled in development for local tooling.

---

## Rate Limiting & Brute-Force Protection

**Status: Improved**

- Global rate limit: 600 req / 15 min (configurable).
- Production per-IP and per-user throttles in `api-security.ts`.
- Account lockout after failed logins.
- **New:** Auth-specific rate limiter on `/api/auth/*`.

**Recommendations:** Use Redis-backed rate limiting for multi-instance deployments (current stores are in-memory).

---

## Audit Logging

**Status: Improved**

- Server-side audit on uploads, impersonation, security events.
- **Hardened:** Client `POST /api/audit` restricted to view/download actions only; arbitrary action injection blocked.

**Recommendations:** Require `patientId`/`caseId` on client audit entries and validate access before write.

---

## Permission Boundaries & API Exposure

**Reviewed:** Health/live/ready endpoints intentionally public. Admin security routes require `ADMIN`. Module router mounts reviewed.

**Critical fixes applied:** Upload IDOR, signed-url authorization, audit action allowlist.

---

## Sensitive Data Leakage & Error Responses

**Status: Good**

- Central error handler returns `{ code, message }` without stack traces.
- **Hardened:** Auth tokens no longer leaked in production API responses.

**Recommendations:** Scrub PII from structured logs; review `log()` call sites for email/token leakage.

---

## Prisma Security

**Status: Good** — ORM prevents SQL injection; cascading deletes configured on clinical relations.

**Recommendations:** Enable row-level security or organization filters at query layer for multi-tenant isolation.

---

## Dependency Vulnerabilities

Run `npm audit` as part of CI. Address high/critical findings via `npm audit fix` or targeted upgrades. Document any accepted risks.

---

## Security Recommendations (Prioritized)

### P0 — Before production launch

1. Set `PHI_ENCRYPTION_KEY`, `REQUEST_SIGNING_SECRET`, `DOWNLOAD_TOKEN_SECRET` to unique values.
2. Enable Redis-backed rate limiting for horizontal scale.
3. Enforce MFA for ADMIN / SUPER_ADMIN / OWNER roles.

### P1 — Next sprint

1. Unified RBAC enforcement on all clinical routes.
2. Organization-scoped queries on all patient/case reads.
3. Client audit POST: validate resource access for `patientId` / `caseId`.
4. Automated dependency scanning in CI (`npm audit --audit-level=high`).

### P2 — Ongoing

1. Penetration test focused on file download and interoperability endpoints.
2. SIEM integration for `SecurityEvent` and failed login streams.
3. Periodic secret rotation with `KeyRotationEvent` audit trail.

---

## Validation

| Check | Command |
|-------|---------|
| Lint | `npm run lint` |
| Server typecheck | `npx tsc -p server/tsconfig.json --noEmit` |
| Security audit | `npm audit` |
| Unit tests | `npx tsx scripts/sprint71-security-hardening.test.ts` |
| Integration markers | `npx tsx scripts/sprint71-security-hardening.integration.ts` |
| Full suite | `npm run test` |

---

## Files Changed (Backend Security Only)

- `server/src/middleware/auth-rate-limit.ts` *(new)*
- `server/src/utils/auth-response-safety.ts` *(new)*
- `server/src/utils/upload-security.ts` *(new)*
- `server/src/utils/upload-access.ts` *(new)*
- `server/src/config/env.ts`
- `server/src/app.ts`
- `server/src/auth/auth.routes.ts`
- `server/src/uploads/uploads.routes.ts`
- `server/src/modules/audit/audit.routes.ts`
- `server/src/modules/security/security.routes.ts`
- `server/src/realtime/realtime.service.ts`
- `server/src/users/users.routes.ts`
- `server/src/utils/security-crypto.ts`
- `server/src/utils/file-security.ts`
- `server/src/middleware/api-security.ts`
- `scripts/sprint71-security-hardening.test.ts` *(new)*
- `scripts/sprint71-security-hardening.integration.ts` *(new)*
- `scripts/integration/pipeline.mjs`
- `SPRINT71_ENTERPRISE_SECURITY_REPORT.md` *(new)*
- `CHANGELOG.md`

---

## Hardening Summary

Sprint 71 closes three critical backend gaps (upload IDOR, signed-url authorization, auth token leakage), strengthens upload integrity validation, tightens realtime and audit boundaries, separates cryptographic key usage, and adds auth-specific rate limiting — all without any frontend or clinical UI changes.
