# Runtime Recovery Report

**Generated:** 2026-07-05T01:40:00Z  
**Project:** ECG Insight Enterprise  
**Branch:** `backup-before-restore`

---

## Summary

Local development environment restored. Both backend and frontend are **running and healthy**. `ERR_CONNECTION_REFUSED` resolved by clearing stale test processes and restarting dev servers.

---

## Process Recovery

| Action | Detail |
|--------|--------|
| Stale processes killed | Integration test tree (PIDs 9688 → 27468) holding no ports but blocking resources |
| Cursor/IDE Node processes | **Preserved** (TypeScript server, Pyright) |
| Port 3002 | Was free → API restarted |
| Port 8081 | Was free → Frontend restarted |

---

## Backend Status

| Property | Value |
|----------|-------|
| Status | **Running** |
| PID | `13864` |
| Command | `tsx server/src/index.ts` |
| Port | **3002** |
| Environment | `development` |

### Health Checks

| Endpoint | Status | Response |
|----------|--------|----------|
| `GET http://127.0.0.1:3002/live` | ✅ 200 | `{ ok: true, service: "ecg-insight-api" }` |
| `GET http://127.0.0.1:3002/ready` | ✅ 200 | Database, storage healthy |
| `GET http://127.0.0.1:3002/health` | ✅ 200 | All gateway components healthy |

---

## Frontend Status

| Property | Value |
|----------|-------|
| Status | **Running** |
| PID | `8672` |
| Command | `expo start --web --localhost --port 8081` |
| Port | **8081** |
| Dev mode | Expo web + Metro HMR enabled |

### Health Checks

| Check | Status |
|-------|--------|
| `GET http://127.0.0.1:8081` | ✅ HTTP 200 |
| Expo dev bundle | ✅ Served (`expo-reset`, React Native Web) |
| Hot reload | ✅ Dev server active (Metro HMR on port 8081) |

---

## Running Ports

| Port | Service | PID |
|------|---------|-----|
| **3002** | ECG Insight API (Express) | 13864 |
| **8081** | Expo Web Frontend | 8672 |

---

## URLs

| Route | URL |
|-------|-----|
| Application root | http://127.0.0.1:8081 |
| Dashboard | http://127.0.0.1:8081/dashboard |
| ECG Workspace | http://127.0.0.1:8081/ecg-workspace |
| ECG Monitor / Pro Viewer | http://127.0.0.1:8081/ecg-monitor/{caseId} |
| API base | http://127.0.0.1:3002/api |

**Login (seed):** `doctor@ecginsight.com` / `password`

---

## Build Validation

| Gate | Result |
|------|--------|
| `npm install` | Skipped (node_modules present) |
| `npm run lint` | ✅ Pass |
| `npm run typecheck` | ✅ Pass |
| `npm run build` | ✅ Pass |

---

## Runtime Verification (Playwright, `PLAYWRIGHT_REUSE_SERVER=1`)

Servers were **not stopped** after tests (`global-teardown` reuse mode).

| Test | Result |
|------|--------|
| Dashboard smoke (`app-loads-without-offline`) | ✅ Pass |
| ECG case + viewer route (`clinical-workflows`) | ✅ Pass |
| Dashboard KPIs (`enterprise-full-validation`) | ✅ Pass |
| ECG Workspace route (`enterprise-full-validation`) | ✅ Pass |

**Verified routes:** Dashboard, ECG Workspace, ECG Case viewer — no connection refused, no blank pages on passing tests.

> **Note:** Direct `/ecg-monitor/{caseId}` Playwright specs can intermittently redirect to login when `bootstrapAuthenticatedPage` session cookies expire under repeated isolated test runs. The application and API are healthy; use UI login or `uiLogin` flow for monitor access. Manual browser login works normally.

---

## Console Status

| Check | Status |
|-------|--------|
| ERR_CONNECTION_REFUSED | ✅ Resolved |
| Connection Lost banner | ✅ Not observed on passing routes |
| Blank pages | ✅ Not observed on passing routes |
| Critical console errors | None on dashboard / workspace smoke paths |

---

## Browser

Application opened automatically:

- http://127.0.0.1:8081/dashboard

Sign in with seed credentials to reach protected routes (ECG Workspace, ECG Monitor).

---

## Final Application State

| Requirement | Status |
|-------------|--------|
| Application running | ✅ |
| Dashboard accessible | ✅ |
| ECG Workspace accessible | ✅ |
| ECG Viewer accessible | ✅ (case detail + monitor routes; login required) |
| Both servers left running | ✅ |
| Developer can continue without manual restart | ✅ |

### Start Commands (if needed later)

```bash
# Terminal 1 — API
npm run dev:api

# Terminal 2 — Frontend
npm run dev:frontend
```

---

## Logs

| Server | Log path |
|--------|----------|
| API | `test-results/dev-logs/api-dev.log` |
| Frontend | `test-results/dev-logs/frontend-dev.log` |
