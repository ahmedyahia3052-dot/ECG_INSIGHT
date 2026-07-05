# Sprint 17 Performance Report

**Date:** 2026-07-05  
**Component:** ECG Pro Viewer Enterprise

## Runtime Metrics

The viewer exposes live performance telemetry in the clinical status bar:

- **Rendering FPS** — tracked via `requestAnimationFrame` sampling (30-frame rolling window)
- **Image DPI estimate** — derived from image dimensions × current zoom
- **Pointer coordinates** — image-space X/Y updated on pointer move

During Playwright validation with a digitized clinical case, FPS remained in the **55–60 FPS** range on desktop Chromium with grid, waveform, and toolbar active.

## Optimizations Implemented

| Technique | Implementation |
|-----------|----------------|
| GPU transform hints | `willChange: transform` on layer stack |
| Crisp rendering | `imageRendering: crisp-edges` on ECG scan layer |
| Image dimension cache | 15-minute TTL cache in `ecgImageEngine` |
| Momentum pan decay | 0.92 velocity factor per frame (avoids abrupt stop) |
| Zoom-at-anchor | Prevents full-canvas reflow; only transform updates |
| Layer z-index stack | Grid, waveform, overlay, measurements isolated |

## Zoom Range

- Minimum: 0.1× (10%)
- Maximum: 32× (3200%) — supports infinite-feel zoom beyond 1600% preset
- Presets: 100%, 200%, 400%, 800%, 1600%

## Stress Scenarios Verified

| Scenario | Observation |
|----------|-------------|
| High zoom (400%+) | Smooth preset switch; status bar updates instantly |
| Compare mode | Side-by-side viewer unchanged; no regression |
| Multiple toolbar layers | Horizontal scroll; no layout freeze |
| Integration suite (68 scripts) | Completed in ~10.5 min without OOM or crash |

## Recommendations

- For scans above 6000 px edge length, consider tile-based rendering in a future sprint
- FPS telemetry is web-only; native builds use gesture-handler transforms without RAF sampling
