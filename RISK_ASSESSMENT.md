# RISK_ASSESSMENT.md

# Sprint 105 — Enterprise Backend Risk Assessment

**Project:** ECG Insight Enterprise  
**Date:** 2026-07-09  
**Scope:** Backend security risks identified during Sprint 105 audit  
**Method:** Likelihood × Impact matrix with prioritized remediation

---

## Risk Matrix Legend

| Likelihood | Definition |
|------------|------------|
| Low | Requires insider knowledge or unlikely preconditions |
| Medium | Exploitable by authenticated user with valid credentials |
| High | Trivially exploitable or affects majority of requests |

| Impact | Definition |
|--------|------------|
| Critical | PHI breach, cross-tenant data modification, payment fraud |
| High | Unauthorized data read across tenants, privilege escalation |
| Medium | Information disclosure, denial of service, audit integrity |
| Low | Minor information leak, operational inconvenience |

| Priority | Action Timeline |
|----------|-----------------|
| P0 | Block production deploy — fix immediately |
| P1 | Fix before Bolt UI production rollout |
| P2 | Fix within next security sprint |
| P3 | Backlog — address when capacity allows |

---

## Prioritized Risk Register

### P0 — Critical (Production Blockers)

| ID | Risk | Likelihood | Impact | Affected Component | Evidence |
|----|------|------------|--------|-------------------|----------|
| **R-01** | Org-domain patient PATCH/DELETE without tenant check enables cross-tenant patient modification | Medium | Critical | `organization-domain/routes.ts` | GET enforces `TENANT_FORBIDDEN`; PATCH/DELETE do not |
| **R-02** | OCR process any document by ID (IDOR) — any doctor can extract PHI from any document | Medium | Critical | `ocr.routes.ts`, `document-intelligence.service.ts` | No `canAccessDocument` or org check before `extractAndIndexDocument` |

**R-01 Remediation:**
- Add `resolveScopedOrganizationId()` + org membership check to PATCH/DELETE patient routes.
- Reject `organizationId` reassignment unless actor has `organization.manage` permission.
- Add integration test: user A cannot PATCH/DELETE user B's org patient.

**R-02 Remediation:**
- Create `assertDocumentAccess(documentId, auth)` mirroring `canAccessPatient`.
- Call before OCR process/extract and inside `extractAndIndexDocument`.
- Add integration test: doctor in org A cannot OCR document in org B.

---

### P1 — High (Pre-Production Required)

| ID | Risk | Likelihood | Impact | Affected Component | Evidence |
|----|------|------------|--------|-------------------|----------|
| **R-03** | Dual patient APIs with inconsistent isolation model | High | High | `patients.routes.ts` vs `organization-domain/routes.ts` | Relationship-based vs org-scoped access |
| **R-04** | AI `/history` returns global analyses to any authenticated user | Medium | High | `ai/ai.routes.ts` | `where` clause has no user/org filter |
| **R-05** | Paymob webhook updates payment status without signature verification | Medium | High | `subscriptions.routes.ts` | Generic webhook route verifies; Paymob route does not |
| **R-06** | MFA not enforced at login despite enrollment infrastructure | Medium | High | `authentication.service.ts`, `security.routes.ts` | MFA endpoints exist; login bypasses MFA check |
| **R-07** | Hardcoded developer owner email in authorization middleware | Low | High | `subscriptions.routes.ts`, `copilot.routes.ts` | `DEVELOPER_OWNER_EMAIL` string comparison |
| **R-08** | Legacy patient list allows `organizationId` query without tenant enforcement | Medium | High | `patients.routes.ts` | Non-admin filter is relationship-based only |
| **R-09** | Org-domain patient update allows `organizationId` reassignment | Medium | High | `organization-domain/routes.ts` | `patientUpdateSchema` accepts `organizationId` |

**R-03 Remediation:** Deprecate legacy `/patients` API or unify on org membership + `requirePermission`. Document migration path for Bolt UI adapters.

**R-04 Remediation:** Scope `AIAnalysis` queries to `req.auth.id` and/or actor's organization.

**R-05 Remediation:** Apply `verifyWebhookSignature` to Paymob route; add `PAYMENT_WEBHOOK_SECRET` to `env.ts` production requirements.

**R-06 Remediation:** After password validation, check `userMFA.enabled` and require TOTP before issuing tokens.

---

### P2 — Medium (Next Security Sprint)

| ID | Risk | Likelihood | Impact | Affected Component | Evidence |
|----|------|------------|--------|-------------------|----------|
| **R-10** | In-memory rate limits not distributed across instances | Medium | Medium | `api-security.ts`, `ai-foundation/rate-limit` | `ipHits`/`userHits` Maps; reset on restart |
| **R-11** | PHI encryption falls back to `JWT_SECRET` | Low | High | `security-crypto.ts` | `PHI_ENCRYPTION_KEY ?? JWT_SECRET` |
| **R-12** | Department isolation modeled but not enforced | Medium | Medium | `prisma/schema.prisma`, query paths | `departmentId` rarely filtered |
| **R-13** | Audit read endpoint lacks mandatory org scoping | Medium | Medium | `audit.routes.ts` | Global `findMany` for ADMIN |
| **R-14** | Client-submitted audit events lack patient access verification | Medium | Medium | `audit.routes.ts` | Doctor POSTs arbitrary `patientId` |
| **R-15** | AI foundation inference lacks case/patient access check | Medium | Medium | `ai-foundation/foundation.routes.ts` | Body `caseId`/`patientId` not validated against actor |
| **R-16** | `requirePermission` not applied globally | High | Medium | Most clinical routes | Only org-platform routes use fine-grained permissions |
| **R-17** | `PAYMENT_WEBHOOK_SECRET` not in env schema | Medium | Medium | `financial.service.ts` | Hardcoded dev default |
| **R-18** | Compliance endpoints may lack patient access checks | Medium | Medium | `compliance/compliance.routes.ts` | Role-only protection |
| **R-19** | Developer role grants all enterprise permissions | Low | Medium | `permissions.ts` | `developer` slug has full permission set |
| **R-20** | Exception monitoring is log-only (no APM SDK) | Medium | Medium | `logger.ts` | DSN checked but only Pino output |

