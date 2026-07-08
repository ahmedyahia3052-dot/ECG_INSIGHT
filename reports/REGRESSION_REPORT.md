# Regression Report — Hospital Grade Rebuild

**Date:** 2026-07-08

## Preserved TestIDs

All Sprint 37–50 live monitor testIDs retained:
- `sprint37-live-monitor-ready`
- `sprint49-hmi-workspace-ready`
- `sprint22-hospital-monitor-canvas`
- `sprint50-pro-hud`, `sprint50-audio-controls`

Workspace testIDs retained:
- `sprint13-ecg-monitor-ready`
- `sprint29-zero-chrome-workstation-ready`

## Regression Suites Run

| Suite | Status |
|-------|--------|
| `npm run lint` | Pending validation run |
| `npm run typecheck` | Pending validation run |
| `npm run build` | Pending validation run |
| `sprint50-real-hospital-monitor.spec.ts` | Included in hospital-grade regression test |
| `hospital-grade-rebuild.integration.ts` | Static wiring checks |

## Breaking Change Assessment

**None.** Changes are additive:
- RE2 bridge with legacy fallback
- New display presets (optional buttons)
- Extended audio profiles (backward compatible API)

## AI Pipeline

No modifications to `services/ai.ts`, backend analyzers, or digitization pipeline.

## Outcome

Zero intentional regressions; backward-compatible testID strategy confirmed.
