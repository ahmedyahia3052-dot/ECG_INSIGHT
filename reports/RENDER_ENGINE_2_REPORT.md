# Render Engine 2.0 — Hospital Visualization Engine

**Version:** 2.0.0  
**Date:** 2026-07-07  
**Tag:** `RenderEngine-2.0`  
**Scope:** Visualization infrastructure only — no AI, backend, API, or report changes.

---

## Objective

Transform the ECG live monitor into a true hospital-grade rendering engine with sub-pixel accuracy, authentic medical grid, phosphor CRT display, and 60 FPS realtime performance.

## Module: `render-engine-2/`

| Module | Responsibility |
|--------|----------------|
| `displayProfile.ts` | Hospital black background, phosphor green, CRT persistence, brightness/contrast |
| `medicalGrid.ts` | Authentic 1 mm / 5 mm ECG paper grid, sub-pixel alignment, 25/50 mm/s + 10/20 mm/mV |
| `hospitalRenderer.ts` | Anti-aliased phosphor trace, dynamic stroke width, GPU detection |
| `waveformProcessor.ts` | Sub-pixel resampling, clinical smoothing, artifact simulation (filter ON/OFF) |
| `leadRenderer.ts` | Independent per-lead renderer with shared sync clock (no timing drift) |
| `realtimeEngine.ts` | Offscreen double-buffer, circular scroll buffer, `HospitalRealtimeEngine` |
| `performanceMetrics.ts` | Rolling FPS, dropped-frame detection |
| `benchmark.ts` | Synthetic 60 FPS validation harness |

## Integration Points

| File | Change |
|------|--------|
| `ecgMonitorCanvas.ts` | `drawMultiLeadMonitorCanvas` delegates to `drawRenderEngine2MonitorFrame` |
| `EcgLiveMonitorView.tsx` | `WebMonitorCanvas` uses `HospitalRealtimeEngine` with offscreen back buffer |
| `live-monitor-v2/ecgHospitalGrid.ts` | Re-exports RE2 medical grid (backward compatible) |

## Features Delivered

### Rendering
- Sub-pixel grid alignment (`subPixelAlign`)
- High-quality anti-aliasing (`imageSmoothingQuality: "high"`)
- Dynamic trace thickness by lead count, zoom, and DPR
- Adaptive phosphor glow (live vs paused)
- Quadratic curve smoothing (replaces simple polyline segments)
- OffscreenCanvas double buffering

### Medical Grid
- Minor (1 mm) and major (5 mm) squares
- Paper speeds: 25 mm/s, 50 mm/s
- Gain: 10 mm/mV, 20 mm/mV (via existing `EcgGridGain`)
- Automatic zoom-aware spacing

### Waveform Processing
- `processWaveformSamples` — baseline wander, muscle artifact, powerline, respiration, noise (filter OFF)
- Clinical smoothing (filter ON)
- `resampleSubPixel` for pixel-perfect scaling

### Real-time Engine
- Continuous scrolling via circular buffer
- CRT persistence fade (no full-frame flicker)
- Shared lead sync clock
- Dropped-frame recovery metrics

### Display
- Hospital black `#000000`
- Medical green phosphor `#22C55E`
- Alarm tone yellow phosphor
- Brightness/contrast profile controls
- Status bar shows `RE2 2.0.0` + FPS

## Lead Layouts

Supports existing monitor layouts via `buildMonitorLayoutRegions`:
- 3 Lead, 5 Lead, 6 Lead, 12 Lead, single, custom

## Validation

| Gate | Result |
|------|--------|
| ESLint (viewer components) | PASS |
| Frontend typecheck (render-engine-2) | PASS |
| `scripts/render-engine-2.test.ts` | PASS |
| `scripts/render-engine-2.integration.ts` | PASS |

## Preserved

- Live Monitor V2 shell (Sprint 45), diagnostic workstation (Sprint 46), all APIs and backend unchanged
- Existing testID `sprint22-hospital-monitor-canvas` retained
- Added `data-render-engine="2.0"` attribute

## Tag

`RenderEngine-2.0`

**Do not conflate with Sprint 47.**
