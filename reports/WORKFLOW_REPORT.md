# Workflow Report — Sprint 30

## 16-Stage Physician Workflow

| # | Stage | Completion Criteria | Navigation Target |
|---|-------|---------------------|-------------------|
| 1 | Patient | Patient linked | Patient panel |
| 2 | ECG Upload | Image/PDF present | Image view |
| 3 | Image Quality Check | Quality score or calibration | Image view |
| 4 | Image Processing | Preprocessing applied | Processed view |
| 5 | Grid Detection | Grid detected | Processed view |
| 6 | Lead Detection | Leads identified | Waveform view |
| 7 | Digitization | Digital ECG available | Waveform view |
| 8 | Signal Reconstruction | Sample data present | Waveform view |
| 9 | Measurements | Engine or manual measurements | Measurement mode |
| 10 | AI Review | AI diagnosis present | AI review mode |
| 11 | Clinical Review | Physician reviewed | AI review + review route |
| 12 | Comparison | Compare study selected | Compare mode |
| 13 | Doctor Notes | Clinical notes entered | Notes panel |
| 14 | Final Report | Report generated | Report preview |
| 15 | Digital Signature | Report signed | Report preview |
| 16 | Export | PDF/export completed | Report preview |

## Navigation Rules

- **Completed steps**: green, clickable (backward navigation)
- **Current step**: blue highlight
- **Future steps**: disabled until prior stage complete
- **Backward jumps**: always allowed for completed stages

## Smart Tool Groups

Toolbar groups adapt by view mode via `smartToolGroupForViewMode()` — Original, Digitized, Monitor, Measurement, AI, Compare, Report contexts.

## Case Timeline

Parallel audit trail: Upload → Quality → Digitization → Signal → Measurements → AI → Clinical Review → Notes → Report → Signature → Export.

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Ctrl+S | Save workspace |
| Ctrl+P / Ctrl+E | Export PDF |
| Ctrl+M | Live monitor |
| Ctrl+R | Report preview |
| Ctrl+A | AI review |
| F11 | Diagnostic mode |
| Space | Toggle pan |
| Escape | Exit fullscreen |

## Auto-Save

1.2s debounced persistence via `useEcgViewerPersistence` with unsaved indicator on workflow ribbon.
