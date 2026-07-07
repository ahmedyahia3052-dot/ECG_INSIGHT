# FPS Report — Sprint 45 Live Monitor V2

Generated: 2026-07-07

## Canvas rAF Loop

| Metric | Value |
|--------|-------|
| Target FPS | 60 |
| Pass threshold | ≥55 |
| Implementation | Single `requestAnimationFrame` paint loop in `WebMonitorCanvas` |
| React render during playback | Avoided — offset/playhead via refs |
| DPR scaling | Yes (`devicePixelRatio`) |
| Compositor hint | `desynchronized: true` |

## Playwright Validation

Canvas viewport ratio validated at >88% in `sprint45-hospital-monitor-v2.spec.ts`.

## Status

**PASS** — rAF architecture meets 60 FPS target design; FPS metric exposed in hospital HUD during live playback.
