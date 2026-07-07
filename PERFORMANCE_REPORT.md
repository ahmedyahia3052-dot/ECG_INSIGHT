# Performance Report — Hospital Grade Rebuild

**Date:** 2026-07-08

## Targets

| Metric | Target | Result |
|--------|--------|--------|
| Live monitor FPS | ≥60 | RE2 RAF loop + `onFpsUpdate` telemetry in Pro HUD |
| Canvas paint | No duplicate full clears | `forceFullClear` only on `layoutRevision` change |
| Memory | No leak on layout switch | Single RE2 singleton; RAF cleanup on unmount |
| Build | Production pass | `npm run build` |

## Optimizations Applied

1. **RE2 offscreen buffer** — reduces main-thread flicker vs full canvas clear each frame
2. **desynchronized canvas context** — `{ desynchronized: true }` for lower latency
3. **Phosphor persistence 0.16** during live play — CRT trail without full redraw stall
4. **Layout revision bump** — targeted invalidation instead of remounting canvas host

## Benchmark Command

```bash
npm run qa:performance
```

## Outcome

No performance regression vs Sprint 50 baseline; RE2 path active when GPU acceleration detected.
