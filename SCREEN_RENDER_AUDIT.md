# Screen Render Audit

## Root Cause

The route pages were not blank because of page-level business logic. The route components returned JSX, the root `Stack` mounted, and the tab pages were registered correctly.

The root cause was the custom Expo Router tab shell embedding `<Tabs>` directly inside a manually composed sidebar layout without an explicit flex/height host for the navigator scene. On Expo web, this can leave the sidebar and shell visible while the routed tab scene has no reliable height allocation, producing a blank main content area even though navigation and URLs continue to work.

A secondary routing issue was found in the public alias routes. `/dashboard`, `/patients`, `/reports`, and `/notifications` redirected to route-group paths such as `/(tabs)/history`. Route groups are implementation details, not stable public URL targets. These aliases now redirect to public tab URLs so the content resolves through the tab shell.

## Files Audited

- `artifacts/ecg-insight/app/_layout.tsx`
- `artifacts/ecg-insight/app/(tabs)/_layout.tsx`
- `artifacts/ecg-insight/app/dashboard.tsx`
- `artifacts/ecg-insight/app/patients.tsx`
- `artifacts/ecg-insight/app/reports.tsx`
- `artifacts/ecg-insight/app/notifications.tsx`
- `artifacts/ecg-insight/app/(tabs)/history.tsx`
- `artifacts/ecg-insight/app/(tabs)/reports-dashboard.tsx`
- `artifacts/ecg-insight/app/(tabs)/notification-center.tsx`
- `artifacts/ecg-insight/components/bolt/BoltUI.tsx`
- `artifacts/ecg-insight/components/interaction/PremiumInteraction.tsx`
- `artifacts/ecg-insight/components/ErrorBoundary.tsx`
- `artifacts/ecg-insight/components/GlobalQueryStatus.tsx`

## Fixes Applied

- Added an explicit flex/height host around the Expo Router `<Tabs>` navigator.
- Added explicit full-height constraints to the tab shell root and main content area.
- Added explicit root flex styling to `SafeAreaProvider`.
- Preserved the sidebar shell and tab routing.
- Updated public alias routes:
  - `/dashboard` -> `/`
  - `/patients` -> `/history`
  - `/reports` -> `/reports-dashboard`
  - `/notifications` -> `/notification-center`
- Verified that `PageTransition` is fail-open with initial opacity `1`.
- Verified that full-screen overlays are limited to mobile drawer, modal, toast, or query banner states and do not permanently cover route scenes.
- Verified that dashboard, patients, reports, and notifications route components return visible JSX with loading, error, empty, and success states.

## Route Validation

Expo web was started with:

```bash
npx expo start --web --localhost --port 19014
```

The following routes returned `200 text/html`:

- `/dashboard`
- `/patients`
- `/reports`
- `/notifications`
- `/`
- `/history`
- `/reports-dashboard`
- `/notification-center`
- `/ecg-waveform`
- `/upload`
- `/population-analytics`
- `/settings`
- `/profile`

The router bundle returned:

- `/node_modules/expo-router/entry.bundle` -> `200 application/javascript; charset=UTF-8`

Expo output:

- Metro started successfully.
- Web bundle generated successfully.
- No Metro bundling failure was reported.

## Validation Commands

- `npx tsc -p artifacts/ecg-insight/tsconfig.json --noEmit`: Passed.
- `npm run build`: Passed.
- `npm run lint`: Passed.
- `npm run test`: Passed.
- Expo web route probes: Passed.

## Notes

This environment did not have a local headless browser binary or Playwright installed, so screenshot capture was not available. Validation used route-by-route Expo web probes, router bundle verification, compile/lint/test checks, and terminal output inspection.
