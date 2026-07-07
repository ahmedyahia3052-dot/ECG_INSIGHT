# Authentication Test Infrastructure Report — Sprint 46.1

## Goals

- Fresh login per test flow
- Fresh logout with session cleanup
- Token validation before UI navigation
- Retry-safe authentication without shared state
- No shared cookies, localStorage, or IndexedDB between tests

## Module: `tests/e2e/utils/auth-infrastructure.ts`

| Function | Behavior |
|----------|----------|
| `createFreshApiContext` | New `APIRequestContext` with JSON accept header |
| `freshApiLogin` | Login via API; returns isolated context + `ApiSession` |
| `destroyApiContext` | Disposes API context after use |
| `validateToken` | `GET /auth/me` with bearer token — returns `response.ok()` |
| `freshLogout` | UI logout button → `/login` → `clearAuthState` → storage wipe |
| `freshAuthenticatedPage` | API login → token validation → navigate `/dashboard` → dashboard visible |
| `withFreshApiSession` | Scoped API session with guaranteed `destroyApiContext` in `finally` |
| `resetWorkspaceState` | Delegates to `destroyBrowserSession` |

## Module: `tests/e2e/utils/session-cleanup.ts`

| Function | Behavior |
|----------|----------|
| `resetBrowserStorage` | Clears localStorage, sessionStorage; deletes all IndexedDB databases |
| `destroyBrowserSession` | Storage wipe → `clearCookies` → `page.close()` |

## Fixture Integration (`tests/e2e/test.ts`)

```typescript
page: async ({ page, context, request }, use, testInfo) => {
  await assertPlatformReady(request);
  await context.clearCookies();
  await resetBrowserStorage(page);
  const network = createNetworkMonitor(page);
  await use(page);
  network.assertStable(testInfo);
  await destroyBrowserSession(page, context);
}
```

`isolatedRequest` fixture provides per-test disposable API context.

## qa.ts Improvements

- `clearAuthState` now calls `resetBrowserStorage` (IndexedDB included)
- `uiLogin` retry uses `expect.poll` for login screen visibility instead of `waitForTimeout`
- `gotoLogin` retry uses poll-based backoff

## Session Leakage Vectors Addressed

| Vector | Mitigation |
|--------|------------|
| Shared `storageState` file | Removed from `playwright.config.ts` (`storageState: undefined`) |
| Cookie jar | `context.clearCookies()` before and after each test |
| localStorage / sessionStorage | `resetBrowserStorage` before and after |
| IndexedDB | Enumerated and deleted per test |
| API request context | `isolatedRequest` fixture + `withFreshApiSession` helper |
| Parallel workers | `workers: 1` + sequential suite processes |

## Retry Safety

Authentication retries in `uiLogin` and `gotoLogin` now:
1. Reset auth state explicitly
2. Poll for stable UI (login screen visible)
3. Re-attempt without carrying forward stale tokens

Token validation (`validateToken`) ensures API session is live before proceeding to dashboard navigation in `freshAuthenticatedPage`.
