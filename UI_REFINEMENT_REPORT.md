# UI Refinement Report — Sprint 32

## Overview

Sprint 32 refines the ECG clinical cockpit from a development workstation into a hospital-grade cardiology viewer.

## Left Panel — Clinical Summary

**Before:** Multiple stacked cards (patient, case, workflow, leads) with heavy borders and duplicated labels.

**After:** Single `Clinical Summary` card (`sprint32-clinical-summary-panel`) with collapsible sections:

- Patient
- Case
- Workflow (pipeline chips)
- Lead Selection (`EcgLeadSelectorGrid`)
- Quick Actions

Visual changes: reduced padding (6px), 1px borders, medical cyan accents, 150ms collapse transitions.

## Right Panel — Tab Isolation

**Before:** ScrollView showing all tab content stacked; long vertical scroll.

**After:** Five tabs — Patient, Measurements, **AI Findings**, Reports, History. Only the active tab body mounts. Tab bar uses cockpit colors with 32px height.

## Toolbar — Popover Groups

**Before:** All icons inline in a single strip (Sprint 31).

**After:** Compact group chips (FILE, VIEW, MEASURE, AI, COMPARE, REPORT, EXPORT) open popovers with 32×32 icon buttons. Fullscreen and panel toggles live under VIEW.

## Chrome Reduction

Removed from `EcgMonitorViewerFoundation`:

- `EcgClinicalAlertsBanner` (alerts surfaced in left workflow + right patient tab)
- `EcgViewModeSwitcher` (view modes in VIEW toolbar popover)

## Viewer Hero

- Auto `contain` fit when image + container dimensions are known
- Double-click → fit to screen (`contain`)
- Mouse wheel zoom at cursor (existing)
- Middle-mouse / drag pan (existing)

## Color System

`ecgCockpitColors.ts`:

| Token | Value | Use |
|-------|-------|-----|
| bgDeep | `#060A0F` | Root background |
| bgPanel | `#101820` | Panels, status bar |
| accent | `#14DDE6` | Primary actions, active tabs |
| success | `#4ADE80` | Positive states |
| warning | `#FBBF24` | Alerts |
| critical | `#EF4444` | Urgent findings |

## Status Bar

Doctor mode (default): Patient · Lead · Speed · Gain · Zoom · Quality  
Developer mode (DR/DEV toggle): + FPS · CPU · GPU · Mem · Canvas · XY · Frame · Render · API
