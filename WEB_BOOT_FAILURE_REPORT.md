# Web Boot Failure Report

## Symptom

The browser failed to execute:

`/node_modules/expo-router/entry.bundle`

because Metro returned:

- `500 Internal Server Error`
- `Content-Type: application/json`

The browser then refused to execute the response as JavaScript.

## First Compilation Error Captured

The first Metro error body was:

`UnableToResolveError`

Metro attempted to resolve:

`../../src/private/devsupport/rndevtools/ReactDevToolsSettingsManager`

from:

`node_modules/react-native/Libraries/Core/setUpReactDevTools.js`

That happened only for the bare bundle URL:

`/node_modules/expo-router/entry.bundle`

The generated Expo HTML already includes the correct web query string:

`/node_modules/expo-router/entry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&transform.reactCompiler=true&unstable_transformProfile=hermes-stable`

But a direct/stale browser request to the bare URL made Metro resolve the bundle without `platform=web`, causing it to follow native React Native internals and fail on a missing native devtools module.

## Files Inspected

- `artifacts/ecg-insight/app/_layout.tsx`
- `artifacts/ecg-insight/app/(auth)/login.tsx`
- `artifacts/ecg-insight/app/(tabs)/_layout.tsx`
- `artifacts/ecg-insight/components/interaction/PremiumInteraction.tsx`
- `artifacts/ecg-insight/components/bolt/EnterpriseSidebar.tsx`
- Expo Router generated HTML
- Metro bundle endpoint
- Expo app configuration

No invalid route wrapper, provider, sidebar, PageTransition, or login-page import was the source of the 500 response.

## Fix

Added:

`artifacts/ecg-insight/metro.config.cjs`

The Metro server now rewrites the exact bare bundle request:

`/node_modules/expo-router/entry.bundle`

to the correct web bundle request with:

- `platform=web`
- `routerRoot=app`
- React Compiler transform settings
- Hermes web transform settings

This prevents stale or bare browser requests from receiving Metro JSON error payloads and restores JavaScript MIME output.

## Verification

`npx expo start --web` was attempted first. Expo detected port `8081` as occupied and exited because the shell is non-interactive. The same command was then verified on Expo's alternate web port behavior using `8082`.

Runtime checks:

- `GET /node_modules/expo-router/entry.bundle`: `200`, `application/javascript`
- `GET /login`: `200`, `text/html`
- `GET /dashboard`: `200`, `text/html`
- Metro output: `Web Bundled ... node_modules\expo-router\entry.js`

Build checks:

- `npm run build`: Passed
- `npm run lint`: Passed
- `npm run test`: Passed
- `npm run build:frontend`: Passed

