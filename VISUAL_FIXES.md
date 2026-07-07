# VISUAL_FIXES.md — Sprint 31

## Fixed UI Problems

| # | Issue | Fix |
|---|-------|-----|
| 1 | Pipeline chips clipped | Ribbon + left panel chips use `flexWrap: "wrap"`; no horizontal scroll |
| 2 | Duplicated navigation | Removed WORKSTATION left nav; enterprise sidebar hidden on workspace |
| 3 | Crowded left sidebar | Unified `EcgUnifiedClinicalLeftPanel` with single border, 8px sections |
| 4 | Compressed right panel | Width 300px default; card metrics; 11–13px typography |
| 5 | Empty placeholder under ECG | Removed fixed-height waveform box; mini nav floats only when image loaded |
| 6 | Status bar flicker | 500ms throttle on CPU/GPU/FPS/memory updates |
| 7 | Missing tooltips | `EcgWorkstationTooltip` on every toolbar icon (200ms delay) |

## Fullscreen Diagnostic Mode
- Hides: toolbar, left panel, right panel, status bar, bottom timeline
- Dark `#000000` background, viewer 100% viewport
- ESC restores layout; zoom/lead/playback state preserved in React state

## Toolbar
- Height: 36px | Buttons: 32px | Groups: FILE VIEW MEASURE AI REPORT EXPORT

## Viewer Canvas
- Border radius removed from canvas for edge-to-edge display
- Workspace padding/gap set to 0
