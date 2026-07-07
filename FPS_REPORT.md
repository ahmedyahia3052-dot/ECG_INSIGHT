# FPS Report — Render Engine 2.0

## Target

| Metric | Target | Pass Threshold |
|--------|--------|----------------|
| Target FPS | 60 | — |
| Average FPS | 60 | ≥ 55 |
| Minimum FPS | — | ≥ 45 |
| Frame time | 16.7 ms | ≤ 18 ms avg |

## Engine Optimizations

1. **OffscreenCanvas back buffer** — paint offscreen, single blit to display canvas
2. **`desynchronized: true`** — reduces compositor blocking
3. **CRT persistence fade** — partial alpha clear instead of full redraw
4. **Ref-based playback state** — no React re-render during paint loop
5. **Circular scroll buffer** — O(1) head advance, no array reallocation
6. **Shared lead sync clock** — single offset computation per frame

## Metrics Monitor

`PerformanceMetricsMonitor` tracks:
- Rolling 30-frame FPS window
- Per-frame milliseconds
- Dropped frames (delta > 1.5× frame budget)

Status bar format: `RE2 2.0.0 · … · {fps} FPS`

## Synthetic Benchmark Results

```
scripts/render-engine-2.test.ts
  runRenderEngine2Benchmark(60 frames)
  avgFps >= 55  ✓
  passed: true  ✓
```

## Live Monitor Integration

`EcgLiveMonitorView` → `HospitalRealtimeEngine.onMetrics` → HUD/status FPS callback.

## GPU Acceleration

- `detectGpuAcceleration()` — WebGL context probe
- OffscreenCanvas path when available (browser)
- `PerformanceMetricsMonitor.gpuAccelerated` flag

## Recommendations

- Keep `workers: 1` in Playwright when validating monitor FPS
- Run live monitor with digitized waveform for realistic paint cost
- Use `infra:health` before FPS E2E runs
