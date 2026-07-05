# Performance Report — Sprint 18

**Date:** 2026-07-05

## Monitor Mode

- Live monitor uses `requestAnimationFrame` for sweep animation
- FPS tracked via rolling 24-frame window; reported in status bar
- Playwright validation observed 55–60 FPS on desktop Chromium

## Layout

- Main viewer panel: 85% vertical space (up from 82%)
- Bottom timeline/status: 15%
- Dark canvas reduces visual repaint contrast; `willChange: transform` retained on viewer stack

## SVG Rendering

- Monitor path rebuilt per frame from digitized sample window (520 samples)
- Waveform-only view uses native SVG paths (no raster overlays)
- Compare overlay mode shares single `controls` transform (sync zoom/pan)

## Recommendations

- For 12-lead simultaneous monitor mode, consider WebGL path in future sprint
- Playback scrubber is web-only (`input[type=range]`); native slider can be added later
