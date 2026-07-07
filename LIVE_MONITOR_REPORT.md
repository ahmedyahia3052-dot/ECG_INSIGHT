# Live Monitor Report — Sprint 37

## Overview

The Live ECG Monitor is a dedicated bedside-style workspace for real-time digitized waveform review. It does **not** replace or embed into the Hospital ECG Review Workstation.

## Routes

| Route | Purpose |
|-------|---------|
| `/ecg-live-monitor` | Resolver route (caseId/patientId query or demo case) |
| `/ecg-live-monitor/[caseId]` | Direct case monitor session |

## UI Surfaces

### Standard Monitor Layout
- **Header:** Case ID, patient name, link back to Review Workspace, Diagnostic Monitor entry
- **Status panel:** HR, rhythm, signal quality, gain, speed, grid, zoom, playback/record state, FPS
- **Lead strip:** All 12 standard leads + Rhythm Strip mode
- **Waveform stage:** Dark theme hospital canvas with sweep animation
- **Transport bar:** Play, pause, freeze, resume, record, loop, jump start/end, frame step, beat step, speed/gain/grid/zoom

### Diagnostic Monitor Mode
Triggered via **Diagnostic Monitor** in the header.

Hidden:
- Enterprise sidebar (full-bleed shell)
- Monitor header, lead strip, bottom transport chrome

Visible:
- Full-stage waveform canvas
- Compact floating status overlay
- Floating transport controls
- ESC exit chip

## Controls Reference

| Control | Action |
|---------|--------|
| Play / Pause | Toggle sweep playback |
| Freeze / Resume | Hold waveform; resume continues sweep |
| Record | Toggle recording indicator (STBY / REC) |
| Loop | Loop playhead at end of signal |
| Jump Start / End | Playhead to 0 ms / duration end |
| Frame ± | 40 ms step |
| Beat ± | Beat interval step |
| Speed 25/50 | Paper speed mm/s |
| Gain 5/10/20 | mm/mV calibration |
| Lead buttons | Switch active lead waveform |
| Rhythm Strip | Lead II wide-strip presentation label |

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Space | Play / Pause |
| F | Freeze toggle |
| R | Record toggle |
| L | Loop toggle |
| ESC | Exit diagnostic mode (or return to review if not in diagnostic) |
| + / − | Zoom in / out |
| ← / → | Frame step |
| ↑ / ↓ | Cycle gain |
| Home / End | Jump start / end |

## Technical Notes

- Rendering: HTML canvas + `requestAnimationFrame` via `drawMonitorCanvas`
- Playback state: `useEcgLiveMonitorEngine` wrapping `useEcgWaveformPlayback`
- Shortcuts: `useEcgLiveMonitorShortcuts` (web only)
- Fullscreen: `useEcgDiagnosticMode` with browser fullscreen API

## Test IDs

- `sprint37-live-monitor-workspace-ready`
- `sprint37-live-monitor-ready`
- `sprint37-live-monitor-header`
- `sprint37-live-monitor-status`
- `sprint37-live-monitor-leads`
- `sprint37-live-monitor-controls`
- `sprint37-exit-diagnostic`
- `sprint37-live-monitor-canvas-host`
- `sprint22-hospital-monitor-canvas`
