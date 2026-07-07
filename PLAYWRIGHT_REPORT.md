# Playwright Report — Sprint 41 Live Monitor

**Date:** 2026-07-07  
**Spec:** `tests/e2e/sprint41-live-monitor.spec.ts`  
**Tags:** `@sprint41 @enterprise`

## Test Coverage

| Test | Verifies |
|------|----------|
| alarm bar and clinical toolbar are visible | `sprint41-live-monitor-alarm-bar`, toolbar test IDs |
| play pause freeze resume transport | LIVE → PAUSED → FROZEN → LIVE status transitions |
| review mode freezes acquisition | REVIEW status + alarm acq chip |
| gain and sweep speed switching | 25/50 mm/s, 5/20 mm/mV in status panel |
| 3 5 12 lead layout modes and lead switch | Layout labels + V5 single lead |
| rhythm strip canvas renders | `sprint41-rhythm-strip-canvas` |
| fullscreen diagnostic mode | Header hidden, ESC restores |
| zoom pan reset view and snapshot export | Toolbar interactions + optional PNG download |

## Prerequisites

- Authenticated doctor session
- Digitized ECG case (fixture created in `beforeAll`)
- Frontend + API servers running

## Run Command

```bash
playwright test tests/e2e/sprint41-live-monitor.spec.ts --grep @sprint41
```

## Isolation

- **New spec only** — existing `sprint37-live-monitor.spec.ts` unchanged
- No modifications to CI pipeline or `playwright.config.ts`

## Test IDs Added (Sprint 41)

- `sprint41-live-monitor-alarm-bar`
- `sprint41-alarm-hr`, `sprint41-alarm-signal`, `sprint41-alarm-lead`, `sprint41-alarm-noise`, `sprint41-alarm-acq`
- `sprint41-live-monitor-toolbar`
- `sprint41-rhythm-strip-host`, `sprint41-rhythm-strip-canvas`
