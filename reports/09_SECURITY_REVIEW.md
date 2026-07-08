# 09 — Security Review

**Audit:** Sprint 69 | Read-only  
**Scope:** Authentication, authorization, secrets, CORS, injection, data exposure

---

## Overall Security Posture: **B-** (Good foundations, notable gaps)

---

## Strengths

| Control | Implementation | Path |
|---------|----------------|------|
| JWT + DB session validation | `requireAuth` middleware checks `Session` table | `server/src/middleware/auth.ts` |
| Role-based access | `requireRole` on protected routes | `server/src/middleware/auth.ts` |
| CSRF protection | Cookie-authenticated mutating requests | `server/src/middleware/api-security.ts` |
| HMAC request signing | Optional API signature validation | `server/src/middleware/api-security.ts` |
| Input sanitization | Strips `__proto__`, `constructor`, `prototype` | `server/src/middleware/input-sanitizer.ts` |
| Production env validation | Rejects placeholder secrets, localhost DB | `server/src/config/env.ts` |
| Parameterized raw SQL | Tagged template literals only (3 usages) | `patients.routes.ts`, `health.service.ts` |
| Helmet | Security headers (CSP disabled in dev) | `server/src/app.ts` |
| Audit logging | `audit` module for clinical actions | `server/src/modules/audit/` |
| MFA / compliance models | `UserMFA`, `PatientConsent`, `SecurityEvent` | Prisma + security routes |

---

## High Severity Findings

| ID | Finding | Path | Risk | Recommendation |
|----|---------|------|------|----------------|
| SEC-01 | **Hardcoded seed password** `"Ahmed@2026"` with real-looking owner email | `prisma/seed.ts` | Credential leak if seed runs in staging/prod | Use env-based seed credentials; rotate |
| SEC-02 | **Legacy API open CORS** `app.use(cors())` — all origins | `artifacts/api-server/src/app.ts` | CSRF/data theft if deployed publicly | Restrict origins or decommission api-server |
| SEC-03 | **Dev JWT secrets in source** | `server/src/config/env.ts` | Secret exposure in repo history | Ensure production-only via env; document rotation |

---

## Medium Severity Findings

| ID | Finding | Path | Risk | Recommendation |
|----|---------|------|------|----------------|
| SEC-04 | E2E credentials in shared QA helper | `tests/e2e/utils/qa.ts` | Test creds in repo (expected but document) | Use env vars for CI secrets |
| SEC-05 | In-memory rate limit maps without eviction | `server/src/middleware/api-security.ts` | Memory exhaustion under attack | TTL eviction or Redis-backed limits |
| SEC-06 | Dual password hashers (argon2 + bcryptjs) | `server/src/utils/crypto.ts` | Inconsistent security policy | Standardize on argon2 |
| SEC-07 | Zod v3/v4 split | Root vs catalog packages | Schema validation bypass at boundaries | Unify Zod version |
| SEC-08 | Unbounded admin queries | `users.routes.ts`, `patients.routes.ts` | DoS via large responses | Pagination + max limits |
| SEC-09 | 171 Prisma models — broad attack surface | `prisma/schema.prisma` | Unused models may lack auth review | Audit model-level access |

---

## Low Severity Findings

| ID | Finding | Path | Notes |
|----|---------|------|-------|
| SEC-10 | Dev localhost CORS wildcard | `server/src/app.ts` | Expected for local dev |
| SEC-11 | Helmet CSP disabled non-prod | `server/src/app.ts` | Acceptable for dev |
| SEC-12 | Test passwords in integration scripts | `scripts/*.integration.ts` | Test fixtures only |
| SEC-13 | `uploads/` at repo root | `uploads/` | Ensure not web-served directly; auth on download |
| SEC-14 | SSE `while(true)` in LLM providers | `openai.provider.ts`, `ollama.provider.ts` | Ensure abort on disconnect |

---

## Authentication Flow Assessment

```
Login → JWT issued → Session row in DB → requireAuth validates token + session
Refresh → New token → Session updated
Logout → Session invalidated
```

**Verdict:** Sound pattern. Dual `Session` + `UserSession` models add complexity but not inherently insecure.

---

## Authorization Gaps (Review Required)

| Endpoint Area | Concern |
|---------------|---------|
| Sprint 68 interop (`/interop/fhir`, `/interop/hl7`) | Verify case-level auth on export |
| Super-admin routes | Confirm role gating on all mutations |
| Copilot routes (~1,082 lines) | Large surface — audit each endpoint |
| File uploads | Verify MIME validation, size limits, path traversal |

---

## Secrets Inventory

| Secret Type | Location | Status |
|-------------|----------|--------|
| Database URL | `.env` (not in repo) | OK if gitignored |
| JWT secrets | env + dev defaults in code | Review |
| Seed password | `prisma/seed.ts` | **Exposed** |
| OAuth keys | env templates | Review `.env.example` |
| API keys (LLM) | env | Blocked in prod by validation |

---

## Compliance-Relevant Modules

| Module | HIPAA-relevant | Status |
|--------|----------------|--------|
| `compliance/` | Yes | Wired |
| `audit/` | Yes | Wired |
| `security/` | Yes | MFA, password history |
| `backup/` | Yes | Backup services exist |
| Patient consent | `PatientConsent` model | Schema exists |

---

## Security Classification by Area

| Area | Grade | Classification |
|------|-------|----------------|
| Auth middleware | A- | **KEEP** |
| API security middleware | B | **KEEP** (fix memory maps) |
| CORS (main API) | B+ | **KEEP** |
| CORS (api-server) | F | **Deprecated** — fix or remove |
| Secrets management | C | **Review Required** |
| SQL injection resistance | A | **KEEP** |
| Input validation | B | **KEEP** |
| File upload security | B- | **Review Required** |
| Dependency supply chain | B | pnpm `minimumReleaseAge` positive |

---

## Immediate Actions (Post-Approval Only)

1. Rotate/remove hardcoded seed credentials.
2. Lock down or decommission `artifacts/api-server` CORS.
3. Add eviction to in-memory rate limit stores.
4. Audit interop export endpoints for case ownership checks.
5. Move E2E credentials to CI secrets.

---

*Read-only security review. No changes made.*
