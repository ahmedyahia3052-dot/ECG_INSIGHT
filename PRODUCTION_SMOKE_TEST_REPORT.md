# PRODUCTION_SMOKE_TEST_REPORT

**Sprint:** 92 — Production Integration  
**Date:** 2026-07-09  
**Environment:** Local development (production mode validation)  
**Backend:** `http://localhost:3002`  
**Frontend:** `http://localhost:8081`  
**Seeded account:** `doctor@ecginsight.com` / `password`

## Executive summary

| Area | Status |
|------|--------|
| Backend health | PASS |
| Frontend connectivity | PASS |
| API proxy / base URL | PASS (fixed) |
| JWT authentication | PASS |
| Database / Prisma / migrations | PASS |
| Uploads / storage engine | PASS |
| AI orchestration | PASS |
| Report engine | PASS |
| E2E navigation (doctor) | PASS |
| Lint / typecheck / build | PASS |
| Integration test suite | PASS (after Sprint 36 path fix) |

**Overall:** Application is fully operational end-to-end in local production-integration mode.

---

## 1. Backend health

| Endpoint | HTTP | Result |
|----------|------|--------|
| `/liveness` | 200 | `ok: true` |
| `/health` | 200 | `ok: true` |
| `/ready` | 200 | `ok: true`, database + storage + Ollama healthy |
| `/readiness` | 200 | `ok: true` |

## 2. Frontend connectivity

| Check | HTTP | Result |
|-------|------|--------|
| `http://localhost:8081/` | 200 | SPA served |
| `http://localhost:8081/login` | 200 | Login screen reachable |
| `http://localhost:8081/liveness` (proxy) | 200 | Metro proxy forwards to API |

## 3. API base URL / proxy fix

**Root cause of "Server unavailable":** When Expo baked `EXPO_PUBLIC_API_URL=http://127.0.0.1:3002/api`, the browser issued cross-origin requests from port 8081 to 3002, which failed in the browser (`net::ERR_FAILED`) even though direct curl to 3002 worked.

**Fixes applied:**

1. `artifacts/ecg-insight/src/config/api.ts` — auto-route local web dev through same-origin `/api` proxy when configured URL targets loopback port 3002.
2. `artifacts/ecg-insight/metro.config.cjs` — proxy `/api`, `/liveness`, `/health`, `/readiness` to backend.
3. `scripts/infrastructure/process-manager.mjs` — E2E frontend now starts with `EXPO_PUBLIC_API_URL=/api`, `EXPO_PUBLIC_USE_DEV_PROXY=true`, and `EXPO_DEV_API_PROXY`.
4. `.env.development` — `EXPO_PUBLIC_API_URL=/api`, `EXPO_PUBLIC_USE_DEV_PROXY=true`.

**Verification:**

- `POST http://localhost:8081/api/auth/login` → 200 with JWT
- Playwright login no longer shows "Server unavailable"

## 4. JWT authentication

| Check | Result |
|-------|--------|
| `POST /api/auth/login` (doctor) | 200, `accessToken` issued |
| `GET /api/auth/me` (Bearer) | 200, returns `doctor@ecginsight.com` |
| Protected `/api/cases` | 200 |
| Protected `/api/patients` | 200 |
| Protected `/api/reports` | 200 |

## 5. Database / Prisma / migrations

| Check | Result |
|-------|--------|
| `npx prisma migrate status` | 72 migrations, schema up to date |
| `/ready` database check | PostgreSQL healthy, 257 users |
| `npx prisma generate` | Client generated successfully |

## 6. Uploads / storage engine

| Check | Result |
|-------|--------|
| `/ready` storage check | `uploads/` writable, 1930 files |
| `GET /api/ecg-storage/health` | 200 |

## 7. AI orchestration endpoints

| Endpoint | Result |
|----------|--------|
| `GET /api/ai-orchestration-engine/health` | 200 |

## 8. Report engine

| Endpoint | Result |
|----------|--------|
| `GET /api/medical-report-engine/health` | 200 |

## 9. AI foundation

| Endpoint | Result |
|----------|--------|
| `GET /api/ai-foundation/health` | 200 |

## 10. E2E navigation (doctor)

Playwright: `tests/e2e/sprint92-production-integration.spec.ts` — **2/2 PASS**

| Page | Route | Result |
|------|-------|--------|
| Dashboard / Enterprise Dashboard | `/dashboard` | PASS |
| Upload ECG | `/upload-ecg` | PASS |
| ECG History (ECG Cases) | `/ecg-cases` | PASS |
| Profile | `/profile` | PASS |
| Settings | `/settings` | PASS |
| Protected route redirect | `/dashboard` unauthenticated → `/login` | PASS |
| Logout / re-login | — | PASS |

Additional smoke suites:

| Suite | Result |
|-------|--------|
| `production-smoke.spec.ts` | PASS |
| `login-screen-stability.spec.ts` | PASS |

## 11. Build pipeline

| Command | Result |
|---------|--------|
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `npm run build` | PASS |
| `npm test` | PASS |
| `npx tsx scripts/sprint92-production-smoke.ts` | 19/19 PASS |

## 12. Files changed (Sprint 92)

- `artifacts/ecg-insight/src/config/api.ts` — dev proxy auto-detection
- `artifacts/ecg-insight/metro.config.cjs` — API proxy middleware
- `scripts/infrastructure/process-manager.mjs` — E2E frontend env alignment
- `scripts/start-frontend-dev.mjs` — dev proxy defaults
- `.env.development` — relative `/api` URL
- `scripts/sprint36-security-hardening.integration.ts` — auth module path update
- `scripts/sprint92-production-smoke.ts` — automated smoke runner
- `tests/e2e/sprint92-production-integration.spec.ts` — doctor navigation E2E

## 13. Operator notes

- Start stack: `npm run dev` or `npm run dev:persistent`
- Backend only: `npm run dev:api` (port 3002)
- Frontend only: `npm run dev:frontend` (port 8081)
- For Playwright against running servers: `PLAYWRIGHT_REUSE_SERVER=1 npx playwright test ...`
- Swagger: `http://localhost:3002/api/docs`

---

*Generated by Sprint 92 production integration validation.*
