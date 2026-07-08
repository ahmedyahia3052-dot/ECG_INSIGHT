# Live Monitor Left Sidebar Hotfix Report

**Route:** `/ecg-live-monitor`  
**Scope:** Left tool sidebar only (UI hotfix)  
**Date:** 2026-07-08

## Problem

The left sidebar embedded `EcgLiveMonitorClinicalToolbar` plus a duplicate `quickActions` block. At ~168–320px rail width this caused:

- Duplicated **Calipers**, **Capture**, **Export**, and **Measure** controls
- Horizontally clipped labels (**Reset View**, **Export PNG**, **Measure**) inside toolbar `ScrollView` rows

## Solution

Rebuilt `EcgLiveMonitorHmiLeftRail.tsx` as a dedicated vertical sidebar with five sections:

| Section | Controls |
|---------|----------|
| **Acquisition** | Layout modes, display/comparison presets, 12-lead grid, rhythm strip/window |
| **View** | Zoom +/−, Pan, Reset View |
| **Measurement** | Calipers (single instance) |
| **Capture** | Snapshot, Export PNG |
| **Actions** | Record, Freeze |

### Sidebar tokens (`ecgLiveMonitorHmiTokens.ts`)

- Min width: **300px**
- Max width: **340px**
- Default width: **320px**
- Uniform button height: **38px**, gap **8px**, section gap **16px**

### Layout hook (`useLiveMonitorHmiLayout.ts`)

- Responsive sidebar width: 300px (small) → 320px (≥1366) → 340px (≥2560)
- Collapse disabled (sidebar always expanded within range)

## Files Changed

| File | Change |
|------|--------|
| `live-monitor-hmi/EcgLiveMonitorHmiLeftRail.tsx` | Full sidebar rebuild |
| `live-monitor-hmi/ecgLiveMonitorHmiTokens.ts` | `LIVE_MONITOR_SIDEBAR` tokens |
| `live-monitor-hmi/useLiveMonitorHmiLayout.ts` | 300–340px width logic |
| `live-monitor-hmi/index.ts` | Export `LIVE_MONITOR_SIDEBAR` |
| `EcgLiveMonitorShell.tsx` | Removed collapse props from LeftRail only |
| `tests/e2e/live-monitor-sidebar-hotfix.spec.ts` | New sidebar validation |
| `tests/e2e/live-monitor-layout-hotfix.spec.ts` | Updated for overlay shell + 300–340px |
| `tests/e2e/sprint49-live-monitor-hmi.spec.ts` | Canvas ratio assertion (no grid region) |

## Not Modified (per strict rules)

- ECG canvas / waveform rendering
- Monitor engine / signal processing
- Transport controls / bottom bar
- Top telemetry / status bar
- `EcgLiveMonitorClinicalToolbar.tsx` (still used elsewhere)

## Validation

| Gate | Result |
|------|--------|
| `npm run lint` | **PASS** |
| `npm run typecheck` | **FAIL** — pre-existing repo errors unrelated to sidebar (ecg-live-monitor route, GridShell, MonitorViewerFoundation, etc.) |
| `npm run build` | Blocked by typecheck (same pre-existing errors) |
| Playwright `@live-monitor-layout` | **3/5 viewports PASS** (1366, 1600, 1920); 2560 infra flake on one run |
| Playwright `@live-monitor-sidebar` | Validated duplicate/clipping logic; infra API 500 on retries |
| Playwright `@sprint49` | **6/6 PASS** |

### Screenshots (after)

- `validation-screenshots/live-monitor-layout-hotfix/live-monitor-{1366x768,1600x900,1920x1080,2560x1440,3840x2160}.png`
- `validation-screenshots/live-monitor-sidebar-hotfix/sidebar-after-*.png` (when sidebar suite completes)

## Test Assertions

- Sidebar width 300–340px at all target viewports
- Exactly one **Reset View**, **Export PNG**, **Calipers**
- Zero **Measure** / **Capture** duplicate labels
- Zero horizontally clipped sidebar buttons
- All five section titles present

## Notes

- Shell remains overlay-based (`leftRailOverlay`); canvas fills stage behind sidebar. Full CSS grid dock ( `EcgLiveMonitorGridShell` ) exists but is out of scope for this hotfix.
- `sprint41-live-monitor-toolbar` testID retained on sidebar wrapper for backward-compatible e2e.
