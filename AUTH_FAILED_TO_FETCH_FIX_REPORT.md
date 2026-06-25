# Auth Failed To Fetch Fix Report

## Root Cause

The ECG Insight frontend was using a centralized raw `fetch` wrapper against `EXPO_PUBLIC_API_URL`, which defaults to `http://localhost:3002/api` in development. When the backend was offline, unreachable, blocked by CORS, or misconfigured, browser/network failures surfaced to the login page as the raw message `Failed to fetch`.

The backend itself was available on the local machine during validation, and direct auth checks succeeded. The failure mode was caused by insufficient frontend network classification and no login-screen connectivity gate, not by invalid owner credentials.

## Audit Findings

- Runtime framework: Expo Router / React Native Web, not Vite.
- Frontend URL variable: `EXPO_PUBLIC_API_URL`.
- Vite-compatible alias added: `VITE_API_URL`.
- Backend development URL: `http://localhost:3002/api`.
- Backend health endpoint: `GET http://localhost:3002/health`.
- API module health endpoint: `GET http://localhost:3002/api/healthz`.
- Auth endpoints verified:
  - `POST /api/auth/login`
  - `POST /api/auth/refresh`
  - `POST /api/auth/logout`
- CORS already allowed Expo ports `8081`, `8082`, and `3000`; `5173` was added for Vite/dev tooling compatibility.

## Fixes Implemented

### Centralized API Client

- Added a single Axios-based API client in `artifacts/ecg-insight/services/api.ts`.
- Preserved the existing `apiRequest()` facade so all current services continue working.
- Added:
  - `baseURL` from environment.
  - `timeout: 15000`.
  - `withCredentials: true`.
  - Automatic bearer token injection.
  - Response handling.
  - Automatic refresh-token retry for protected `401` responses.
  - Centralized network/timeout/API error normalization.

### Friendly Error Handling

Raw browser/network messages are now converted to professional messages:

- `Backend service unavailable. Cannot connect to the ECG Insight server.`
- `Server timeout. Please try again in a moment.`
- API payload errors continue to show backend-provided clinical/auth messages.

### Environment Validation

- `EXPO_PUBLIC_API_URL` remains the primary app runtime variable.
- `VITE_API_URL` is accepted as a fallback alias for web tooling.
- `.env.example` and `.env.production.example` now document both variables.
- A local ignored `.env` was created for this workspace with development API settings.

### Backend Health Check

- Added `checkBackendHealth()` in the centralized API client.
- Login screen pings backend health on startup.
- If the backend is unavailable, login is disabled and the UI displays:
  - `Server offline`
  - `Retry Connection`
  - `Check Connection`

### Login Fail-Safe

- Login, OTP, and OAuth actions are blocked while the backend is offline or misconfigured.
- Premium toast notifications now explain connectivity failures.
- The login screen no longer exposes raw network exceptions to users.

### CORS

Backend CORS now explicitly allows:

- `http://localhost:8081`
- `http://localhost:8082`
- `http://localhost:5173`
- `http://localhost:3000`

And explicitly permits:

- credentials
- `GET`
- `POST`
- `PUT`
- `PATCH`
- `DELETE`
- `OPTIONS`
- `Authorization`
- `Content-Type`

## Validation

- `GET http://localhost:3002/health`: `200`.
- `GET http://localhost:3002/api/healthz`: `200`.
- Owner login using `ahmedyahia3052@gmail.com`: `200`.
- Refresh token after owner login: `200`.
- Invalid login response: `401` as expected.
- `npm run build`: Passed.
- `npm run lint`: Passed.
- `npm run test`: Passed.

## Auth Flow Coverage

Automated validation covered enterprise auth, owner security, super-admin workflows, clinical workflows, login, refresh-token behavior, protected endpoints, and logout-adjacent session flows through the existing integration suites.

