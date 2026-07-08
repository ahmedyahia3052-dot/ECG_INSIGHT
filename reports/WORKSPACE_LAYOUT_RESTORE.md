# Workspace Layout Restore — Hotfix Rollback

**Date:** 2026-07-08  
**Scope:** Restore pre–Sprint 53 stable ECG workspace layout; sidebar-only fix

## Problem

Sprint 53 (`6c61909`) introduced `EcgReadingStationLayout`, CSS grid layout presets, and docked tool sections that changed workspace architecture, viewer proportions, and left sidebar behavior.

## Restoration

Reverted layout stack to **`bf5a1ed`** (last stable commit before Sprint 53):

| File | Action |
|------|--------|
| `EcgMonitorViewerFoundation.tsx` | Restored — uses `EcgViewerResizableWorkspace` + `EcgLiveMonitorView` |
| `EcgViewerResizableWorkspace.tsx` | Restored |
| `EcgWorkstationGridShell.tsx` | Restored (Sprint 29 grid) |
| `EcgUnifiedClinicalLeftPanel.tsx` | Restored + **sidebar fix** |
| `EcgZeroChromeToolbar.tsx` | Restored |
| `ecgWorkstationVisualTokens.ts` | Restored (114px left / 171px right) |
| `ecgImageEngine.ts`, `types.ts`, render engine helpers | Restored |
| `EcgWorkspaceLayoutSwitcher.tsx` | **Removed** (Sprint 53 only) |
| `useEcgWorkspaceLayoutMode.ts` | **Removed** (Sprint 53 only) |
| `ecgAutoFitEngine.ts`, `useEcgAutoFit.ts` | **Removed** (orphan hotfix) |

**Unchanged:** ECG viewer canvas, right measurement panel, top workflow ribbon, image sizing, tool palette (floating).

## Sidebar-Only Fix (`EcgUnifiedClinicalLeftPanel.tsx`)

- Vertical `ScrollView` with `nestedScrollEnabled` + web scroll indicator
- `overflow: hidden` containment on shell/body
- Quick-action buttons stacked vertically (no side-by-side crop at 114px)
- `minWidth` tied to `leftPanelMinWidth`; `flexShrink: 0` on sections
- Header pinned (`flexShrink: 0`)

## Validation

- `npm run lint` — PASS
- `tsc -p artifacts/ecg-insight/tsconfig.json` — PASS
- Playwright workspace subset — see test run output

**Not committed** — awaiting manual approval.
