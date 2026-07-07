# Sprint 36 — Performance Report

## Instrumentation Verified

- `useViewerRuntimeMetrics` — FPS sampling via `requestAnimationFrame`
- `useEnterpriseStatusMetrics` — throttled status bar updates (≤2 Hz)
- `EcgEnterpriseStatusBar` — zoom, FPS, memory, GPU renderer display
- Server `/live` polling for backend health (15 s interval)

## Observations (Playwright session)

| Metric | Typical Range | Notes |
|--------|---------------|-------|
| Monitor load (ready) | 10–40 s | Includes auth, fixture, image load |
| Status bar FPS | 11–60 | Depends on canvas activity |
| JS heap (status bar) | ~65 MB | Chrome `performance.memory` when available |
| Responsive re-layout | <15 s | Per viewport after warm cache |

## Fixes Impacting Performance

- Removed infinite re-render loops in status metrics and history stack (major CPU win)
- Idempotent workspace commits reduce unnecessary React reconciliation
- CORP header fix eliminates failed image retry storms

## Recommendations

- Keep status metrics throttled; do not add `present` objects to effect dependency arrays
- Prefer keyboard shortcuts over repeated floating-palette DOM interaction in automation
