# Authentication Connection Fix Report

**Date:** 2026-07-08  
**Status:** **RESOLVED**  
**Scope:** Fix blocking "Server unavailable" on login — no Sprint 51 work, no feature changes.

---

## Executive Summary

The login screen displayed **"Server unavailable"** because the **ECG Insight API was not listening on port 3002** when the frontend loaded. The frontend health probe failed with connection refused, which sets `serverUnavailable=true` before the user can sign in.

This is an **infrastructure / process availability issue**, not an authentication code regression. After starting both required dev services (API + Expo Web), the login page connects successfully, sign-in works, the dashboard loads, and the Live ECG Monitor is reachable.

**Both servers remain running** after validation (API `:3002`, frontend `:8081`).

---

## 1. Exact Reason for "Server unavailable"

### Trigger chain

```
LoginScreen
  └── useAuthOAuthProviders()
        └── checkBackendHealth()          [artifacts/ecg-insight/services/api.ts]
              └── GET http://localhost:3002/liveness
                    └── ECONNREFUSED (API not running)
                          └── dispatch({ type: "offline" })
                                └── serverUnavailable = true
                                      └── <AuthMessage message="Server unavailable" />
```

### Code references

| File | Behavior |
|------|----------|
| `artifacts/ecg-insight/hooks/useAuthOAuthProviders.ts` | Calls `checkBackendHealth()` on mount; sets `serverUnavailable: true` when `health.ok !== true` |
| `artifacts/ecg-insight/services/api.ts` | Probes `${API_URL}/liveness` (5 retries, 8s timeout each) |
| `artifacts/ecg-insight/app/login.tsx` | Renders "Server unavailable" when `serverUnavailable` is true |

### State at investigation time

| Service | Port | State before fix |
|---------|------|------------------|
| PostgreSQL | 5432 | ✅ LISTENING |
| ECG Insight API | 3002 | ❌ **Not listening** |
| Expo Web frontend | 8081 | ❌ **Not listening** |

**Root cause:** Required backend process was stopped (likely after prior Playwright global teardown or manual session end). Frontend alone cannot satisfy the liveness probe.

---

## 2. Frontend API Base URL — Verified ✅

| Source | Variable | Value |
|--------|----------|-------|
| Repo root `.env.development` | `EXPO_PUBLIC_API_URL` | `http://localhost:3002/api` |
| Repo root `.env.development` | `VITE_API_URL` | `http://localhost:3002/api` |
| `artifacts/ecg-insight/.env` | `EXPO_PUBLIC_API_URL` | `http://localhost:3002/api` |
| `scripts/start-frontend-dev.mjs` | `EXPO_PUBLIC_API_URL` | `http://localhost:3002/api` (default) |
| `artifacts/ecg-insight/src/config/api.ts` | Runtime fallback | `http://localhost:3002/api` when frontend is on localhost:8081 |

**Resolved API URL:** `http://localhost:3002/api`  
**Liveness probe URL:** `http://localhost:3002/liveness`

No misconfiguration found.

---

## 3. Vite Proxy Configuration — N/A ✅

The main ECG Insight frontend is **Expo Web (Metro bundler)** on port **8081**, not Vite.

- The frontend calls the API **directly** at `http://localhost:3002/api`.
- There is no Vite dev-server proxy in the primary app path.
- `VITE_API_URL` exists as an alias for tooling consistency; Expo runtime uses `EXPO_PUBLIC_API_URL`.

---

## 4. Backend Health Endpoints — Verified ✅

After starting the API (`npm run dev:api`):

| Endpoint | HTTP | Response |
|----------|------|----------|
| `GET /health` | 200 | `{ ok: true, status: "ok", ... }` |
| `GET /live` | 200 | `{ ok: true, service: "ecg-insight-api" }` |
| `GET /liveness` | 200 | `{ ok: true, service: "ecg-insight-api" }` |
| `GET /ready` | 200 | `{ ok: true, checks.database.ok: true }` |

Login health check uses **`/liveness`** specifically (requires `{ ok: true }` only — no database dependency).

---

## 5. Frontend Health Check Target — Verified ✅

```typescript
// artifacts/ecg-insight/services/api.ts
const livenessUrl = `${API_URL.replace(/\/api\/?$/, "")}/liveness`;
// → http://localhost:3002/liveness
```

Correct backend port: **3002** ✅

---

## 6. Environment Variables — Verified ✅

### Development (active)

**`.env.development`** (loaded by server via `dotenv` when `NODE_ENV=development`):

