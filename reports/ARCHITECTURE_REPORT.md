# Architecture Report — Hospital Grade Rebuild

**Date:** 2026-07-08

## System Layers

```
Login / Dashboard (Expo Router)
        │
        ├── /ecg-workspace → EcgEnterpriseWorkspaceScreen
        │       └── EcgMonitorViewerFoundation  [#hospital-grade-workspace-ready]
        │             ├── Left: EcgUnifiedClinicalLeftPanel (patient, study, history)
        │             ├── Center: Original (EcgImageCanvas) + Digitized (EcgClinicalVisualizationCanvas)
        │             ├── Right: EcgClinicalRightPanel (measurements, AI, intervals)
        │             └── Bottom: Timeline / comparison / navigation
        │
        └── /ecg-live-monitor → EcgLiveMonitorWorkspaceScreen
                └── EcgLiveMonitorShell  [#hospital-grade-rebuild-ready]
                      ├── EcgLiveMonitorHmiStatusBar
                      ├── EcgLiveMonitorView (WebMonitorCanvas RAF loop)
                      │       └── hospitalMonitorRenderer → RE2 | ecgMonitorCanvas
                      ├── HMI left/right rails + bottom transport
                      └── live-monitor-pro HUD + live-monitor-audio engine
```

## Render Pipeline (Live Monitor)

| Stage | Module | Responsibility |
|-------|--------|----------------|
| Playback | `useEcgWaveformPlayback` | Continuous loop, freeze, playhead |
| Engine | `useEcgLiveMonitorEngine` | Layout modes, presets, rhythm strip, comparison |
| Paint | `hospitalMonitorRenderer` | RE2 phosphor frame or legacy canvas |
| RE2 | `HospitalRealtimeEngine` | Offscreen buffer, 60 FPS target, grid math |
| Legacy | `ecgMonitorCanvas` | Fallback when GPU probe fails |

## Audio Pipeline

| Input | Resolver | Output |
|-------|----------|--------|
| R-wave peaks (`detectBeatMarkerIndices`) | PVC set | Per-beat tone |
| HR + rhythm string + leadOff | `resolveRhythmProfile` | Alarm profile + periodic alarm tone |
| User controls | mode/volume/alarmVolume/audioEnabled | Web Audio oscillators |

## Display Presets

| Preset | Layout | Clinical Use |
|--------|--------|--------------|
| Bedside | dual (II + V5) | Room monitor |
| Central Station | 6×2 | Nurse station wall |
| Hospital Mode | 12-lead | Diagnostic review |

## Preservation Boundaries

- **No changes** to `server/src` AI endpoints, digitization workers, or Prisma schema
- **No changes** to `rendering-engine/` SVG digitized viewer internals
- **Additive only** to monitor shell — all Sprint 37–50 testIDs retained

## Key Files

- `hospital-monitor/hospitalMonitorRenderer.ts` — RE2 integration bridge
- `monitorLayout.ts` — layout + display preset definitions
- `live-monitor-audio/useLiveMonitorAudioEngine.ts` — bedside audio
- `EcgMonitorViewerFoundation.tsx` — workspace orchestrator
- `tests/e2e/hospital-grade-rebuild.spec.ts` — acceptance workflow
