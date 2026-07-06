# Responsive Report — Sprint 30

## Viewports Verified

| Resolution | Layout Behavior |
|------------|-----------------|
| 1366×768 | Ribbon horizontal scroll; panels collapsible |
| 1600×900 | Full ribbon + side panels visible |
| 1920×1080 | Optimal workstation layout |
| 2K / 4K | Scales via existing resizable workspace |
| UltraWide | Left/right rails resizable |

## Responsive Patterns

- **Workflow ribbon**: horizontal ScrollView prevents step clipping
- **Clinical alerts**: horizontal scroll chips
- **Right panel tabs**: flex wrap tab bar (existing Sprint 26)
- **Report preview**: flex layout with min-height 520px
- **Measurement studio**: 2-column metric grid with flexWrap

## Collapse / Pin

- Left nav: collapsible via existing `EcgWorkstationLeftNav`
- Right panel: collapsible via toolbar toggle
- Diagnostic mode (F11): fullscreen ECG hero

## No Regressions

- Zero overlap on chrome row (ribbon → alerts → view switcher stacked)
- Toolbar remains below workflow chrome
- Status bar fixed at bottom of center column

## E2E Screenshot

`test-results/screenshots/sprint30-clinical-workflow.png` — captured at 1920×1080 chromium-desktop profile.
