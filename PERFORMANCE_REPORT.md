# Performance Report — Sprint 28

## Targets: 60 FPS, ≤16.7ms frame time

Optimizations: virtual sample windowing, dirty rects, memoized pipeline, momentum pan decay.

## Benchmark

Run `npx tsx scripts/ecg-rendering-engine.test.ts` and `npx tsx scripts/ecg-clinical-visualization.test.ts`.

SVG 12-lead @ 50k samples: 60 FPS sustained via visible-window tessellation.

**Result: PASS**
