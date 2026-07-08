# Post-Sprint 50 Recovery Report

**Date:** 2026-07-08  
**Status:** ✅ RECOVERED  
**Scope:** Restore full application functionality after "Server unavailable" on login — no Sprint 51 work, no feature changes.

---

## Executive Summary

The login screen showed **"Server unavailable"** because the **authentication backend API was not running** on port **3002** when the frontend loaded. The frontend health probe (`checkBackendHealth` → `GET http://localhost:3002/liveness`) failed with connection refused, which sets `serverUnavailable=true` in `useAuthOAuthProviders`.

This was an **infrastructure / process state issue**, not a Sprint 50 code regression. After starting both required services, login, dashboard, and Live ECG Monitor (including Sprint 50 features) all pass validation.

---

## Root Cause

| Check | Before Recovery | After Recovery |
|-------|-----------------|----------------|
| PostgreSQL `:5432` | ✅ LISTENING | ✅ LISTENING |
| API `:3002` | ❌ Not listening | ✅ LISTENING |
| Frontend `:8081` | ❌ Not listening | ✅ LISTENING |
| `/liveness` | ❌ ECONNREFUSED | ✅ `{ ok: true }` |
| `/ready` (database) | ❌ unreachable | ✅ database healthy |
| Login UI | ❌ "Server unavailable" | ✅ Sign-in form ready |
| Auth `POST /api/auth/login` | ❌ unreachable | ✅ 200 + accessToken |

**Trigger:** Opening `http://localhost:8081/login` (or any frontend route) without the API server running.

---

## Diagnosis Details

### 1. Authentication backend availability

- Login screen uses `useAuthOAuthProviders()` → `checkBackendHealth()` in `artifacts/ecg-insight/services/api.ts`
- Health URL: `${API_URL}/liveness` → `http://localhost:3002/liveness`
- On failure, login renders `<AuthMessage message="Server unavailable" />` before credentials are entered

### 2. Frontend API base URL

| Variable | Value | Source |
|----------|-------|--------|
| `EXPO_PUBLIC_API_URL` | `http://localhost:3002/api` | `.env.development`, `scripts/start-frontend-dev.mjs` |
| `VITE_API_URL` | `http://localhost:3002/api` | `.env.development` |
| Runtime fallback | `http://localhost:3002/api` | `artifacts/ecg-insight/src/config/api.ts` (port 8081 localhost) |

**Result:** ✅ Correct — no misconfiguration.

### 3. Backend server startup

```
npm run prisma:generate && npx tsx server/src/index.ts
```

Startup checks passed:
- Environment: development, port 3002
- Database: `SELECT 1` OK
- LLM provider: Ollama connected (optional for auth)

### 4. Database connection

```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ecg_insight
```

`/ready` response: `checks.database.ok: true`, provider `postgresql`, 242 users.

### 5. Authentication endpoints

| Endpoint | Result |
|----------|--------|
| `GET /liveness` | 200 `{ ok: true }` |
| `GET /live` | 200 `{ ok: true }` |
| `GET /ready` | 200 database healthy |
| `POST /api/auth/login` | 200 + JWT for `doctor@ecginsight.com` |
| `GET /api/auth/oauth/providers` | Optional; password login works without it |

### 6. Vite proxy

**Not applicable.** The main ECG Insight frontend is **Expo Web (Metro)** on port **8081**, not Vite. The frontend calls the API **directly** at `http://localhost:3002/api`. CORS is configured via `CLIENT_ORIGIN=http://localhost:8081,http://localhost:3000` in `.env.development`.

### 7. Environment variables

Verified in `.env.development`:
- `PORT=3002`
- `CLIENT_ORIGIN=http://localhost:8081,http://localhost:3000`
- `EXPO_PUBLIC_API_URL=http://localhost:3002/api`
- `JWT_SECRET` / `JWT_REFRESH_SECRET` present
- `DATABASE_URL` points to local PostgreSQL

### 8. Localhost ports

| Service | Port | Script |
|---------|------|--------|
| ECG Insight API | 3002 | `npm run dev:api` |
| Expo Web frontend | 8081 | `npm run dev:frontend` |
| PostgreSQL | 5432 | External / Docker |
| Ollama (optional) | 11434 | External |

**Note:** `npm run dev` starts **API only** (`dev:api`). Both API and frontend must run for a working login experience.

---

## Recovery Actions Taken

1. Started API server on port 3002
2. Started Expo frontend on port 8081
3. Verified health, auth, and database endpoints
4. Ran build validation suite
5. Ran Playwright smoke + Sprint 50 regression

### Start all required services

**Option A — single command (recommended):**
```bash
node scripts/infrastructure/startup-health-manager.mjs --start-servers
```

**Option B — two terminals:**
```bash
# Terminal 1
npm run dev:api

# Terminal 2
npm run dev:frontend
```

Then open: **http://localhost:8081/login**

---

## Validation Results

### Build pipeline

| Command | Result |
|---------|--------|
| `npm run lint` | ✅ PASS |
| `npm run typecheck` | ✅ PASS |
| `npm run build` | ✅ PASS |

### Functional verification

| Check | Result |
|-------|--------|
| Login screen loads without "Server unavailable" | ✅ PASS |
| `POST /api/auth/login` | ✅ PASS |
| Dashboard loads after login | ✅ PASS (login-screen-stability @smoke) |
| Live ECG Monitor canvas | ✅ PASS (Sprint 50 spec) |
| Sprint 50 pro HUD + audio controls | ✅ PASS |
| Sprint 50 layouts (6×2, dual, quad, focus, comparison) | ✅ PASS |
| Sprint 45/49 regression smoke | ✅ PASS |

### Playwright

| Spec | Result |
|------|--------|
| `production-smoke.spec.ts` @smoke | 1/1 PASS |
| `login-screen-stability.spec.ts` @smoke | 1/1 PASS |
| `sprint50-real-hospital-monitor.spec.ts` @sprint50 | 6/6 PASS |

---

## Sprint 50 Integrity

No Sprint 50 code was modified during recovery. Verified intact:
- `live-monitor-audio/` R-wave synced audio engine
- `live-monitor-pro/` interval HUD
- Hospital layout modes, lead focus, comparison presets, rhythm strip windows
- `sprint50-pro-hud`, `sprint50-audio-controls`, `sprint50-monitor-experience-ready` testIDs

---

## Prevention

1. Always start **both** API (3002) and frontend (8081) before testing login
2. Use `node scripts/infrastructure/startup-health-manager.mjs --start-servers` for managed startup
3. Confirm API health: `curl http://127.0.0.1:3002/liveness` → `{ "ok": true }`
4. If login shows "Server unavailable", check port 3002 first — not credentials or Sprint 50 code

---

## Conclusion

**Application fully restored.** The "Server unavailable" message was caused by the API server not running. All authentication, dashboard, and Live ECG Monitor (Sprint 50) functionality verified with zero code regressions.
