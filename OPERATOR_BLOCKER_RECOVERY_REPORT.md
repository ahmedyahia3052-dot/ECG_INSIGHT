# Operator Blocker Recovery Report

**Date:** 2026-07-08  
**Status:** **RESOLVED — operator path verified**  
**Sprint 51:** Not started

---

## Root Cause

Two compounding failures made the application unusable for the operator:

### 1. API server not running (primary)

The login screen probes `GET /liveness` on port **3002** via `useAuthOAuthProviders()` → `checkBackendHealth()`. When the API process is stopped, the probe fails and the UI shows **"Server unavailable"**.

Prior validation reports passed because Playwright **started managed servers** during tests, then **tore them down** on global teardown. The operator opening the browser afterward saw a dead backend.

Additionally, `npm run dev` only started the API script path inconsistently — **not both API and frontend** as a single operator command.

### 2. Fragile health probe (secondary — false unavailable)

Even with the API running, the health probe could fail when:

- The operator opened the app at `http://127.0.0.1:8081` while the baked URL targeted `http://localhost:3002` (loopback hostname mismatch on some Windows network stacks)
- The probe ran **once** with no retry after the API finished booting
- `AbortSignal.timeout()` was used without a portable fallback

### 3. ECG canvas regression (monitor unusable after login)

`drawMultiLeadMonitorCanvas()` had been replaced by Render Engine 2.0 delegation, producing a blank monitor canvas even after successful login.

---

## Fixes Applied

| Area | Change |
|------|--------|
| **Runtime API URL** | `resolveRuntimeApiBaseUrl()` aligns loopback hostname with the browser |
| **Health probe** | Tries `localhost`, `127.0.0.1`, and window hostname on port 3002; portable fetch timeout |
| **Health polling** | Login hook retries every 4s until backend responds; clears false unavailable state |
| **Login UX** | Shows "Connecting to server..." during probe; sign-in never blocked by OAuth-offline state |
| **Dev startup** | `npm run dev` / `npm run dev:stack` starts **both** API (:3002) and Expo Web (:8081) |
| **ECG canvas** | Restored Sprint 45 canvas paint path (RAF + `drawMultiLeadMonitorCanvas`) |
| **Proof test** | `tests/e2e/operator-login-proof.spec.ts` with screenshot capture |

---

## Files Changed

| File | Purpose |
|------|---------|
| `artifacts/ecg-insight/src/config/api.ts` | Runtime loopback URL + liveness candidate list |
| `artifacts/ecg-insight/services/api.ts` | Multi-URL health probe, axios runtime baseURL |
| `artifacts/ecg-insight/hooks/useAuthOAuthProviders.ts` | Polling reconnect, checking state |
| `artifacts/ecg-insight/app/login.tsx` | Connecting message, sign-in always enabled |
| `artifacts/ecg-insight/components/ecg/viewer/ecgMonitorCanvas.ts` | Restored canvas drawing |
| `artifacts/ecg-insight/components/ecg/viewer/EcgLiveMonitorView.tsx` | Restored RAF paint loop |
| `artifacts/ecg-insight/components/ecg/viewer/live-monitor-v2/ecgHospitalGrid.ts` | Restored grid API |
| `scripts/start-dev-stack.mjs` | One-command dev stack startup |
| `package.json` | `dev` → `dev:stack` |
| `tests/e2e/operator-login-proof.spec.ts` | Operator E2E proof |
| `validation-screenshots/operator-login-proof/*.png` | Screenshot evidence |

---

## Validation

### Configuration verified

| Check | Result |
|-------|--------|
| Backend `/liveness`, `/live`, `/ready`, `/health` | ✅ 200 |
| Frontend health probe targets port 3002 | ✅ |
| `EXPO_PUBLIC_API_URL` | `http://localhost:3002/api` |
| CORS from `127.0.0.1:8081` | ✅ |
| `POST /api/auth/login` | ✅ 200 + JWT |

### Operator E2E (fresh browser session)

**Command:** `PLAYWRIGHT_REUSE_SERVER=1 npx playwright test tests/e2e/operator-login-proof.spec.ts`

| Step | Result |
|------|--------|
| Fresh session → `/login?force=1` | ✅ |
| No "Server unavailable" banner | ✅ |
| UI sign-in (`doctor@ecginsight.com`) | ✅ |
| Dashboard visible | ✅ |
| ECG Workspace → Monitor mode | ✅ |
| Live monitor canvas visible | ✅ |

### Validation screenshots

| File | Proof |
|------|-------|
| `validation-screenshots/operator-login-proof/01-login-ready.png` | Login ready, no server error |
| `validation-screenshots/operator-login-proof/02-dashboard-after-login.png` | Successful UI login → dashboard |
| `validation-screenshots/operator-login-proof/03-ecg-workspace-live-monitor.png` | ECG Workspace live monitor with canvas |

---

## Operator Start Instructions

```bash
npm run dev
# or
npm run dev:stack
```

Then open: **http://localhost:8081/login**

Both processes stay detached. Re-run `npm run dev:stack` if either port stops responding.

---

## Commit & Tag

- **Commit:** Sprint50-OperatorRecovery (auth probe + dev stack + canvas restore)
- **Tag:** `Sprint50-OperatorAccepted`

Sprint 50 may be considered complete for operator use after this recovery.
