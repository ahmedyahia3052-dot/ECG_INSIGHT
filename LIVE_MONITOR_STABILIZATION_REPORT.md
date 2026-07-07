# Live Monitor Stabilization Report

**Date:** 2026-07-08  
**Status:** ✅ STABILIZED  
**Scope:** Post-Sprint 50 hospital ECG monitor fixes — no Sprint 51 work, no UI redesign.

---

## Issues Addressed

| # | Issue | Root Cause | Fix |
|---|-------|------------|-----|
| 1 | Connection Lost banner while backend running | Flaky `/health` polling + `navigator.onLine` only; global MobileSync toast on single failure | Monitor telemetry polls `/live` with retry; mobile sync requires 2 consecutive failures; backend health uses `/live` with 3 retries |
| 2 | Live signal stream disconnects | Playback defaulted to paused; tab visibility not resumed | Auto-play when digitized ECG loads; resume on `visibilitychange` |
| 3 | 6×2 shows only one lead | Every lead button called `focusLead()` → `isolatedLead` filter | Multi-lead layouts use lead highlight only; `setLayoutMode` clears `isolatedLead` |
| 4–7 | Compressed waveform / empty area above grid | Chrome height underestimated; phosphor fade retained old layout | `chromeHeight` includes Pro HUD + audio + bottom bar; `layoutRevision` forces full canvas clear on layout switch |
| 8 | Layout switch slow / ghost frames | CRT persistence without full clear | `forceFullClear` on layout revision; pan/zoom reset on layout change |
| 9–11 | Stream / RAF / continuous playback | RAF loop OK but playhead stopped when paused | RAF loop unchanged (always runs); playhead advances when `engine.play()` auto-starts |

---

## Files Modified

- `monitorLayout.ts` — `isMultiLeadLayoutMode()`
- `useEcgLiveMonitorEngine.ts` — layout revision, safe layout/rhythm setters
- `EcgLiveMonitorLeadStrip.tsx` — multi-lead lead selection vs focus
- `EcgLiveMonitorShell.tsx` — auto-play, visibility resume, layout reset, lead change fix, Pro HUD/audio overlay (preserves canvas viewport ratio)
- `EcgLiveMonitorView.tsx` — layout revision instant redraw
- `ecgMonitorCanvas.ts` — `forceFullClear` for layout transitions
- `useMonitorTelemetry.ts` — backend `/live` probe with debounced offline
- `mobileOffline.ts` — resilient `/live` health check
- `MobileSyncStatus.tsx` — debounced connection-lost toast
- `useLiveMonitorHmiLayout.ts` / `ecgLiveMonitorHmiTokens.ts` — accurate chrome height

---

## Validation

| Command | Result |
|---------|--------|
| `npm run lint` | ✅ PASS |
| `npm run typecheck` | ✅ PASS |
| `npm run build` | ✅ PASS |
| Playwright Sprint 50 | ✅ 6/6 |
| Playwright Sprint 45/49 regression | ✅ (monitor suite) |

---

## Bedside Monitor Behavior (Restored)

- Continuous live sweep when digitized signal is present
- 6×2 / 12-lead / rhythm strip / single lead switch with immediate full redraw
- Grid fills available canvas; baseline centered per lead region via `sampleToClinicalY`
- CONN telemetry reflects API `/live` status, not browser offline alone
- Sprint 50 audio, Pro HUD, and HMI rails preserved

---

## Operator Notes

1. Start API + frontend before opening Live Monitor (`npm run dev:api` + `npm run dev:frontend`)
2. Use layout buttons (12 Lead, 6×2, Rhythm Strip, Single) for mode changes — lead buttons highlight in multi-lead modes; use Single + lead click for lead focus
3. Space toggles pause; monitor auto-resumes on tab focus when not in review mode
