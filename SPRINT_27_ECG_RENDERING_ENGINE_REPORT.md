# Sprint 27 — ECG Rendering Engine Report

## Summary

Production-grade ECG Rendering Engine comparable to Philips IntelliSpace ECG, implemented as a composited pipeline without modifying clinical business logic (digitization, measurement engine, AI diagnosis).

## Rendering Pipeline

```
Image
  ↓
Digitized Signal
  ↓
Vector Model
  ↓
Renderer (SVG | Canvas2D | WebGL)
  ↓
Canvas / SVG Surface
  ↓
Monitor / Workstation
  ↓
Measurement Layer (existing)
  ↓
AI Overlay (existing)
  ↓
Annotations (existing)
  ↓
User Interaction
```

## Architecture

| Module | Path | Role |
|--------|------|------|
| Types | `rendering-engine/types.ts` | Layer IDs, viewport, vector model, metrics |
| Viewport | `rendering-engine/viewport.ts` | Infinite zoom/pan, virtual sample windowing, sub-pixel |
| Vector Model | `rendering-engine/vectorModel.ts` | Digitized signal → SVG path geometry |
| Grid | `rendering-engine/gridRenderer.ts` | Clinical ECG paper grid (SVG + Canvas2D) |
| SVG Renderer | `rendering-engine/svgRenderer.ts` | Digitized ECG vector rendering |
| Canvas2D | `rendering-engine/canvas2dRenderer.ts` | Live monitor + high-DPI canvas |
| WebGL | `rendering-engine/webglRenderer.ts` | Optional GPU path for huge signals (>500k samples) |
| Dirty Rect | `rendering-engine/dirtyRect.ts` | Layer-scoped invalidation |
| Render Loop | `rendering-engine/renderLoop.ts` | RAF, double buffering, OffscreenCanvas |
| Interaction | `rendering-engine/interaction.ts` | Hover, selection, crosshair, rubber band, beat cursor |
| Metrics | `rendering-engine/metrics.ts` | FPS + GPU acceleration monitor |
| Benchmark | `rendering-engine/benchmark.ts` | 60 FPS target validation |
| Pipeline | `rendering-engine/pipeline.ts` | Orchestrator |
| React View | `EcgRenderingEngineView.tsx` | Workstation integration |

## Layer Stack

| Layer | Z-Order | Backend |
|-------|---------|---------|
| Grid | 10 | SVG / Canvas2D |
| Waveform | 20 | SVG / Canvas2D / WebGL |
| Measurement | 30 | Existing overlay |
| AI | 40 | Existing overlay |
| Annotation | 50 | Existing overlay |
| Selection | 60 | SVG / Canvas2D |
| Cursor / Crosshair | 70 | SVG / Canvas2D |
| Tooltip | 80 | React |

## Features Delivered

- SVG rendering for digitized ECG (default waveform view)
- Canvas2D for live monitor (existing `ecgMonitorCanvas.ts` preserved)
- Optional WebGL renderer for huge signals with automatic fallback
- Infinite zoom and pan with anchor-preserving zoom math
- Vector rendering with smooth quadratic path interpolation
- Sub-pixel coordinates and high-DPI / Retina / 4K / 8K scaling via `effectiveDpr`
- 12-lead independent rendering with shared synchronized timeline
- Virtual rendering — only visible sample range is tessellated
- Dirty rectangle tracking per layer
- RequestAnimationFrame loop with double buffering and OffscreenCanvas support
- FPS monitor and GPU acceleration detection
- Benchmark harness with 60 FPS target
- Hover, lead highlight, crosshair, rubber-band selection, animated beat cursor
- Zero business-logic changes to digitization, measurement, or AI modules

## Integration Points

- `EcgImageCanvas` — waveform view uses `EcgRenderingEngineView` when digitized ECG is available; legacy SVG fallback preserved
- `EcgMonitorViewerFoundation` — passes `digitalEcg` to image canvas
- `ecgViewerEngine.ts` — `RENDER_ENGINE_LAYER` z-order constants added
- `viewer/index.ts` — exports rendering engine API

## Tests

| Test | Path |
|------|------|
| Unit | `scripts/ecg-rendering-engine.test.ts` |
| Integration | `scripts/sprint27-ecg-rendering-engine.integration.ts` |
| Playwright E2E | `tests/e2e/sprint27-ecg-rendering-engine.spec.ts` |

## Verification Commands

```bash
npx tsx scripts/ecg-rendering-engine.test.ts
npx tsx scripts/sprint27-ecg-rendering-engine.integration.ts
npm run qa:e2e -- tests/e2e/sprint27-ecg-rendering-engine.spec.ts
```

## Visual Verification

Playwright captures `test-results/screenshots/sprint27-ecg-rendering-engine.png` during E2E run.

## Performance Targets

| Metric | Target | Implementation |
|--------|--------|----------------|
| Frame rate | 60 FPS | RAF loop + virtual windowing |
| Frame time | ≤ 16.7 ms | Dirty rect + layer skip |
| Huge signals | > 500k samples | WebGL auto-select |
| GPU | When available | WebGL + desynchronized Canvas2D |

## Status

Sprint 27 ECG Rendering Engine — **COMPLETE**
