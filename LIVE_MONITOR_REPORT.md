# Live Monitor Report — Hospital Grade Rebuild

**Date:** 2026-07-08  
**Surface:** `/ecg-live-monitor`

## Rebuild Deliverables

| Requirement | Implementation |
|-------------|----------------|
| >90% canvas viewport | HMI overlay rails; Pro HUD at bottom; `HMI_LAYOUT.canvasViewportRatio` |
| 60 FPS rendering | RAF loop + RE2 offscreen buffer via `hospitalMonitorRenderer` |
| Phosphor ECG grid | RE2 `displayProfile.ts` + legacy phosphor persistence |
| Zero blank screen | Auto-play on digitized load; resume on visibility |
| Layout modes | 3/5/6/12-lead, 6×2, 3×4, dual, quad, custom, rhythm strip |
| Lead focus | `engine.focusLead()` with instant `layoutRevision` bump |
| Central station / bedside | `MonitorDisplayPreset` → layout mapping |
| Hospital floating controls | HMI left rail + bottom transport + clinical toolbar |
| Audio R-wave sync | `useLiveMonitorAudioEngine` peak detection |
| Alarm profiles | Normal, PVC, Brady, Tachy, VF, VT, Asystole, Lead Off |

## Stabilization Fixes (Included)

- Connection telemetry retry on `/live`
- 6×2 multi-lead rendering (no erroneous `isolatedLead` filter)
- Instant redraw on layout switch (`forceFullClear`)
- Layout change resets pan/zoom/scroll

## Marker

`nativeID="hospital-grade-rebuild-ready"` on `EcgLiveMonitorShell`.

## Validation

- Sprint 50 Playwright suite — PASS
- Sprint 45/49 canvas ratio checks — PASS
- `@hospital-grade` E2E — display presets + audio controls

## Outcome

Live monitor now uses Render Engine 2.0 in the primary paint path with full hospital preset and alarm audio coverage.
