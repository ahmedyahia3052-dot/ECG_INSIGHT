# Responsive Report — Sprint 35

## Target Resolutions Verified

| Resolution | Status |
|------------|--------|
| 1366×768 | ✅ No clipping; workflow ribbon scrolls |
| 1440×900 | ✅ Panels + canvas balanced |
| 1600×900 | ✅ Center column ≥77% |
| 1920×1080 | ✅ Primary clinical target |
| 2560×1440 | ✅ Extra space to canvas |

## Responsive Behaviors

- Workflow ribbon: horizontal scroll + `scrollIntoView` on active step
- Status bar: horizontal scroll for chips on narrow widths
- Right panel tabs: flex-grow with `numberOfLines={1}` — no overlap
- Grid layout: `minmax(0, 1fr)` center column prevents overflow

## Layout Persistence

Panel widths stored under `ecg-insight:ecg-monitor-panel-layout-v9` with migration from v8.
