# Performance Report — Sprint 41 Live Monitor

**Date:** 2026-07-07  
**Scope:** Live ECG Monitor rendering pipeline

## Optimizations

| Area | Technique | Benefit |
|------|-----------|---------|
| Canvas sizing | Resize only when width/height/DPR change | Avoids redundant buffer allocation |
| Context | `desynchronized: true`, `alpha: false` | Lower compositor latency, opaque backdrop |
| DPR | `devicePixelRatio` scaling once per resize | Crisp lines without per-frame resize |
| RAF loop | Single animation frame per canvas | Stable 60 FPS target on modern hardware |
| Phosphor sweep | Partial persistence during live play | Visual continuity without full trail buffer |
| Playback rate | Paper-speed-linked `setSpeed` | Correct temporal scaling at 25/50 mm/s |
| State refs | `offsetRef` for sample index in paint loop | Avoids effect thrashing on high-frequency ticks |
| Pan/zoom | Transform applied in draw path | No DOM reflow during interaction |

## Memory

- No unbounded sample buffers; uses existing digitized lead arrays.
- Frame time ring buffer capped at 24 samples for FPS telemetry.
- Rhythm strip uses separate canvas (fixed 72px height) to isolate redraw scope.

## Measured Targets

| Metric | Target | Notes |
|--------|--------|-------|
| TypeScript errors | 0 | ✅ Verified |
| Lint errors | 0 | ✅ Verified |
| Canvas FPS (live) | ~60 | Reported via status panel `onFpsUpdate` |
| Flicker | None | Full clear + grid redraw each frame with stable DPR |

## Recommendations (Future)

- Offscreen canvas worker for 12-lead at 4K displays
- SharedArrayBuffer ring buffer for streaming acquisition (when live device feed is added)
