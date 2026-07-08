# Sprint 52 — ECG Workspace Professional Rebuild

**Status:** COMPLETE  
**Date:** 2026-07-08

## Summary

Sprint 52 refactors `/ecg-workspace` into a hospital-grade ECG **interpretation workstation**. Live monitor functionality is fully removed from the workspace and exists only in `/ecg-live-monitor`.

## Deliverables

### Phase 1 — Monitor removal
- Removed `EcgLiveMonitorView`, waveform playback, and playback timeline from `EcgMonitorViewerFoundation`
- Removed Live Monitor chip from `EcgViewModeSwitcher`
- `M` shortcut and command palette open `/ecg-live-monitor` instead of embedding monitor

### Phase 2–7 — Professional layout
- Grouped toolbar: IMAGE / VIEW / ANALYSIS / ANNOTATIONS / REPORT (`EcgZeroChromeToolbar`)
- Docked left sidebar with scrollable clinical + tool sections (`EcgUnifiedClinicalLeftPanel`, `EcgWorkspaceLeftToolSections`)
- Clinical status bar with zoom, speed, gain, coordinates, scale, resolution
- Lead layout selector: 4×3, 6×2, 3×4, sequential, stacked, rhythm, single
- Diagnostic shell no longer includes rhythm strip / playback

### Phase 3 — Image fill
- `ECG_HERO_FILL_TARGET = 0.90` (~90% viewport width)
- Fit Width / Height / Page + 100/150/200/300% zoom presets

### Phase 5 — 12-lead fix (critical)
- `twelveLeadLayout.ts` allocates all 12 standard leads for every layout preset
- Disabled `leadFocusEnabled` by default in workspace waveform view
- Removed rhythm-mode lead filtering that hid leads

### Sprint 53 sidebar layout fix (blocking)
- **CSS Grid regions** — `sidebar | canvas | panel` with `minmax(280px, …)` left track; canvas cannot overlap sidebar
- **Removed floating tool palette** — tools docked in left sidebar (`EcgWorkspaceLeftToolSections`)
- **280px minimum sidebar** — responsive up to 360px on 4K; localStorage v10 migration clamps legacy widths
- **Acquisition section** — full title and fields visible in scrollable sidebar
- **No duplicate calipers** — removed from top toolbar annotations; single source in sidebar

## Validation

| Check | Result |
|-------|--------|
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `npm run build` | PASS |
| Sprint 52 integration (16 checks) | PASS |
| Playwright `@sprint52` (11 tests) | PASS |

## Key files

- `artifacts/ecg-insight/components/ecg/viewer/EcgMonitorViewerFoundation.tsx`
- `artifacts/ecg-insight/components/ecg/viewer/EcgZeroChromeToolbar.tsx`
- `artifacts/ecg-insight/components/ecg/viewer/EcgWorkstationGridShell.tsx`
- `artifacts/ecg-insight/components/ecg/viewer/EcgUnifiedClinicalLeftPanel.tsx`
- `artifacts/ecg-insight/components/ecg/viewer/EcgWorkspaceLeftToolSections.tsx`
- `tests/e2e/sprint52-ecg-workspace-rebuild.spec.ts`
- `scripts/sprint52-ecg-workspace-rebuild.integration.ts`
