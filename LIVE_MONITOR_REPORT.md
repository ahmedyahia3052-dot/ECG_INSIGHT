# Live Monitor Report — Sprint 41

**Module:** Live ECG Monitor  
**Date:** 2026-07-07

## Wave Rendering

- **Engine:** `requestAnimationFrame` loop with `desynchronized: true` canvas context for hardware-accelerated 2D compositing on supported browsers.
- **Sweep:** Phosphor persistence sweep line during live playback; full redraw when frozen, paused, or in review mode.
- **Multi-lead:** `drawMultiLeadMonitorCanvas` renders 3-, 5-, 12-lead, and single-lead layouts via `monitorLayout.ts` region builders.
- **Rhythm strip:** Dedicated `drawRhythmStripCanvas` on a secondary canvas below the main monitor.

## Monitor Modes

| Mode | Leads Displayed |
|------|-----------------|
| Single | One selected lead (I–V6) |
| 3-lead | I, II, III |
| 5-lead | I, II, III, aVR, V1 |
| 12-lead | Standard 12-lead grid |
| Rhythm strip | Continuous Lead II (or selected lead) strip |

Instant switching via lead strip buttons or keyboard (1, 3, 5).

## Clinical Controls

| Control | Values | Implementation |
|---------|--------|----------------|
| Paper speed | 25 / 50 mm/s | `ecgMonitorGridMath.playbackRateForPaperSpeed` + grid spacing |
| Gain | 5 / 10 / 20 mm/mV | `gainScaleFromMmPerMv` in canvas renderer |
| Grid | On / Off | `controls.grid.visible` wired to canvas |
| Zoom / Pan | Toolbar + shortcuts | `controls.transform` applied in canvas state |

## Transport

| Action | UI | Shortcut |
|--------|-----|----------|
| Play / Pause | Controls | Space |
| Freeze / Resume | Controls | F |
| Review Mode | Controls | V |
| Record | Controls | R |
| Loop | Controls | L |
| Diagnostic fullscreen | Header / F11 | F11 |
| Exit diagnostic | ESC chip | Escape |

## Alarm Bar

Real telemetry from digitized ECG and playback engine:

- **HR:** From case analysis; alarm tone when <50 or >120 BPM
- **Signal:** Continuity % or quality score
- **Lead off:** Detected when active lead has insufficient samples
- **Noise:** Derived from quality score (low / medium / high)
- **Acquisition:** live | paused | frozen | review | no_signal

## Files Changed

- `EcgLiveMonitorShell.tsx` — orchestration
- `EcgLiveMonitorView.tsx` — dual canvas host
- `EcgLiveMonitorControls.tsx` — transport + gain/speed
- `EcgLiveMonitorLeadStrip.tsx` — layout modes
- `EcgLiveMonitorAlarmBar.tsx` — alarm chips
- `EcgLiveMonitorClinicalToolbar.tsx` — zoom/pan/measure/capture
- `ecgMonitorCanvas.ts` — rendering core
- `ecgMonitorGridMath.ts` — clinical math
- `monitorLayout.ts` — lead regions
- `useEcgLiveMonitorEngine.ts` — layout, review, paper speed
- `useEcgLiveMonitorShortcuts.ts` — keyboard map
