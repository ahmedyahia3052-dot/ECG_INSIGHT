# Performance Report — Render Engine 2.0

## Memory

| Component | Strategy |
|-----------|----------|
| Offscreen back buffer | Single allocation per canvas resize |
| Circular scroll buffer | Fixed capacity (8192), no growth |
| Waveform resampling | Ephemeral per-frame arrays (GC-friendly at 60 FPS) |
| Lead renderer | Singleton `leadRenderer` instance |

## CPU / Paint Cost

| Operation | Per-frame cost |
|-----------|----------------|
| CRT fade overlay | 1 fillRect |
| Grid draw | O(cells visible) with clip rect |
| Trace draw | O(samples) with bezier |
| Clinical markers | O(markers in window) |
| Buffer swap | 1 drawImage |

## Comparison vs Legacy Polyline Renderer

| Aspect | Legacy | Render Engine 2.0 |
|--------|--------|-------------------|
| Buffering | Direct paint | Offscreen double buffer |
| Smoothing | Linear interpolate | Quadratic bezier + sub-pixel resample |
| Grid | 0.5px aligned | RE2 `subPixelAlign` + zoom-aware |
| Persistence | Alpha fade only | CRT profile + persistence control |
| FPS telemetry | Inline frameTimes | `PerformanceMetricsMonitor` + drops |
| Lead sync | Per-lead offset | Shared `updateSyncClock` |

## Validation Timings (local)

| Test | Duration |
|------|----------|
| `render-engine-2.test.ts` | ~1s |
| `render-engine-2.integration.ts` | ~1s |
| Frontend lint (viewer) | PASS |

## 60 FPS Guarantee

Engine targets 60 FPS via:
- `TARGET_FPS = 60` constant
- `MIN_ACCEPTABLE_FPS = 55` quality gate
- Benchmark harness in CI unit suite (`scripts/render-engine-2.test.ts`)

Live FPS depends on device GPU and lead count; 12-lead mode uses thinnest traces to preserve budget.