```
PORT=3002
CLIENT_ORIGIN=http://localhost:8081,http://localhost:3000
EXPO_PUBLIC_API_URL=http://localhost:3002/api
VITE_API_URL=http://localhost:3002/api
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ecg_insight
JWT_SECRET=<present>
JWT_REFRESH_SECRET=<present>
```

**`artifacts/ecg-insight/.env`** (Expo app-local):

```
EXPO_PUBLIC_API_URL=http://localhost:3002/api
VITE_API_URL=http://localhost:3002/api
```

**Note:** No repo-root `.env` file exists; server falls back to `.env.development` — this is sufficient for local dev.

### Production template (`.env.production`)

Uses same-origin pattern: `EXPO_PUBLIC_API_URL=https://ecg-insight.example.com/api`, `CLIENT_ORIGIN=https://ecg-insight.example.com`, `PORT=3001` behind reverse proxy. Not involved in local login failure.

---

## 7. CORS Configuration — Verified ✅

**Server:** `server/src/app.ts`

- `credentials: true`
- Development allows `localhost` / `127.0.0.1` origins via `isDevelopmentLocalhostOrigin()`
- Configured origins include `http://localhost:8081` from `CLIENT_ORIGIN`

**Live test:**

```
Origin: http://127.0.0.1:8081
GET http://127.0.0.1:3002/liveness
→ 200, Access-Control-Allow-Origin: http://127.0.0.1:8081
```

CORS is **not** blocking the login health probe.

---

## 8. Authentication API Endpoints — Verified ✅

| Endpoint | Result |
|----------|--------|
| `POST /api/auth/login` | **200** — returns `accessToken` for `doctor@ecginsight.com` |
| `GET /api/auth/oauth/providers` | **200** — optional; password login works without OAuth |

---

## 9. Services Started (Production Development Pattern)

Both services were started detached and **left running**:

```powershell
# Terminal A — API (port 3002)
$env:E2E_DETACHED="1"; npm run dev:api

# Terminal B — Expo Web (port 8081)
$env:E2E_DETACHED="1"; npm run dev:frontend
```

**Alternative (managed startup):**

```bash
node scripts/infrastructure/startup-health-manager.mjs --start-servers
```

### Current running state (post-validation)

| Service | Port | PID | Status |
|---------|------|-----|--------|
| ECG Insight API | 3002 | 11620 | ✅ LISTENING |
| Expo Web frontend | 8081 | 8816 | ✅ LISTENING |
| PostgreSQL | 5432 | 7560 | ✅ LISTENING |

**Open:** http://localhost:8081/login

### Important operational note

`npm run dev` starts **API only** (`dev:api`). Running frontend without API always produces "Server unavailable". **Both processes are required** for login.

---

## 10. Validation Results

Playwright ran with `PLAYWRIGHT_REUSE_SERVER=1` so tests did **not** terminate the dev servers on teardown.

| Validation | Result |
|------------|--------|
| Login page loads | ✅ PASS |
| **No "Server unavailable" message** | ✅ PASS (`production-smoke.spec.ts`) |
| Sign-in button visible | ✅ PASS |
| Successful sign-in + dashboard | ✅ PASS (`login-screen-stability.spec.ts` — 3 login/logout cycles) |
| Live ECG Monitor | ✅ PASS (`sprint50-real-hospital-monitor.spec.ts` — 6/6) |
| Servers remain running after tests | ✅ PASS (`PLAYWRIGHT_REUSE_SERVER=1`) |

### Playwright summary

| Spec | Result |
|------|--------|
| `production-smoke.spec.ts` @smoke | 1/1 PASS |
| `login-screen-stability.spec.ts` @smoke | 1/1 PASS |
| `sprint50-real-hospital-monitor.spec.ts` @sprint50 | 6/6 PASS |

---

## Code Changes

**None.** Configuration and connectivity were already correct. The fix was restoring the required runtime processes.

---

## Prevention Checklist

1. Start **both** `npm run dev:api` and `npm run dev:frontend` before opening the login page.
2. Quick health check: `curl http://127.0.0.1:3002/liveness` → `{ "ok": true }`
3. If login shows "Server unavailable", check port **3002 first** — not credentials, CORS, or Sprint 50 code.
4. After Playwright runs, use `PLAYWRIGHT_REUSE_SERVER=1` or restart API manually if global teardown stopped managed servers.
5. Use `node scripts/infrastructure/startup-health-manager.mjs --start-servers` for a single managed startup command.

---

## Conclusion

**Authentication connection restored.** The "Server unavailable" banner was caused by the API server not running on port 3002. With both dev servers active, the login page connects to the backend, sign-in succeeds, the dashboard loads, and the Live ECG Monitor is fully accessible. Sprint 51 was not started.
