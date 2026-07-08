# Blank Screen Root Cause Report

## Investigation

Audited the runtime route stack and the following target pages:

- DashboardPage: `artifacts/ecg-insight/app/(tabs)/index.tsx`
- PatientsPage: `artifacts/ecg-insight/app/(tabs)/history.tsx`
- ReportsPage: `artifacts/ecg-insight/app/(tabs)/reports-dashboard.tsx`
- NotificationsPage: `artifacts/ecg-insight/app/(tabs)/notification-center.tsx`
- AnalyticsPage: `artifacts/ecg-insight/app/(tabs)/population-analytics.tsx`

Also audited:

- Root stack shell: `artifacts/ecg-insight/app/_layout.tsx`
- Premium tab shell: `artifacts/ecg-insight/app/(tabs)/_layout.tsx`
- Page transition wrapper: `artifacts/ecg-insight/components/interaction/PremiumInteraction.tsx`
- Route guards and remaining `return null` branches in route files.

## Root Causes Found

1. Several requested browser paths did not exist as explicit Expo Router routes:
   - `/dashboard`
   - `/patients`
   - `/reports`
   - `/notifications`

   The real tab routes existed under the Expo group, but direct URL entry could resolve outside the intended premium shell.

2. Shell-level guards rendered blank while waiting:
   - Root font loading returned `null`.
   - Tab auth loading returned `null`.
   - Case/admin/profile protected states could return `null`.

3. The tab shell used clipped main content and relied on default scene sizing. This could make a mounted route look like only the background rendered.

4. Shell overlays used absolute positioning for drawer/floating controls. They are now limited to visible drawer/menu states and the routed scene is no longer clipped by the main shell.

## Fixes Applied

- Added explicit route aliases:
  - `/dashboard` -> `/(tabs)`
  - `/patients` -> `/(tabs)/history`
  - `/reports` -> `/(tabs)/reports-dashboard`
  - `/notifications` -> `/(tabs)/notification-center`

- Added dev-only mount logging for:
  - DashboardPage
  - PatientsPage
  - ReportsPage
  - NotificationsPage
  - AnalyticsPage
  - Alias route components

- Replaced blank route/layout guards with visible UI:
  - Root font loading screen.
  - Tab auth loading screen.
  - Profile unavailable state.
  - Case loading state.
  - Admin loading/redirect states.
  - Owner license unauthorized state.

- Forced the tab scene to render with `flex: 1` and transparent background.

- Changed tab shell main content from clipped overflow to visible overflow so route content cannot be hidden by the shell container.

- Verified all audited route pages expose loading, error, empty, and success states through their existing premium UI primitives.

## Runtime Verification

- Started Expo web locally on `http://localhost:8091`.
- Probed the required route URLs:
  - `/dashboard`: HTTP 200
  - `/patients`: HTTP 200
  - `/reports`: HTTP 200
  - `/history`: HTTP 200
  - `/notifications`: HTTP 200
- Metro compiled the web bundle successfully with no route compilation errors.
- Expo reported browser logs are emitted in the browser console; no Metro runtime exceptions were emitted while probing the routes.
- `npm run build:frontend` exported the web bundle successfully.

## Validation

- `npm run build`: Passed.
- `npm run lint`: Passed.
- `npm run test`: Passed.
- `npm run build:frontend`: Passed.

