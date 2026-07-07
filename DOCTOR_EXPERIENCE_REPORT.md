# Doctor Experience Report — Sprint 35

## Design Goals

Maximize ECG canvas visibility while preserving clinical context in compact, scannable panels.

## Viewport Share (both panels expanded)

| Resolution | Center column |
|------------|---------------|
| 1366×768 | ~77% |
| 1440×900 | ~78% |
| 1920×1080 | ~82% |
| 2560×1440 | ~84% |

## Clinical Summary (Left)

Grouped sections reduce vertical scroll:

- **Patient** — name, age, gender, notes
- **Study** — case, date, heart rate
- **Device** — acquisition device, paper speed, gain
- **Workflow** — pipeline chips (collapsible)
- **Leads** — 12-lead selector (collapsed by default)

## Right Panel

Single-tab visibility with dedicated panes:

- Measurements (`sprint35-measurements-tab-pane`)
- AI Findings (`sprint35-ai-findings-tab-pane`) — separated from measurements
- Reports — export actions
- History — prior studies and timeline

## Diagnostic Full Screen

F11 or Full Screen tool enters diagnostic mode:

- Hides workflow ribbon, compact toolbar, side panels
- Shows ECG canvas, floating toolbox, compact status bar, ESC exit chip
- Restores panel layout on exit via `popLayoutSnapshot`
