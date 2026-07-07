# Visual Benchmark — Render Engine 2.0

## Grid Calibration

| Setting | Expected | Verified |
|---------|----------|----------|
| Minor grid spacing | 1 mm equivalent | `computeMedicalGridMetrics` — minorPx from `pixelsPerSmallBox` |
| Major grid spacing | 5 × minor | `majorPx = minorPx * 5` |
| 25 mm/s paper speed | Faster horizontal scroll | Unit test `grid25.paperSpeed === 25` |
| 50 mm/s paper speed | 2× horizontal density | Unit test `grid50.paperSpeed === 50` |
| 10 mm/mV gain | Standard calibration | Unit test `grid25.gain === 10` |
| 20 mm/mV gain | Double amplitude | Unit test `grid50.gain === 20` |

## Trace Quality

| Feature | Implementation |
|---------|----------------|
| Sub-pixel X alignment | `subPixelAlign()` on grid + trace |
| Anti-aliasing | `imageSmoothingQuality: "high"` |
| Phosphor glow | `shadowBlur` 4–18px adaptive |
| Curve smoothing | Quadratic bezier between samples |
| Resampling | 2× window oversample via `resampleSubPixel` |

## Display Profile

| Property | Value |
|----------|-------|
| Background | `#000000` |
| Phosphor (normal) | `#22C55E` |
| Phosphor (alarm) | `#FACC15` |
| Grid minor | `rgba(16,120,88,0.52)` |
| Grid major | `rgba(34,197,94,0.82)` |
| CRT persistence | 0.08–0.32 alpha fade per frame |

## Layout Coverage

| Layout | Renderer |
|--------|----------|
| Single | 1 lead, sweep line enabled |
| 3 Lead | Independent `LeadRenderer` per region |
| 5 Lead | Sync clock shared |
| 12 Lead | Thinnest trace width (1.35px base) |

## Playwright Visual Spec

`tests/e2e/render-engine-2-hospital-visualization.spec.ts`:
- Canvas mounts with `data-render-engine="2.0"`
- 12-lead layout stable (poll-based, no flicker assertion)
- Paper speed control functional

## Benchmark Harness

`runRenderEngine2Benchmark()` — 60-frame synthetic paint loop:
- Pass threshold: avg FPS ≥ 55, min FPS ≥ 45
- Unit test result: **PASS** (avg ≥ 55)