**R-10 Remediation:** Use Redis-backed rate limiting when `REDIS_URL` is set.

**R-11 Remediation:** Require `PHI_ENCRYPTION_KEY` in production `env.ts` superRefine; remove JWT fallback for PHI.

---

### P3 — Low (Backlog)

| ID | Risk | Likelihood | Impact | Affected Component | Evidence |
|----|------|------------|--------|-------------------|----------|
| **R-21** | Weak file malware scanning (eicar/script string only) | Medium | Medium | `file-security.ts` | No AV integration |
| **R-22** | Documents upload lacks magic-byte validation | Medium | Medium | `documents.routes.ts` | MIME filter only |
| **R-23** | Email enumeration via `/auth/email-availability` | Medium | Low | `auth.routes.ts` | Returns registration status |
| **R-24** | `/metrics` endpoint unauthenticated | Low | Low | `health.routes.ts` | Request counts exposed |
| **R-25** | OCR cache on local filesystem without encryption | Low | Medium | `ocr-cache.service.ts` | Shared tenant storage |
| **R-26** | Copilot accepts `application/octet-stream` MIME | Medium | Low | `copilot.routes.ts` | Bypasses strict MIME |
| **R-27** | Request signing optional when header absent | Low | Medium | `api-security.ts` | `validSignature` returns true |
| **R-28** | AI `/health` and `/models` unauthenticated | Low | Low | `ai.routes.ts` | Provider metadata exposed |
| **R-29** | No tamper-evident audit log integrity | Low | Medium | `AuditLog` model | Append-only by convention |
| **R-30** | Feature flags are frontend-only | Low | Low | `shared/config/feature-flags.ts` | No server-side gating |

---

## Risk Summary by Category

| Category | P0 | P1 | P2 | P3 | Total |
|----------|----|----|----|----|-------|
| Tenant Isolation | 1 | 3 | 1 | 0 | 5 |
| OCR / Documents | 1 | 0 | 0 | 2 | 3 |
| AI Endpoints | 0 | 1 | 1 | 1 | 3 |
| Authentication | 0 | 1 | 0 | 1 | 2 |
| Payments | 0 | 1 | 1 | 0 | 2 |
| API / Rate Limiting | 0 | 0 | 1 | 2 | 3 |
| Secrets / Env | 0 | 0 | 1 | 0 | 1 |
| Audit / Monitoring | 0 | 0 | 2 | 1 | 3 |
| Upload Security | 0 | 0 | 0 | 2 | 2 |
| RBAC / Permissions | 0 | 1 | 2 | 1 | 4 |
| Caching | 0 | 0 | 0 | 1 | 1 |
| **Total** | **2** | **7** | **9** | **11** | **29** |

---

## Residual Risk After P0/P1 Remediation

Assuming R-01 through R-09 are fully remediated and tested:

| Area | Residual Risk Level | Notes |
|------|---------------------|-------|
| Authentication | Low | MFA enforcement closes primary gap |
| Tenant Isolation | Low-Medium | Department isolation (R-12) remains |
| API Security | Medium | In-memory rate limits until Redis (R-10) |
| Upload/OCR | Low-Medium | Weak AV scanning (R-21) acceptable with magic-byte + access checks |
| Payments | Low | After Paymob signature (R-05) |
| Secrets | Low-Medium | After PHI key requirement (R-11) |
| Monitoring | Medium | APM integration (R-20) still needed |

**Target residual risk:** Acceptable for controlled production pilot with single-instance deployment and dedicated `PHI_ENCRYPTION_KEY`. Multi-instance production requires R-10 (Redis rate limits) before scale-out.

---

## Compliance Mapping

| Requirement | Risks | Status |
|-------------|-------|--------|
| HIPAA — Access Control (§164.312(a)) | R-01, R-02, R-03, R-04, R-12 | **Fail** until P0/P1 fixed |
| HIPAA — Audit Controls (§164.312(b)) | R-13, R-14, R-29 | Partial |
| HIPAA — Transmission Security (§164.312(e)) | Env HTTPS guards | Pass |
| HIPAA — Integrity (§164.312(c)) | R-21, R-22 | Partial |
| PCI-DSS — Webhook Authentication | R-05, R-17 | **Fail** for Paymob path |
| SOC 2 — Logical Access | R-06, R-16, R-19 | Partial |

---

## Remediation Ownership (Suggested)

| Priority | Owner | Target |
|----------|-------|--------|
| P0 | Backend Security | Sprint 106 (immediate) |
| P1 | Backend Security + Platform | Sprint 106–107 |
| P2 | Infrastructure + Backend | Sprint 107–108 |
| P3 | Backlog grooming | Ongoing |

---

*Generated by Sprint 105 Enterprise Backend Security Audit.*
