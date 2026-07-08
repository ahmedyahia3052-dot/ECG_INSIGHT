# Sprint 21 — Enterprise ECG Workstation UX Revolution

**Protocol:** Master Enterprise Development Protocol v1.0  
**Date:** 2026-07-06  
**Status:** APPROVED — implementation in progress  
**Route:** `/ecg-workspace`

---

## Objective

Transform `/ecg-workspace` into a hospital-grade clinical workstation with enterprise layout, redesigned toolbar (FILE/VIEW/ECG/MEASURE/AI/EXPORT), viewer 4.0 polish, canvas monitor with glow + beat markers, redesigned clinical sidebar, and professional status bar with runtime metrics.

---

## Architecture

| Phase | Deliverable |
|-------|-------------|
| 1 | `EcgViewerResizableWorkspace` — 88% viewer, fixed sidebar widths, single scroll policy |
| 2 | `EcgWorkstationToolbar` — 6 professional groups, wrap-safe layout |
| 3 | Viewer 4.0 — existing `EcgProViewerEngine` + canvas layers preserved |
| 4 | `ecgMonitorCanvas` + `ecgMonitorBeatMarkers` — glow, R-peak markers |
| 5 | `EcgClinicalRightPanel` — patient card, warnings, notes, digitization score |
| 6 | `EcgEnterpriseStatusBar` + `useEnterpriseStatusMetrics` — FPS, memory, GPU, backend |
| 7 | Performance — RAF metrics, no nested scrollbars |

---

## Files

**Create:** `useEnterpriseStatusMetrics.ts`, `ecgMonitorBeatMarkers.ts`, `EcgEnterpriseStatusBar.tsx`, `sprint21-*.integration.ts`, `sprint21-*.spec.ts`

**Modify:** `EcgWorkstationToolbar.tsx`, `EcgClinicalRightPanel.tsx`, `EcgMonitorViewerFoundation.tsx`, `EcgViewerResizableWorkspace.tsx`, `EcgViewModeSwitcher.tsx`, `types.ts`, `ecgMonitorCanvas.ts`, `EcgLiveMonitorView.tsx`

---

## Dependencies

Sprint 18–19 workstation, digitization API, AI explainability — all complete.

---

## Risks

Toolbar overflow at 1366px — mitigated with horizontal scroll + compact buttons. Status metrics unavailable in Safari — show N/A.

---

## Rollback

Revert commit; tag `Sprint19-EnterpriseHardening` remains fallback.

---

## Testing Plan

lint, typecheck, build, sprint21 integration, Playwright sprint18+19+21, screenshots per mode.

---

## Expected UI

Enterprise header, 6-group toolbar, 88% viewer, clinical sidebar with patient/warnings, status bar with memory/FPS/GPU/backend.

---

## Expected Runtime

API :3002, Frontend :8081, browser at `/ecg-workspace` with sample ECG.

---

## Expected Screenshots

Image, Processed, Waveform, Monitor, Compare, Overlay, AI Review, Fullscreen — stored in `test-results/screenshots/sprint21-*`

---

## Acceptance Criteria

All permanent protocol gates + zero regression on Sprint 18–19 features.
