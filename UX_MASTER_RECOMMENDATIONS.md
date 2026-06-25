# UX Master Recommendations

## UI Improvements

- Establish one canonical clinical card system for dashboards, patients, reports, alerts, and admin pages.
- Keep the current premium sidebar as the stable navigation foundation.
- Reduce duplicate visual primitives by consolidating metric cards, skeletons, badges, and action buttons.
- Use dense command-center layouts for clinical users: high information density, compact hero panels, and no full-screen empty decoration.
- Standardize workflow page headers with: title, clinical context, primary action, and live status badge.

## Mobile Improvements

- Keep mobile drawer behavior unchanged, but add automated width checks for phone, tablet, and desktop breakpoints.
- Prefer cards for mobile workflow lists and tables for desktop.
- Keep primary actions within the first scroll viewport on mobile.
- Ensure bottom tab/floating action layers do not cover form save buttons.
- Add mobile route smoke tests for all tab pages and aliases.

## Animation Improvements

- Keep route transitions fail-open: content must start visible.
- Use reduced-motion settings for all long-running waveform, shimmer, and background animations.
- Avoid full-screen opacity wrappers around routed content.
- Scope high-frequency animations to small elements like ECG traces and active indicators.
- Split animation primitives from workflow components to reduce regression risk.

## Accessibility Improvements

- Maintain minimum 44-48px touch targets for every action.
- Add explicit accessibility labels for workflow actions that have repeated names, such as `Open`, `Edit`, and `Archive`.
- Keep high-contrast text in medical workflows; never rely on transparency alone for readability.
- Add keyboard traversal checks for login, dashboard quick actions, patient forms, and report editor.
- Use clear empty and error states that communicate clinical workflow impact.

## Performance Improvements

- Move large reusable components out of route files after stabilization.
- Memoize expensive list transformations when lists grow beyond current page sizes.
- Avoid rendering hidden overlay panels unless open.
- Add route-level web bundle smoke checks in CI for `/node_modules/expo-router/entry.bundle`.
- Keep React Query page sizes bounded and paginate all enterprise tables.

## Medical Workflow Improvements

- Add patient-detail routes with ECG history, reports, risk profile, medications, allergies, and notes.
- Connect the dashboard live ECG monitor to real streaming when backend streaming is ready.
- Add report status workflows with clear sign/finalize permissions and locked signed-state UI.
- Add critical ECG alert escalation flows with acknowledgement, assignment, and audit trail.
- Add global search results that open patients, cases, reports, physicians, and organizations directly.

## Enterprise Enhancements

- Add route health tests for every Expo Router file.
- Add a documented route map for canonical URLs and aliases.
- Add feature ownership comments for premium shell vs business workflows.
- Add production readiness checks for API URL, CORS origin, auth cookies, refresh token, and health endpoints.
- Add user-role screenshots/tests for owner, admin, doctor, student, and standard user navigation.

