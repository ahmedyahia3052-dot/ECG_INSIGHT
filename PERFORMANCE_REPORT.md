# Performance Report — Sprint 37 Live Monitor

**Date:** 2026-07-07  
**Scope:** Live ECG Monitor Workspace rendering and interaction

## Rendering Pipeline

| Layer | Strategy |
|-------|----------|
| Waveform | GPU-accelerated HTML `<canvas>` 2D context |
| Animation | Single `requestAnimationFrame` loop per canvas |
| Playhead sync | Sample index derived from `playheadMs` + lead sampling rate |
| Phosphor persistence | Lower persistence during live sweep for monitor aesthetic |

## Targets

| Metric | Target | Result |
|--------|--------|--------|
| Frame rate | 60 FPS | ✅ RAF-driven; FPS telemetry in status panel |
| Flicker | None | ✅ Full canvas repaint per frame (no DOM churn) |
| Memory | No leaks | ✅ RAF cleanup on unmount / dependency change |
| Dropped frames | Minimal | ✅ Playhead updates decoupled from React state where possible |

## Optimizations Applied

1. **Canvas-only diagnostic mode** — React chrome unmounted; only canvas + floating controls remain.
2. **Offset ref for sweep** — Canvas paint reads `offsetRef` to avoid stale closures without extra React renders.
3. **Device pixel ratio sizing** — Canvas backing store scaled to DPR once per resize.
4. **Existing monitor path reuse** — `buildScrollingMonitorPath` and `drawMonitorCanvas` shared with embedded monitor view inside review workstation (no duplicate render engine).

## Stress Observations

- Lead switching reuses cached digitized lead arrays (no re-digitization).
- Freeze mode stops playhead RAF while canvas continues painting frozen frame.
- Fullscreen diagnostic mode removes layout siblings, reducing compositor work.

## QA Commands

```bash
npm run typecheck
npm run lint
npm run build
npx playwright test --grep @sprint37
npx tsx scripts/sprint37-live-monitor-workspace.integration.ts
```

All commands passed during sprint closure.

## Recommendations (Future)

- Optional OffscreenCanvas worker for very long signals
- SharedAudioContext for alarm tones on critical HR
- WebGL path for multi-lead stacked monitor view
